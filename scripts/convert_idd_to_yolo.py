from pathlib import Path
import xml.etree.ElementTree as ET
import shutil

ROOT = Path("data/raw/IDD")
OUT = Path("data/processed/IDD_YOLO")

classes = [
    "animal",
    "autorickshaw",
    "bicycle",
    "bus",
    "car",
    "caravan",
    "motorcycle",
    "person",
    "rider",
    "traffic light",
    "traffic sign",
    "trailer",
    "truck",
    "vehicle fallback",
]

class_to_id = {name: i for i, name in enumerate(classes)}

def convert_split(split):
    split_file = ROOT / f"{split}.txt"
    image_out = OUT / "images" / split
    label_out = OUT / "labels" / split

    image_out.mkdir(parents=True, exist_ok=True)
    label_out.mkdir(parents=True, exist_ok=True)

    total = 0
    converted = 0
    skipped = 0
    objects = 0

    for line in split_file.read_text().splitlines():
        rel = line.strip()
        if not rel:
            continue

        total += 1

        img = ROOT / "JPEGImages" / f"{rel}.jpg"
        xml = ROOT / "Annotations" / f"{rel}.xml"

        if not img.exists() or not xml.exists():
            skipped += 1
            continue

        try:
            tree = ET.parse(xml)
            root = tree.getroot()

            size = root.find("size")
            width = float(size.find("width").text)
            height = float(size.find("height").text)

            labels = []

            for obj in root.findall("object"):
                name = obj.find("name").text.strip()

                if name not in class_to_id:
                    continue

                box = obj.find("bndbox")

                xmin = float(box.find("xmin").text)
                ymin = float(box.find("ymin").text)
                xmax = float(box.find("xmax").text)
                ymax = float(box.find("ymax").text)

                # Clamp boxes to image boundaries
                xmin = max(0, min(xmin, width))
                xmax = max(0, min(xmax, width))
                ymin = max(0, min(ymin, height))
                ymax = max(0, min(ymax, height))

                if xmax <= xmin or ymax <= ymin:
                    continue

                # Pascal VOC -> YOLO
                xc = ((xmin + xmax) / 2) / width
                yc = ((ymin + ymax) / 2) / height
                w = (xmax - xmin) / width
                h = (ymax - ymin) / height

                labels.append(
                    f"{class_to_id[name]} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}"
                )

            # Preserve relative folder structure in filename
            # using "__" to avoid collisions
            safe_name = rel.replace("/", "__")

            shutil.copy2(
                img,
                image_out / f"{safe_name}.jpg"
            )

            (label_out / f"{safe_name}.txt").write_text(
                "\n".join(labels) + ("\n" if labels else "")
            )

            objects += len(labels)
            converted += 1

        except Exception as e:
            skipped += 1
            print(f"ERROR: {rel} -> {e}")

    print(f"\n{split.upper()}")
    print(f"Split entries : {total}")
    print(f"Converted     : {converted}")
    print(f"Skipped       : {skipped}")
    print(f"Objects       : {objects}")

convert_split("train")
convert_split("val")

print("\nYOLO conversion complete.")
