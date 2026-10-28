# TrafficAI Model 3: Helmet Detection

## Model
- Architecture: YOLO11n
- Classes: with_helmet, without_helmet
- Training: 25 epochs
- Dataset: helmet_detection_v6_binary
- Dataset license reported by source: CC BY 4.0

## Checkpoint
runs/detect/runs/helmet/helmet_v6_binary_yolo11n/weights/best.pt

## Dataset configuration
data/processed/helmet_detection_v6_binary/data.yaml

## Held-out test metrics
- Precision: 0.759
- Recall: 0.727
- mAP@50: 0.773
- mAP@50:95: 0.413
- With-helmet recall: 0.772
- Without-helmet recall: 0.682

## Known limitation
The model produced zero detections at confidence 0.25 on the tested
IDD validation video. Higher input resolution produced only a few
very-low-confidence detections. Domain adaptation and further
real-road validation are required before production use.

## Integration
Input: image or video frame.
Output: bounding boxes, class IDs, confidence scores.
Classes: 0=with_helmet, 1=without_helmet.

Helmet predictions must be associated with tracked riders. Low-confidence
or ambiguous results must not be treated as confirmed violations.
