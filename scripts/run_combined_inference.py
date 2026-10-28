from pathlib import Path
import json
import time

import cv2
from ultralytics import YOLO

ROOT = Path.home() / "TrafficAI"
VIDEO = ROOT / "data/videos/validation/video3.mp4"

VEHICLE_CHECKPOINT = (
    ROOT / "runs/detect/runs/production/"
    "idd_speed_benchmark_batch24/weights/best.pt"
)
HELMET_CHECKPOINT = (
    ROOT / "runs/detect/runs/helmet/"
    "helmet_v6_binary_yolo11n/weights/best.pt"
)

OUTPUT_DIR = ROOT / "storage/evidence/combined_validation_v2"
OUTPUT_VIDEO = OUTPUT_DIR / "video3_combined.mp4"
OUTPUT_JSONL = OUTPUT_DIR / "video3_combined.jsonl"

VEHICLE_CONF = 0.25
HELMET_CONF = 0.25
HELMET_IMGSZ = 640
HELMET_CROP_PADDING = 0.35

def main():
    for path in (VIDEO, VEHICLE_CHECKPOINT, HELMET_CHECKPOINT):
        if not path.is_file():
            raise SystemExit(f"Required file not found: {path}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    vehicle_model = YOLO(str(VEHICLE_CHECKPOINT))
    helmet_model = YOLO(str(HELMET_CHECKPOINT))

    cap = cv2.VideoCapture(str(VIDEO))
    if not cap.isOpened():
        raise SystemExit(f"Could not open video: {VIDEO}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    expected_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    writer = cv2.VideoWriter(
        str(OUTPUT_VIDEO),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        cap.release()
        raise SystemExit(f"Could not create output video: {OUTPUT_VIDEO}")

    names = vehicle_model.names
    rider_classes = {
        class_id
        for class_id, name in names.items()
        if str(name).strip().lower() in {"rider", "person"}
    }

    frame_index = 0
    vehicle_detections = 0
    helmet_detections = 0
    rider_crops_tested = 0
    start = time.time()

    try:
        with OUTPUT_JSONL.open("w", encoding="utf-8") as log:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                result = vehicle_model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    imgsz=800,
                    conf=VEHICLE_CONF,
                    device=0,
                    verbose=False,
                )[0]

                annotated = frame.copy()
                boxes = result.boxes
                helmet_events = []

                if boxes is not None and len(boxes):
                    coordinates = boxes.xyxy.cpu().tolist()
                    class_ids = boxes.cls.int().cpu().tolist()
                    scores = boxes.conf.cpu().tolist()
                    track_ids = (
                        boxes.id.int().cpu().tolist()
                        if boxes.id is not None
                        else [None] * len(class_ids)
                    )

                    vehicle_detections += len(class_ids)

                    for bbox, class_id, score, track_id in zip(
                        coordinates, class_ids, scores, track_ids
                    ):
                        x1, y1, x2, y2 = map(int, bbox)
                        class_name = str(names.get(class_id, class_id))

                        cv2.rectangle(
                            annotated, (x1, y1), (x2, y2),
                            (40, 200, 40), 2
                        )
                        cv2.putText(
                            annotated,
                            f"{class_name} {score:.2f}"
                            + (f" ID:{track_id}" if track_id is not None else ""),
                            (x1, max(20, y1 - 7)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.48, (40, 200, 40), 1,
                            cv2.LINE_AA,
                        )

                        if class_id not in rider_classes:
                            continue

                        # Test helmet detection within the rider region.
                        pad_x = int((x2 - x1) * HELMET_CROP_PADDING)
                        pad_y = int((y2 - y1) * HELMET_CROP_PADDING)
                        cx1 = max(0, x1 - pad_x)
                        cy1 = max(0, y1 - pad_y)
                        cx2 = min(width, x2 + pad_x)
                        cy2 = min(height, y2 + pad_y)

                        crop = frame[cy1:cy2, cx1:cx2]
                        if crop.size == 0:
                            continue

                        rider_crops_tested += 1
                        helmet_result = helmet_model.predict(
                            crop,
                            imgsz=HELMET_IMGSZ,
                            conf=HELMET_CONF,
                            device=0,
                            verbose=False,
                        )[0]

                        crop_boxes = helmet_result.boxes
                        if crop_boxes is None or len(crop_boxes) == 0:
                            helmet_events.append({
                                "track_id": track_id,
                                "status": "no_helmet_detection",
                                "rider_bbox_xyxy": bbox,
                            })
                            continue

                        # Keep only the highest-confidence prediction
                        # for this rider crop in this frame.
                        crop_xyxy = crop_boxes.xyxy.cpu().tolist()
                        crop_classes = crop_boxes.cls.int().cpu().tolist()
                        crop_scores = crop_boxes.conf.cpu().tolist()

                        best_idx = max(
                            range(len(crop_scores)),
                            key=lambda i: crop_scores[i],
                        )
                        hb = crop_xyxy[best_idx]
                        hc = crop_classes[best_idx]
                        hs = crop_scores[best_idx]

                        hx1, hy1, hx2, hy2 = map(int, hb)
                        hx1 += cx1
                        hx2 += cx1
                        hy1 += cy1
                        hy2 += cy1

                        helmet_name = str(helmet_model.names.get(hc, hc))
                        helmet_detections += 1

                        cv2.rectangle(
                            annotated, (hx1, hy1), (hx2, hy2),
                            (255, 100, 20), 2
                        )
                        cv2.putText(
                            annotated,
                            f"{helmet_name} {hs:.2f}",
                            (hx1, max(18, hy1 - 5)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.45, (255, 100, 20), 1,
                            cv2.LINE_AA,
                        )

                        helmet_events.append({
                            "track_id": track_id,
                            "status": helmet_name,
                            "confidence": round(float(hs), 5),
                            "helmet_bbox_xyxy": [
                                round(v, 2) for v in
                                [hx1, hy1, hx2, hy2]
                            ],
                            "rider_bbox_xyxy": bbox,
                        })

                writer.write(annotated)
                log.write(json.dumps({
                    "frame_index": frame_index,
                    "timestamp_seconds": round(frame_index / fps, 3),
                    "vehicle_detections": (
                        len(boxes) if boxes is not None else 0
                    ),
                    "helmet_crops_tested": sum(
                        1 for e in helmet_events
                    ),
                    "helmet_events": helmet_events,
                }) + "\n")

                frame_index += 1
                if frame_index % 50 == 0:
                    print(
                        f"Frames: {frame_index}/{expected_frames} | "
                        f"rider crops: {rider_crops_tested} | "
                        f"helmet detections: {helmet_detections}"
                    )
    finally:
        cap.release()
        writer.release()

    print("\n===== COMBINED INFERENCE COMPLETE =====")
    print(f"Frames processed: {frame_index}")
    print(f"Vehicle detections: {vehicle_detections}")
    print(f"Rider crops tested: {rider_crops_tested}")
    print(f"Helmet detections: {helmet_detections}")
    print(f"Elapsed seconds: {time.time() - start:.2f}")
    print(f"Annotated video: {OUTPUT_VIDEO}")
    print(f"JSONL events: {OUTPUT_JSONL}")
    print("Note: predictions are experimental, not verified violations.")

if __name__ == "__main__":
    main()
