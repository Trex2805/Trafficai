from pathlib import Path
from collections import Counter
import yaml

src = Path("data/processed/helmet_detection_v6").resolve()
dst = Path("data/processed/helmet_detection_v6_binary").resolve()
splits = ("train", "valid", "test")

if dst.exists() and any(dst.iterdir()):
    raise SystemExit(f"STOP: {dst} already contains files. Nothing changed.")

# Confirm the expected source structure and class order.
config = yaml.safe_load((src / "data.yaml").read_text())
names = config.get("names", {})
if isinstance(names, list):
    names = dict(enumerate(names))

print("Source class mapping:", names)
if len(names) != 3 or str(names.get(0, names.get("0", ""))).lower() != "with helmet":
    raise SystemExit("STOP: unexpected class mapping. Do not train yet.")
if str(names.get(1, names.get("1", ""))).lower() != "without helmet":
    raise SystemExit("STOP: unexpected class mapping. Do not train yet.")

for split in splits:
    images = src / split / "images"
    labels = src / split / "labels"
    if not images.is_dir() or not labels.is_dir():
        raise SystemExit(f"STOP: missing images/labels for {split}: {images}, {labels}")

dst.mkdir(parents=True)

for split in splits:
    src_images = src / split / "images"
    src_labels = src / split / "labels"
    out_images = dst / split / "images"
    out_labels = dst / split / "labels"
    out_images.mkdir(parents=True)
    out_labels.mkdir(parents=True)

    image_files = [
        p for p in src_images.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    ]
    counts = Counter()
    removed_license = 0
    missing_label = 0

    for image in image_files:
        (out_images / image.name).symlink_to(image)

        label = src_labels / f"{image.stem}.txt"
        out_label = out_labels / f"{image.stem}.txt"

        if not label.exists():
            missing_label += 1
            out_label.write_text("")
            continue

        kept = []
        for line in label.read_text().splitlines():
            parts = line.split()
            if not parts:
                continue
            cls = int(parts[0])
            if cls in (0, 1):
                kept.append(line)
                counts[cls] += 1
            elif cls == 2:
                removed_license += 1
            else:
                raise SystemExit(f"Unexpected class {cls} in {label}")

        out_label.write_text("\n".join(kept) + ("\n" if kept else ""))

    print(
        f"{split}: {len(image_files)} images, "
        f"helmet boxes={counts[0]}, no-helmet boxes={counts[1]}, "
        f"license boxes removed={removed_license}, missing labels={missing_label}"
    )

yaml_text = {
    "path": str(dst),
    "train": "train/images",
    "val": "valid/images",
    "test": "test/images",
    "nc": 2,
    "names": {0: "with_helmet", 1: "without_helmet"},
}
(dst / "data.yaml").write_text(yaml.safe_dump(yaml_text, sort_keys=False))
print("\nCreated:", dst)
print((dst / "data.yaml").read_text())
