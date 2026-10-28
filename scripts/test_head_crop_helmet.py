from pathlib import Path
import json
import time

import cv2
from ultralytics import YOLO

ROOT = Path.home() / "TrafficAI"
VIDEO = ROOT / "data/videos/validation/video3.mp4"
HEAD_WEIGHTS = ROOT / "models/experimental/head_detection/11n-head.pt"
HELMET_WEIGHTS = (
    ROOT / "runs/detect/runs/helmet/"
    "helmet_v6_binary_yolo11n/weights/best.pt"
)

OUT = ROOT / "storage/evidence/head_crop_helmet_audit"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "crops").mkdir(exist_ok=True)

HEAD_CONF = 0.10
HELMET_CONF = 0.05
HEAD_IMGSZ = 1280
HELMET_IMGSZ = 640
CROP_SCALE = 2.5
MAX_SAVED_CROPS = 40


def main():
    for path in (VIDEO, HEAD_WEIGHTS, HELMET_WEIGHTS):
        if not path.is_file():
            raise SystemExit(f"Missing required file: {path}")

    head_model = YOLO(str(HEAD_WEIGHTS))
    helmet_model = YOLO(str(HELMET_WEIGHTS))

    print("Head model classes:", head_model.names)
    print("Helmet model classes:", helmet_model.names)
    print("Starting experimental head-crop evaluation...")

    cap = cv2.VideoCapture(str(VIDEO))
    if not cap.isOpened():
        raise SystemExit(f"Cannot open video: {VIDEO}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    video_out = OUT / "head_crop_helmet_annotated.mp4"
    jsonl_out = OUT / "head_crop_helmet_events.jsonl"

    writer = cv2.VideoWriter(
        str(video_out),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        cap.release()
        raise SystemExit(f"Cannot create output video: {video_out}")

    frames = 0
    heads = 0
    helmet_predictions = 0
    saved_crops = 0
    counts = {"with_helmet": 0, "without_helmet": 0, "no_detection": 0}
    started = time.time()

    try:
        with jsonl_out.open("w", encoding="utf-8") as log:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                annotated = frame.copy()
                head_result = head_model.predict(
                    frame,
                    imgsz=HEAD_IMGSZ,
                    conf=HEAD_CONF,
                    device=0,
                    verbose=False,
                )[0]

                events = []
                boxes = head_result.boxes

                if boxes is not None:
                    for index, box in enumerate(boxes):
                        x1, y1, x2, y2 = map(
                            int, box.xyxy[0].cpu().tolist()
                        )
                        head_score = float(box.conf[0].cpu())

                        bw = max(1, x2 - x1)
                        bh = max(1, y2 - y1)
                        cx = (x1 + x2) / 2
                        cy = (y1 + y2) / 2

                        # Expand the candidate head box to include the helmet
                        # and enough surrounding pixels for the second model.
                        crop_w = bw * CROP_SCALE
                        crop_h = bh * CROP_SCALE
                        cx1 = max(0, int(cx - crop_w / 2))
                        cy1 = max(0, int(cy - crop_h / 2))
                        cx2 = min(width, int(cx + crop_w / 2))
                        cy2 = min(height, int(cy + crop_h / 2))

                        crop = frame[cy1:cy2, cx1:cx2]
                        if crop.size == 0:
                            continue

                        heads += 1
                        helmet_result = helmet_model.predict(
                            crop,
                            imgsz=HELMET_IMGSZ,
                            conf=HELMET_CONF,
                            device=0,
                            verbose=False,
                        )[0]

                        event = {
                            "head_candidate_index": index,
                            "head_confidence": round(head_score, 5),
                            "head_bbox_xyxy": [x1, y1, x2, y2],
                            "crop_bbox_xyxy": [cx1, cy1, cx2, cy2],
                            "helmet_predictions": [],
                        }

                        cv2.rectangle(
                            annotated, (cx1, cy1), (cx2, cy2),
                            (255, 180, 0), 1
                        )
                        cv2.rectangle(
                            annotated, (x1, y1), (x2, y2),
                            (255, 0, 0), 2
                        )

                        crop_boxes = helmet_result.boxes
                        if crop_boxes is None or len(crop_boxes) == 0:
                            counts["no_detection"] += 1
                            event["status"] = "no_detection"
                            cv2.putText(
                                annotated, "head: no helmet prediction",
                                (x1, max(18, y1 - 5)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.4,
                                (0, 165, 255), 1, cv2.LINE_AA,
                            )
                        else:
                            event["status"] = "predictions"
                            for hb, hc, hs in zip(
                                crop_boxes.xyxy.cpu().tolist(),
                                crop_boxes.cls.int().cpu().tolist(),
                                crop_boxes.conf.cpu().tolist(),
                            ):
                                hx1, hy1, hx2, hy2 = map(int, hb)
                                hx1 += cx1
                                hx2 += cx1
                                hy1 += cy1
                                hy2 += cy1

                                label = str(helmet_model.names.get(hc, hc))
                                score = float(hs)
                                helmet_predictions += 1
                                counts[label] = counts.get(label, 0) + 1

                                event["helmet_predictions"].append({
                                    "label": label,
                                    "confidence": round(score, 5),
                                    "bbox_xyxy": [hx1, hy1, hx2, hy2],
                                })

                                cv2.rectangle(
                                    annotated, (hx1, hy1), (hx2, hy2),
                                    (0, 165, 255), 2
                                )
                                cv2.putText(
                                    annotated, f"{label} {score:.2f}",
                                    (hx1, max(18, hy1 - 5)),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.4,
                                    (0, 165, 255), 1, cv2.LINE_AA,
                                )

                        # Save a limited number of crops for visual auditing.
                        if saved_crops < MAX_SAVED_CROPS:
                            crop_path = OUT / "crops" / (
                                f"frame_{frames:04d}_head_{index:02d}.jpg"
                            )
                            cv2.imwrite(str(crop_path), crop)
                            event["saved_crop"] = str(crop_path)
                            saved_crops += 1

                        events.append(event)

                log.write(json.dumps({
                    "frame_index": frames,
                    "timestamp_seconds": round(frames / fps, 3),
                    "head_candidates": len(events),
                    "events": events,
                }) + "\n")

                writer.write(annotated)
                frames += 1

                if frames % 50 == 0:
                    print(
                        f"Frames: {frames}/{total} | "
                        f"head candidates: {heads} | "
                        f"helmet predictions: {helmet_predictions}"
                    )
    finally:
        cap.release()
        writer.release()

    print("\n===== HEAD-CROP AUDIT COMPLETE =====")
    print("Frames processed:", frames)
    print("Head candidates:", heads)
    print("Helmet predictions:", helmet_predictions)
    print("Saved crop samples:", saved_crops)
    print("Prediction counts:", counts)
    print(f"Elapsed seconds: {time.time() - started:.2f}")
    print("Annotated video:", video_out)
    print("JSONL events:", jsonl_out)
    print("Sample crops:", OUT / "crops")
    print("Predictions are experimental, not verified violations.")


if __name__ == "__main__":
    main()
