"""Video inference and multi-object tracking for TrafficAI."""

import argparse
import json
from pathlib import Path

import cv2
from ultralytics import YOLO


def process_video(
    source: str,
    weights: str,
    output_dir: str,
    confidence: float = 0.25,
    tracker: str = "bytetrack.yaml",
) -> None:
    source_path = Path(source).expanduser().resolve()
    weights_path = Path(weights).expanduser().resolve()
    out_dir = Path(output_dir).expanduser().resolve()

    if not source_path.is_file():
        raise FileNotFoundError(f"Input video not found: {source_path}")
    if not weights_path.is_file():
        raise FileNotFoundError(f"Model checkpoint not found: {weights_path}")

    out_dir.mkdir(parents=True, exist_ok=True)
    video_out = out_dir / f"{source_path.stem}_annotated.mp4"
    records_out = out_dir / f"{source_path.stem}_detections.jsonl"

    model = YOLO(str(weights_path))
    cap = cv2.VideoCapture(str(source_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {source_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    fps = fps if fps and fps > 0 else 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if width <= 0 or height <= 0:
        cap.release()
        raise RuntimeError("Video reports invalid frame dimensions.")

    writer = cv2.VideoWriter(
        str(video_out),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )
    if not writer.isOpened():
        cap.release()
        raise RuntimeError(f"Could not create output video: {video_out}")

    frame_index = 0
    detection_count = 0

    try:
        with records_out.open("w", encoding="utf-8") as records:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                result = model.track(
                    source=frame,
                    persist=True,
                    tracker=tracker,
                    conf=confidence,
                    device=0,
                    verbose=False,
                )[0]

                writer.write(result.plot())
                boxes = result.boxes

                if boxes is not None:
                    xyxy = boxes.xyxy.cpu().tolist()
                    classes = boxes.cls.int().cpu().tolist()
                    scores = boxes.conf.cpu().tolist()
                    ids = (
                        boxes.id.int().cpu().tolist()
                        if boxes.id is not None
                        else [None] * len(classes)
                    )

                    for bbox, class_id, score, track_id in zip(
                        xyxy, classes, scores, ids
                    ):
                        record = {
                            "frame_index": frame_index,
                            "timestamp_seconds": round(frame_index / fps, 3),
                            "class_id": class_id,
                            "class_name": model.names[class_id],
                            "confidence": round(float(score), 5),
                            "track_id": track_id,
                            "bbox_xyxy": [round(float(v), 2) for v in bbox],
                        }
                        records.write(json.dumps(record) + "\n")
                        detection_count += 1

                frame_index += 1
                if frame_index % 100 == 0:
                    print(
                        f"Processed {frame_index} frames; "
                        f"{detection_count} detections"
                    )
    finally:
        cap.release()
        writer.release()

    print(f"Frames processed: {frame_index}")
    print(f"Detections recorded: {detection_count}")
    print(f"Annotated video: {video_out}")
    print(f"Detection records: {records_out}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="Input video path")
    parser.add_argument(
        "--weights",
        default="runs/production/idd_yolo11n_img800_ft15/weights/best.pt",
    )
    parser.add_argument("--output-dir", default="runs/inference")
    parser.add_argument("--confidence", type=float, default=0.25)
    parser.add_argument("--tracker", default="bytetrack.yaml")
    args = parser.parse_args()

    if not 0.0 < args.confidence < 1.0:
        parser.error("--confidence must be between 0 and 1")

    process_video(
        args.source,
        args.weights,
        args.output_dir,
        args.confidence,
        args.tracker,
    )


if __name__ == "__main__":
    main()
