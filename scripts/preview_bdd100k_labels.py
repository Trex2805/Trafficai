from pathlib import Path
import random
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("data/processed/BDD100K_YOLO")
OUT = Path("runs/validation/bdd100k_pilot_contact_sheet.jpg")
CLASSES = [
    "pedestrian", "rider", "car", "truck", "bus",
    "train", "motorcycle", "bicycle", "traffic light", "traffic sign",
]

random.seed(42)
files = list((ROOT / "images/train").glob("*.jpg"))
random.shuffle(files)
files = files[:12]

OUT.parent.mkdir(parents=True, exist_ok=True)
font = ImageFont.load_default()
thumb_w, thumb_h = 480, 290
cols, rows = 3, 4
sheet = Image.new("RGB", (cols * thumb_w, rows * thumb_h), "white")
draw_sheet = ImageDraw.Draw(sheet)

for i, path in enumerate(files):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    label_file = ROOT / "labels/train" / f"{path.stem}.txt"

    if label_file.exists():
        for line in label_file.read_text().splitlines():
            parts = line.split()
            if len(parts) != 5:
                continue
            cls = int(parts[0])
            xc, yc, bw, bh = map(float, parts[1:])
            x1 = (xc - bw / 2) * w
            y1 = (yc - bh / 2) * h
            x2 = (xc + bw / 2) * w
            y2 = (yc + bh / 2) * h
            name = CLASSES[cls]
            draw.rectangle((x1, y1, x2, y2), outline="lime", width=2)
            draw.text((x1, max(0, y1 - 12)), name, fill="yellow", font=font)

    img.thumbnail((thumb_w, thumb_h - 25))
    x = (i % cols) * thumb_w
    y = (i // cols) * thumb_h
    sheet.paste(img, (x, y + 22))
    draw_sheet.text((x + 5, y + 4), path.name, fill="black", font=font)

sheet.save(OUT, quality=92)
print("Saved:", OUT.resolve())
