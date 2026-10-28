import argparse
import json
import random
import zipfile
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / "data/raw/BDD100K/downloads"
IMAGE_ZIP = DOWNLOADS / "bdd100k_images_100k.zip"
LABEL_ZIP = DOWNLOADS / "bdd100k_labels_candidate.zip"
OUT = ROOT / "data/processed/BDD100K_YOLO"

# Fixed class order for this BDD dataset only.
CLASSES = [
    "pedestrian", "rider", "car", "truck", "bus",
    "train", "motorcycle", "bicycle", "traffic light", "traffic sign",
]
CLASS_TO_ID = {name: i for i, name in enumerate(CLASSES)}

# Legacy BDD annotation names -> selected YOLO classes.
CATEGORY_MAP = {
    "person": "pedestrian",
    "rider": "rider",
    "car": "car",
    "truck": "truck",
    "bus": "bus",
    "train": "train",
    "motor": "motorcycle",
    "bike": "bicycle",
    "traffic light": "traffic light",
    "traffic sign": "traffic sign",
}


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--splits", nargs="+", default=["train", "val"],
                   choices=["train", "val", "test"])
    p.add_argument("--limit", type=int, default=100,
                   help="Maximum images per split; use 0 for all")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--overwrite", action="store_true")
    return p.parse_args()


def main():
    args = parse_args()

    if not IMAGE_ZIP.is_file() or not LABEL_ZIP.is_file():
        raise FileNotFoundError("Required BDD100K ZIP archive is missing.")

    if OUT.exists() and any(OUT.iterdir()) and not args.overwrite:
        raise FileExistsError(
            f"{OUT} already contains files. Use a new output directory "
            "or pass --overwrite after reviewing its contents."
        )

    random.seed(args.seed)
    stats = Counter()

    with zipfile.ZipFile(IMAGE_ZIP) as iz, zipfile.ZipFile(LABEL_ZIP) as lz:
        image_names = set(iz.namelist())
        label_names = set(lz.namelist())

        for split in args.splits:
            image_prefix = f"100k/{split}/"
            label_prefix = f"100k/{split}/"

            available = sorted(
                n for n in image_names
                if n.startswith(image_prefix) and n.lower().endswith(".jpg")
            )
            random.shuffle(available)
            if args.limit > 0:
                available = available[:args.limit]

            img_out = OUT / "images" / split
            lbl_out = OUT / "labels" / split
            img_out.mkdir(parents=True, exist_ok=True)
            lbl_out.mkdir(parents=True, exist_ok=True)

            for image_member in available:
                stem = Path(image_member).stem
                label_member = label_prefix + stem + ".json"
                if label_member not in label_names:
                    stats[f"{split}:missing_json"] += 1
                    continue

                try:
                    annotation = json.loads(lz.read(label_member))
                    frames = annotation.get("frames", [])
                    if not frames:
                        stats[f"{split}:empty_frames"] += 1
                        continue

                    # These legacy labels normally have one frame per image.
                    objects = frames[0].get("objects", [])

                    # Read dimensions directly from the image in the archive.
                    with iz.open(image_member) as raw:
                        with Image.open(raw) as image:
                            width, height = image.size
                            image.load()
                            image.save(img_out / f"{stem}.jpg", format="JPEG",
                                       quality=95)

                    yolo_lines = []
                    for obj in objects:
                        category = obj.get("category")
                        mapped = CATEGORY_MAP.get(category)
                        if mapped is None:
                            stats[f"ignored:{category}"] += 1
                            continue

                        box = obj.get("box2d")
                        if not box:
                            stats["missing_box"] += 1
                            continue

                        try:
                            x1 = float(box["x1"])
                            y1 = float(box["y1"])
                            x2 = float(box["x2"])
                            y2 = float(box["y2"])
                        except (KeyError, TypeError, ValueError):
                            stats["malformed_box"] += 1
                            continue

                        # Clip to image bounds and reject zero/negative boxes.
                        x1 = max(0.0, min(x1, float(width)))
                        x2 = max(0.0, min(x2, float(width)))
                        y1 = max(0.0, min(y1, float(height)))
                        y2 = max(0.0, min(y2, float(height)))
                        if x2 <= x1 or y2 <= y1:
                            stats["invalid_box"] += 1
                            continue

                        xc = ((x1 + x2) / 2.0) / width
                        yc = ((y1 + y2) / 2.0) / height
                        bw = (x2 - x1) / width
                        bh = (y2 - y1) / height
                        class_id = CLASS_TO_ID[mapped]
                        yolo_lines.append(
                            f"{class_id} {xc:.6f} {yc:.6f} "
                            f"{bw:.6f} {bh:.6f}"
                        )
                        stats[f"class:{mapped}"] += 1

                    (lbl_out / f"{stem}.txt").write_text(
                        "\n".join(yolo_lines) + ("\n" if yolo_lines else "")
                    )
                    stats[f"{split}:images_converted"] += 1
                    stats[f"{split}:objects_written"] += len(yolo_lines)

                except Exception as exc:
                    stats[f"{split}:errors"] += 1
                    print(f"WARNING: {image_member}: {exc}")

            print(f"{split}: processed {stats[f'{split}:images_converted']} "
                  f"images")

    names = "\n".join(f"  {i}: {name}" for i, name in enumerate(CLASSES))
    yaml_text = (
        f"path: {OUT.resolve()}\n"
        "train: images/train\n"
        "val: images/val\n"
        "names:\n"
        + "\n".join(f"  {i}: {name}" for i, name in enumerate(CLASSES))
        + "\n"
    )
    (OUT / "data.yaml").write_text(yaml_text)

    print("\n=== Conversion report ===")
    for key, value in sorted(stats.items()):
        print(f"{key}: {value}")
    print(f"\nDataset YAML: {OUT / 'data.yaml'}")
    print(f"Classes:\n{names}")
    print("\nPilot conversion finished. Review labels before full conversion.")


if __name__ == "__main__":
    main()
