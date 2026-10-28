from pathlib import Path
import cv2
from ultralytics import YOLO

ROOT = Path.home() / "TrafficAI"
VIDEO = ROOT / "data/videos/validation/video3.mp4"
WEIGHTS = ROOT / "models/experimental/head_detection/11n-head.pt"
OUT = ROOT / "storage/evidence/head_detection_audit"

OUT.mkdir(parents=True, exist_ok=True)
model = YOLO(str(WEIGHTS))
cap = cv2.VideoCapture(str(VIDEO))

if not cap.isOpened():
    raise SystemExit(f"Cannot open video: {VIDEO}")

for frame_no in (125, 150, 200):
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ok, frame = cap.read()
    if not ok:
        print(f"Could not read frame {frame_no}")
        continue

    result = model.predict(
        frame, imgsz=1280, conf=0.20, device=0, verbose=False
    )[0]

    count = 0 if result.boxes is None else len(result.boxes)
    print(f"Frame {frame_no}: {count} head candidates")

    annotated = result.plot()
    path = OUT / f"head_frame_{frame_no}.jpg"
    cv2.imwrite(str(path), annotated)
    print(path)

cap.release()
print("Head detection audit complete.")
