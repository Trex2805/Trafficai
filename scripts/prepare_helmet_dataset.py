from pathlib import Path
from collections import Counter
import json
import zipfile
import yaml

ROOT = Path.cwd()
ZIP_PATH = (
    ROOT / "data/external/helmet_candidate/"
    "helmet detection dataset.v10i.coco (3).zip"
)
OUT = ROOT / "data/processed/helmet_detection_v1"

SPLITS = ("train", "valid", "test")
CATEGORY_MAP = {
    1: 0,  # Helmet -> YOLO class 0
    2: 1,  # NOHelmet -> YOLO class 1
}

if not ZIP_PATH.is_file():
    raise FileNotFoundError(f"Dataset ZIP not found: {ZIP_PATH}")

# Never overwrite a previous processed dataset.
if OUT.exists() and any(OUT.iterdir()):
    raise FileExistsError(
        f"{OUT} already contains files. Nothing overwritten. "
        "Inspect it or choose a new output directory."
    )

OUT.mkdir(parents=True, exist_ok=True)
summary = {}

with zipfile.ZipFile(ZIP_PATH) as archive:
    members = set(archive.namelist())

    for split in SPLITS:
        annotation_name = f"{split}/_annotations.coco.json"
        if annotation_name not in members:
            raise FileNotFoundError(
                f"Missing annotation file: {annotation_name}"
            )

        data = json.loads(archive.read(annotation_name))
        image_by_id = {img["id"]: img for img in data["images"]}
        annotations_by_image = {}
        for ann in data["annotations"]:
            annotations_by_image.setdefault(ann["image_id"], []).append(ann)

        image_dir = OUT / "images" / split
        label_dir = OUT / "labels" / split
        image_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)

        class_counts = Counter()
        converted_boxes = 0
        empty_labels = 0

        for image_id, img in image_by_id.items():
            filename = Path(img["file_name"]).name
            archive_image = f"{split}/{filename}"

            if archive_image not in members:
                raise FileNotFoundError(
                    f"Image listed in COCO JSON but missing: {archive_image}"
                )

            width, height = float(img["width"]), float(img["height"])
            if width <= 0 or height <= 0:
                raise ValueError(f"Invalid image dimensions: {archive_image}")

            # Keep the image's original filename.
            image_out = image_dir / filename
            if image_out.exists():
                raise FileExistsError(f"Refusing to overwrite {image_out}")
            image_out.write_bytes(archive.read(archive_image))

            lines = []
            for ann in annotations_by_image.get(image_id, []):
                category_id = ann.get("category_id")
                if category_id not in CATEGORY_MAP:
                    continue

                x, y, w, h = map(float, ann["bbox"])
                if w <= 0 or h <= 0:
                    continue

                # COCO [x_min, y_min, width, height]
                # -> YOLO [x_center, y_center, width, height]
                x1 = max(0.0, min(x, width))
                y1 = max(0.0, min(y, height))
                x2 = max(0.0, min(x + w, width))
                y2 = max(0.0, min(y + h, height))
                if x2 <= x1 or y2 <= y1:
                    continue

                xc = ((x1 + x2) / 2) / width
                yc = ((y1 + y2) / 2) / height
                nw = (x2 - x1) / width
                nh = (y2 - y1) / height
                cls = CATEGORY_MAP[category_id]

                lines.append(
                    f"{cls} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f}"
                )
                class_counts[cls] += 1
                converted_boxes += 1

            label_out = label_dir / f"{Path(filename).stem}.txt"
            label_out.write_text(
                "\n".join(lines) + ("\n" if lines else ""),
                encoding="utf-8",
            )
            if not lines:
                empty_labels += 1

        summary[split] = {
            "images": len(image_by_id),
            "converted_boxes": converted_boxes,
            "helmet_boxes": class_counts[0],
            "nohelmet_boxes": class_counts[1],
            "images_without_retained_boxes": empty_labels,
        }

yaml_data = {
    "path": str(OUT.resolve()),
    "train": "images/train",
    "val": "images/valid",
    "test": "images/test",
    "names": {0: "helmet", 1: "no_helmet"},
    "nc": 2,
}
(OUT / "data.yaml").write_text(
    yaml.safe_dump(yaml_data, sort_keys=False),
    encoding="utf-8",
)

report = {
    "source_archive": str(ZIP_PATH),
    "source_dataset": "Helmet Detection Dataset v10",
    "source_url": (
        "https://universe.roboflow.com/the-intruder/"
        "helmet-detection-dataset-3blvo"
    ),
    "license_as_stated_in_archive": "CC BY 4.0",
    "annotation_conversion": "COCO bounding boxes to YOLO normalized boxes",
    "class_mapping": {"0": "helmet", "1": "no_helmet"},
    "splits": summary,
}
(OUT / "preparation_report.json").write_text(
    json.dumps(report, indent=2), encoding="utf-8"
)

(OUT / "DATASET_NOTES.md").write_text(
    "# Helmet Detection Dataset\n\n"
    "Source: Helmet Detection Dataset v10, provided by a Roboflow user.\n\n"
    "Source URL: https://universe.roboflow.com/the-intruder/"
    "helmet-detection-dataset-3blvo\n\n"
    "The source archive states the licence is CC BY 4.0. "
    "Retain attribution and verify the original terms before public "
    "redistribution or deployment.\n\n"
    "YOLO classes: `0 = helmet`, `1 = no_helmet`.\n\n"
    "Review `preparation_report.json` and visually inspect labels "
    "before training. Dataset conversion does not validate annotation quality.\n",
    encoding="utf-8",
)

print("\nConversion completed.")
print("Output:", OUT)
print(json.dumps(summary, indent=2))
print("YAML:", OUT / "data.yaml")
print("Report:", OUT / "preparation_report.json")
