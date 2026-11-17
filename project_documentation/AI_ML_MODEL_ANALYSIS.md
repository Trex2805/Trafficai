# AI/ML model analysis

## Active FastAPI inference models

| Model | Path | Input/use | Verified behavior |
|---|---|---|---|
| Vehicle YOLO checkpoint | `runs/detect/runs/production/idd_speed_benchmark_batch24/weights/best.pt` by default | Full video frames, `imgsz=800`, `conf=0.25`, `device=0` | Ultralytics `track(..., persist=True, tracker="bytetrack.yaml")`; class names come from checkpoint |
| Helmet YOLO checkpoint | `runs/detect/runs/helmet/helmet_v6_binary_yolo11n/weights/best.pt` | Crops around classes named `rider` or `person`, `imgsz=640`, `conf=0.25`, padding 0.35 | One best detection is classified as `with_helmet`/`without_helmet` by model class name; absence is `no_helmet_detection` |
| Plate YOLO checkpoint | `models/plate_recognition/license_plate_v1n.pt` | Every fifth frame by default, full frame, `imgsz=1280`, `conf=0.25` | Plate boxes are cropped and persisted as OCR candidates |
| EasyOCR | Runtime package/model | Enhanced grayscale/upscaled/CLAHE plate crop, English allowlist | Highest OCR confidence text is retained; no legal identity confirmation |

The repository also contains standalone `src/inference/video_detector.py` and multiple scripts for alternate/experimental inference. They are not imported by the FastAPI job path.

## Output

Vehicle JSONL records contain frame index, timestamp, class ID/name, confidence, ByteTrack ID, and `bbox_xyxy`. Helmet records contain rider and helmet boxes, status, confidence, track ID, and `review_required`. Plate records contain deterministic record ID, boxes, OCR text/confidence, crop path, and association state.

## Limitations

- The active service forces `device=0` for vehicle and helmet inference; CPU fallback is only explicit in the plate pass.
- No configured frame skip exists for the main vehicle/helmet pass.
- Model checkpoints are ignored by Git and may not exist on another machine.
- No active traffic-light, seatbelt, triple-riding, speed, or red-light rule evaluator is verified.
- Track IDs are tracker output, not permanent vehicle identities.
- Plate association is geometric and deliberately named `geometry_candidate`.
