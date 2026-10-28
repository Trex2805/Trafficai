from pathlib import Path
import csv
import cv2
from ultralytics import YOLO

ROOT = Path.home() / "TrafficAI"
CROP_DIR = ROOT / "storage/evidence/helmet_crop_audit_v2"
CHECKPOINT = (
    ROOT / "runs/detect/runs/helmet/"
    "helmet_v6_binary_yolo11n/weights/best.pt"
)
OUT = ROOT / "storage/evidence/helmet_crop_audit_v2"
OUT.mkdir(parents=True, exist_ok=True)

model = YOLO(str(CHECKPOINT))
rows = []

for path in sorted(CROP_DIR.glob("*.jpg")):
    if not path.name.endswith(("_full.jpg", "_upper40.jpg")):
        continue

    image = cv2.imread(str(path))
    if image is None:
        continue

    h, w = image.shape[:2]
    result = model.predict(
        image, imgsz=640, conf=0.01, device=0, verbose=False
    )[0]

    boxes = result.boxes
    if boxes is None or len(boxes) == 0:
        rows.append({
            "image": path.name,
            "crop_type": "upper40" if "_upper40" in path.name else "full",
            "width": w,
            "height": h,
            "prediction": "no_detection",
            "confidence": "",
        })
        continue

    # Record the highest-confidence prediction for this crop.
    scores = boxes.conf.cpu().tolist()
    best = max(range(len(scores)), key=lambda i: scores[i])
    class_id = int(boxes.cls[best].item())

    rows.append({
        "image": path.name,
        "crop_type": "upper40" if "_upper40" in path.name else "full",
        "width": w,
        "height": h,
        "prediction": model.names[class_id],
        "confidence": round(float(scores[best]), 4),
    })

csv_path = OUT / "crop_strategy_comparison.csv"
with csv_path.open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "image", "crop_type", "width", "height",
        "prediction", "confidence"
    ])
    writer.writeheader()
    writer.writerows(rows)

for row in rows:
    print(row)

print(f"\nComparison saved to: {csv_path}")
print("Note: predictions are experimental, not verified labels.")
