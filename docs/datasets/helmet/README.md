---
license: cc-by-4.0
task_categories:
  - object-detection
language:
  - en
tags:
  - traffic
  - helmet-detection
  - yolo
  - indian-roads
  - two-wheeler
  - traffic-safety
size_categories:
  - 10K<n<100K
---

# Indian Traffic Helmet Violation Detection (Deduplicated & Rebalanced)

Part of the **Edge-AI Traffic & Vehicle Analytics System** repository by `thundarstrom`.

## Dataset Summary
A unified, audited, and strictly deduplicated dataset of **42,559 images** and **~126,000 bounding boxes** for two-wheeler helmet compliance monitoring on Indian roads.

### Key Features
* **Zero Train/Test Leakage**: Fully verified perceptual hash partition (0 matching image hashes across splits).
* **Balanced Evaluation Split**: 80/10/10 split ensuring representative test benchmarking.
* **Classes**:
  - `0: helmet` (Full-face, open-face, construction/half helmets)
  - `1: no_helmet` (Bare heads, turbans, caps, scarves without safety helmets)

### Splits
* **Train**: 34,047 images (80%)
* **Validation**: 4,255 images (10%)
* **Test**: 4,257 images (10%)

---

## How to Access and Download

### Using Automated Project Downloader (Extracts automatically)
```bash
# Clone / pull and auto-extract dataset
python scripts/download_hf_datasets.py --dataset helmet --org thundarstrom
```

### Using `huggingface_hub` Python SDK
```python
from huggingface_hub import snapshot_download

# Download into local dataset directory
local_path = snapshot_download(
    repo_id="thundarstrom/traffic-helmet-violation",
    repo_type="dataset",
    local_dir="data/datasets/helmet_combined"
)
print(f"Dataset downloaded to: {local_path}")
```

---

## Recommended Training / Evaluation Recipe

```bash
python scripts/train_models.py --task helmet --model yolov8s.pt --epochs 120 --imgsz 640 --batch 32 --fl_gamma 1.5
```

---

## Citation & Maintainer
* **Maintained by**: `thundarstrom`
* **Project**: Edge-AI Real-Time Traffic Violation Detection & ANPR
* **License**: CC-BY-4.0
