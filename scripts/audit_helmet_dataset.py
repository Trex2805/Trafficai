from pathlib import Path
import random
import cv2

ROOT = Path.cwd()
DATA = ROOT / "data/processed/helmet_detection_v1"
OUT = ROOT / "docs/datasets"
OUT.mkdir(parents=True, exist_ok=True)

random.seed(42)

def read_labels(path):
    result = []
    if not path.exists():
        return result
    for line in path.read_text().splitlines():
        parts = line.split()
        if len(parts) != 5:
            continue
        cls, x, y, w, h = parts
        result.append((int(cls), float(x), float(y), float(w), float(h)))
    return result

def make_sheet(candidates, output_name, title, limit=12):
    candidates = list(candidates)
    random.shuffle(candidates)
    candidates = candidates[:limit]
    tiles = []

    for image_path, label_path in candidates:
        image = cv2.imread(str(image_path))
        if image is None:
            print("WARNING: cannot read", image_path)
            continue

        height, width = image.shape[:2]
        labels = read_labels(label_path)

        for cls, xc, yc, bw, bh in labels:
            x1 = int((xc - bw / 2) * width)
            y1 = int((yc - bh / 2) * height)
            x2 = int((xc + bw / 2) * width)
            y2 = int((yc + bh / 2) * height)

            # Green = helmet, red = no helmet
            color = (0, 200, 0) if cls == 0 else (0, 0, 255)
            name = "helmet" if cls == 0 else "no_helmet"
            cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                image, name, (max(0, x1), max(18, y1 - 5)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2
            )

        tile = cv2.resize(image, (400, 300))
        caption = f"{image_path.name[:45]} | boxes={len(labels)}"
        cv2.putText(
            tile, caption, (5, 290), cv2.FONT_HERSHEY_SIMPLEX,
            0.38, (255, 255, 255), 1
        )
        tiles.append(tile)

    if not tiles:
        print("No images for:", title)
        return

    columns = 3
    rows = (len(tiles) + columns - 1) // columns
    sheet = cv2.copyMakeBorder(
        cv2.vconcat([
            cv2.hconcat(
                tiles[r * columns:(r + 1) * columns]
                + [tiles[0]] * (columns - len(tiles[r * columns:(r + 1) * columns]))
            )
            for r in range(rows)
        ]),
        45, 0, 0, 0, cv2.BORDER_CONSTANT, value=(35, 35, 35)
    )
    cv2.putText(
        sheet, title, (12, 30), cv2.FONT_HERSHEY_SIMPLEX,
        0.8, (255, 255, 255), 2
    )

    output = OUT / output_name
    if cv2.imwrite(str(output), sheet):
        print("Saved:", output)
    else:
        print("ERROR saving:", output)

for split in ("train", "valid", "test"):
    label_dir = DATA / "labels" / split
    image_dir = DATA / "images" / split

    class0, class1, empty = [], [], []
    bad = []
    counts = {0: 0, 1: 0}

    for label_path in sorted(label_dir.glob("*.txt")):
        image_path = image_dir / (label_path.stem + ".jpg")
        if not image_path.exists():
            alternatives = [
                image_dir / (label_path.stem + ext)
                for ext in (".jpeg", ".png", ".JPG", ".JPEG", ".PNG")
            ]
            image_path = next((p for p in alternatives if p.exists()), image_path)

        labels = read_labels(label_path)
        if not image_path.exists():
            bad.append(f"Missing image for {label_path.name}")
            continue

        if not labels:
            empty.append((image_path, label_path))

        for cls, x, y, w, h in labels:
            counts[cls] = counts.get(cls, 0) + 1
            if cls not in (0, 1) or not (
                0 <= x <= 1 and 0 <= y <= 1
                and 0 < w <= 1 and 0 < h <= 1
                and x - w / 2 >= -0.001 and y - h / 2 >= -0.001
                and x + w / 2 <= 1.001 and y + h / 2 <= 1.001
            ):
                bad.append(f"Invalid box in {label_path.name}: {x,y,w,h}")

        pair = (image_path, label_path)
        if any(row[0] == 1 for row in labels):
            class1.append(pair)
        if any(row[0] == 0 for row in labels):
            class0.append(pair)

    print(f"\n=== {split.upper()} ===")
    print("Images with helmet boxes:", len(class0))
    print("Images with no_helmet boxes:", len(class1))
    print("Empty label files:", len(empty))
    print("Boxes:", counts)
    print("Invalid labels / missing images:", len(bad))
    for issue in bad[:5]:
        print("  ", issue)

    if split == "train":
        make_sheet(
            class1, "helmet_audit_no_helmet.jpg",
            "Training examples: NO HELMET (red boxes)"
        )
        make_sheet(
            class0, "helmet_audit_helmet.jpg",
            "Training examples: HELMET (green boxes)"
        )
        make_sheet(
            empty, "helmet_audit_empty_labels.jpg",
            "Training images with empty labels"
        )

print("\nAudit images are in docs/datasets/.")
