import argparse
import json
import time
from pathlib import Path

import cv2
from ultralytics import YOLO


def main():
    parser = argparse.ArgumentParser(
        description="TrafficAI YOLO + ByteTrack video pipeline"
    )
    parser.add_argument("--source", required=True,
                        help="Video file, webcam index, or RTSP URL")
    parser.add_argument("--weights", default=(
        "runs/detect/runs/production/"
        "idd_yolo11n_img800_ft15/weights/best.pt"
    ))
    parser.add_argument("--output-dir", default="runs/tracking")
    parser.add_argument("--imgsz", type=int, default=800)
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--device", default="0")
    args = parser.parse_args()

    weights = Path(args.weights)
    if not weights.is_file():
        raise FileNotFoundError(f"Model checkpoint not found: {weights}")

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    source = int(args.source) if args.source.isdigit() else args.source
    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        raise RuntimeError(
            f"Could not open source: {args.source}. "
            "Check the video path, camera connection, or RTSP URL."
        )

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or fps > 240:
        fps = 25.0

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if width <= 0 or height <= 0:
        cap.release()
        raise RuntimeError("Could not determine input video dimensions.")

    stem = Path(str(args.source).split("?")[0]).stem
    if not stem or stem.isdigit():
        stem = "camera"

    video_path = out_dir / f"{stem}_tracked.mp4"
    events_path = out_dir / f"{stem}_events.jsonl"

    writer = cv2.VideoWriter(
        str(video_path),
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (width, height),
    )

    if not writer.isOpened():
        cap.release()
        raise RuntimeError(f"Could not create output video: {video_path}")

    model = YOLO(str(weights))
    frame_index = 0
    total_detections = 0
    start = time.time()

    print(f"Model: {weights}")
    print(f"Source: {args.source}")
    print(f"Frame size: {width}x{height} | FPS: {fps:.2f}")
    print(f"Video output: {video_path}")
    print(f"Events output: {events_path}")

    try:
        with events_path.open("w", encoding="utf-8") as log:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                result = model.track(
                    frame,
                    persist=True,
                    tracker="bytetrack.yaml",
                    imgsz=args.imgsz,
                    conf=args.conf,
                    device=args.device,
                    verbose=False,
                )[0]

                timestamp = frame_index / fps
                boxes = result.boxes

                if boxes is not None and len(boxes) > 0:
                    xyxy = boxes.xyxy.cpu().tolist()
                    classes = boxes.cls.int().cpu().tolist()
                    confidences = boxes.conf.cpu().tolist()

                    track_ids = (
                        boxes.id.int().cpu().tolist()
                        if boxes.id is not None
                        else [None] * len(classes)
                    )

                    for bbox, cls_id, conf, track_id in zip(
                        xyxy, classes, confidences, track_ids
                    ):
                        event = {
                            "frame_index": frame_index,
                            "timestamp_seconds": round(timestamp, 3),
                            "class_id": cls_id,
                            "class_name": model.names[cls_id],
                            "confidence": round(float(conf), 5),
                            "track_id": track_id,
                            "bbox_xyxy": [round(float(v), 2) for v in bbox],
                        }
                        log.write(json.dumps(event) + "\n")
                        total_detections += 1

                writer.write(result.plot())

                frame_index += 1
                if frame_index % 100 == 0:
                    elapsed = time.time() - start
                    print(
                        f"Frames: {frame_index} | "
                        f"Detection records: {total_detections} | "
                        f"Average FPS: {frame_index / max(elapsed, 1e-6):.2f}"
                    )

    finally:
        cap.release()
        writer.release()

    print("\nTRACKING RUN FINISHED")
    print(f"Frames processed: {frame_index}")
    print(f"Detection records: {total_detections}")
    print(f"Elapsed seconds: {time.time() - start:.2f}")
    print(f"Annotated video: {video_path}")
    print(f"Detection log: {events_path}")


if __name__ == "__main__":
    main()
