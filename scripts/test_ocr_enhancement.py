from pathlib import Path
import cv2
import easyocr

source = Path("storage/evidence/plate_tests/crops")
output = Path("storage/evidence/plate_tests/enhanced")
output.mkdir(parents=True, exist_ok=True)

reader = easyocr.Reader(["en"], gpu=True)

files = sorted(source.glob("*.jpg"))[:6]

for path in files:
    image = cv2.imread(str(path))
    if image is None:
        continue

    # Preserve aspect ratio while enlarging the crop.
    enlarged = cv2.resize(
        image, None, fx=4, fy=4,
        interpolation=cv2.INTER_CUBIC
    )

    gray = cv2.cvtColor(enlarged, cv2.COLOR_BGR2GRAY)
    enhanced = cv2.createCLAHE(
        clipLimit=2.0, tileGridSize=(4, 4)
    ).apply(gray)

    variants = {
        "color": enlarged,
        "contrast": cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR),
    }

    for name, variant in variants.items():
        result = reader.readtext(
            variant,
            detail=1,
            paragraph=False,
            allowlist="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        )
        text = " ".join(item[1] for item in result).strip()
        confidence = (
            sum(float(item[2]) for item in result) / len(result)
            if result else 0.0
        )
        print(f"{path.name} | {name} | {text or 'NO TEXT'} | {confidence:.3f}")
        cv2.imwrite(
            str(output / f"{path.stem}_{name}.jpg"), variant
        )

print(f"\nEnhanced crops saved to: {output.resolve()}")
