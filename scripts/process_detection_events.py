import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.services.event_processing import save_processed_events


def main():
    parser = argparse.ArgumentParser(
        description="Summarize tracked objects and create review candidates."
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    source = Path(args.input).resolve()
    if not source.is_file():
        raise SystemExit(f"Detection log not found: {source}")

    output = Path(args.output) if args.output else (
        source.parent / "event_processing"
    )

    result = save_processed_events(source, output)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
