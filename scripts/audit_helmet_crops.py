from pathlib import Path
import cv2
from ultralytics import YOLO

ROOT = Path.home() / "TrafficAI"
VIDEO = ROOT / "data/videos/validation/video3.mp4"
CHECKPOINT = (
    ROOT / "runs/detect/runs/production/"
    "idd_speed_benchmark_batch24/weights/best.pt"
)
OUT = ROOT / "storage/evidence/helmet_crop_audit_v2"

OUT.mkdir(parents=True, exist_ok=True)

model = YOLO(str(CHECKPOINT))
names = model.names
candidate_ids = {
    i for i, name in names.items()
    if str(name).strip().lower() in {"rider", "person"}
}

cap = cv2.VideoCapture(str(VIDEO))
if not cap.isOpened():
    raise SystemExit(f"Cannot open video: {VIDEO}")

# These frames contain the motorcycle visible in your screenshots.
target_frames = {125, 150, 200}
frame_index = 0
saved = 0

while True:
    ok, frame = cap.read()
    if not ok:
        break

    if frame_index in target_frames:
        result = model.predict(
            frame, imgsz=800, conf=0.25, device=0, verbose=False
        )[0]

        if result.boxes is not None:
            for idx, (box, cls, score) in enumerate(zip(
                result.boxes.xyxy.cpu().tolist(),
                result.boxes.cls.int().cpu().tolist(),
                result.boxes.conf.cpu().tolist(),
            )):
                if cls not in candidate_ids:
                    continue

                x1, y1, x2, y2 = map(int, box)
                x1, y1 = max(0, x1), max(0, y1)
                x2 = min(frame.shape[1], x2)
                y2 = min(frame.shape[0], y2)

                crop = frame[y1:y2, x1:x2]
                if crop.size == 0:
                    continue

                stem = f"frame_{frame_index}_box_{idx}"
                cv2.imwrite(str(OUT / f"{stem}_full.jpg"), crop)

                # Experimental upper-region crop, not a confirmed head box.
                upper = crop[:max(1, int(crop.shape[0] * 0.40)), :]
                cv2.imwrite(str(OUT / f"{stem}_upper40.jpg"), upper)

                saved += 1

    frame_index += 1

cap.release()
print(f"Candidate crops saved: {saved}")
print(f"Review folder: {OUT}")
