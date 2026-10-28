from pathlib import Path
import random
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

ANN = Path("data/raw/IDD/Annotations")
IMG = Path("data/raw/IDD/JPEGImages")
OUT = Path("docs/datasets/idd_rider_audit.jpg")

rng = random.Random(42)
candidates = []

for xml_path in ANN.rglob("*.xml"):
    try:
        tree = ET.parse(xml_path)
    except ET.ParseError:
        continue

    objects = []
    for obj in tree.findall(".//object"):
        name = (obj.findtext("name") or "").strip().lower()
        if name not in {"rider", "motorcycle"}:
            continue

        box = obj.find("bndbox")
        if box is None:
            continue

        try:
            coords = [
                int(float(box.findtext(k)))
                for k in ("xmin", "ymin", "xmax", "ymax")
            ]
        except (TypeError, ValueError):
            continue

        objects.append((name, coords))

    if any(name == "rider" for name, _ in objects):
        rel = xml_path.relative_to(ANN)
        image_path = IMG / rel.with_suffix(".jpg")
        if image_path.exists():
            candidates.append((xml_path, image_path, objects))

rng.shuffle(candidates)
selected = candidates[:12]

if not selected:
    raise SystemExit("No matching annotated rider images found.")

cell_w, cell_h = 480, 300
sheet = Image.new("RGB", (cell_w * 3, cell_h * 4), "white")
draw = ImageDraw.Draw(sheet)

for i, (xml_path, image_path, objects) in enumerate(selected):
    with Image.open(image_path) as im:
        im = im.convert("RGB")
        im.thumbnail((cell_w, cell_h - 28))

    x = (i % 3) * cell_w
    y = (i // 3) * cell_h
    sheet.paste(im, (x, y + 28))

    sx = im.width / Image.open(image_path).width
    sy = im.height / Image.open(image_path).height

    for name, (x1, y1, x2, y2) in objects:
        color = "lime" if name == "rider" else "cyan"
        box = (
            x + x1 * sx, y + 28 + y1 * sy,
            x + x2 * sx, y + 28 + y2 * sy,
        )
        draw.rectangle(box, outline=color, width=2)

    draw.text(
        (x + 5, y + 5),
        f"{i+1}. {image_path.parent.name}/{image_path.name}",
        fill="black",
    )

sheet.save(OUT, quality=90)
print(f"Saved: {OUT}")
print(f"Images shown: {len(selected)}")
print("Green = rider, cyan = motorcycle")
