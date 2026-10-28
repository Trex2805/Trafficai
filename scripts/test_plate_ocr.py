import csv
from pathlib import Path

import cv2
import torch
import easyocr
from ultralytics import YOLO

VIDEO = Path("storage/evidence/combined_validation_v2/video3_combined.mp4")
PLATE_MODEL = Path("models/plate_recognition/license_plate_v1n.pt")
OUT = Path("storage/evidence/plate_tests")
CROPS = OUT / "crops"
CSV_PATH = OUT / "ocr_results.csv"

OUT.mkdir(parents=True, exist_ok=True)
CROPS.mkdir(parents=True, exist_ok=True)

if not VIDEO.is_file():
    raise FileNotFoundError(f"Video not found: {VIDEO}")
if not PLATE_MODEL.is_file():
    raise FileNotFoundError(f"Plate model not found: {PLATE_MODEL}")

print("Loading plate detector...")
detector = YOLO(str(PLATE_MODEL))

print("Loading EasyOCR...")
reader = easyocr.Reader(["en"], gpu=torch.cuda.is_available())

cap = cv2.VideoCapture(str(VIDEO))
if not cap.isOpened():
    raise RuntimeError(f"Cannot open video: {VIDEO}")

rows = []
frame_no = 0
saved_crops = 0

try:
    while frame_no < 120:
        ok, frame = cap.read()
        if not ok:
            break

        # Sample one frame every 5 frames.
        if frame_no % 5 != 0:
            frame_no += 1
            continue

        result = detector.predict(
            frame, imgsz=640, conf=0.25,
            device=0 if torch.cuda.is_available() else "cpu",
            verbose=False
        )[0]

        h, w = frame.shape[:2]

        for box_no, box in enumerate(result.boxes):
            x1, y1, x2, y2 = map(
                int, box.xyxy[0].detach().cpu().tolist()
            )
            det_conf = float(box.conf[0].detach().cpu())

            # Clamp coordinates to image boundaries.
            x1, x2 = max(0, x1), min(w, x2)
            y1, y2 = max(0, y1), min(h, y2)
            crop = frame[y1:y2, x1:x2]

            if crop.size == 0:
                continue

            crop_name = f"frame_{frame_no:05d}_plate_{box_no}.jpg"
            crop_path = CROPS / crop_name
            cv2.imwrite(str(crop_path), crop)
            saved_crops += 1

            # Enlarge small plate crops for OCR.
            enlarged = cv2.resize(
                crop, None, fx=3, fy=3,
                interpolation=cv2.INTER_CUBIC
            )

            ocr_results = reader.readtext(
                enlarged,
                detail=1,
                paragraph=False,
                allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            )

            text = " ".join(item[1] for item in ocr_results).strip()
            ocr_conf = (
                round(sum(float(item[2]) for item in ocr_results)
                      / len(ocr_results), 4)
                if ocr_results else 0.0
            )

            rows.append({
                "frame": frame_no,
                "plate_box": box_no,
                "detector_confidence": round(det_conf, 4),
                "plate_text_raw": text,
                "ocr_confidence": ocr_conf,
                "crop_path": str(crop_path),
            })

            print(
                f"Frame {frame_no} | detector={det_conf:.2f} | "
                f"OCR='{text or 'NO TEXT'}' | OCR confidence={ocr_conf:.2f}"
            )

        frame_no += 1
finally:
    cap.release()

with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "frame", "plate_box", "detector_confidence",
            "plate_text_raw", "ocr_confidence", "crop_path"
        ]
    )
    writer.writeheader()
    writer.writerows(rows)

print("\n===== TEST SUMMARY =====")
print(f"Plate crops saved: {saved_crops}")
print(f"OCR records: {len(rows)}")
print(f"CSV results: {CSV_PATH.resolve()}")
print(f"Crops folder: {CROPS.resolve()}")
