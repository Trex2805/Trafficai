"""Start the TrafficAI backend and frontend together."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import time
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"


def _npm_command() -> str:
    """Return the platform-specific npm executable."""
    return "npm.cmd" if os.name == "nt" else "npm"


def _check_prerequisites() -> None:
    """Fail early with an actionable message when a required command is absent."""
    uvicorn_check = subprocess.run(
        [sys.executable, "-c", "import uvicorn"],
        capture_output=True,
        check=False,
    )
    if uvicorn_check.returncode != 0:
        raise RuntimeError(
            "uvicorn nahi mila. Pehle project environment activate karke "
            "`python -m pip install -r requirements.txt` chalao."
        )

    npm = _npm_command()
    if shutil.which(npm) is None:
        raise RuntimeError(
            "npm nahi mila. Node.js LTS install karke terminal dobara kholo."
        )

    if not (FRONTEND_DIR / "package.json").is_file():
        raise RuntimeError(f"Frontend folder ya package.json nahi mila: {FRONTEND_DIR}")


def _stop_process(process: subprocess.Popen[bytes]) -> None:
    """Stop one child process and wait briefly for it to exit."""
    if process.poll() is not None:
        return

    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def main() -> int:
    try:
        _check_prerequisites()
    except RuntimeError as error:
        print(f"[TrafficAI] Startup error: {error}", file=sys.stderr)
        return 1

    backend = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "backend.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
        cwd=ROOT_DIR,
    )

    frontend = None
    try:
        frontend = subprocess.Popen(
            [_npm_command(), "run", "dev"],
            cwd=FRONTEND_DIR,
        )
        print(f"[TrafficAI] Backend:  {BACKEND_URL}")
        print(f"[TrafficAI] Frontend: {FRONTEND_URL}")
        print("[TrafficAI] Dono services chal rahi hain. Band karne ke liye Ctrl+C dabao.")

        while True:
            backend_exit_code = backend.poll()
            frontend_exit_code = frontend.poll()
            if backend_exit_code is not None:
                print(
                    f"[TrafficAI] Backend band ho gaya (exit code {backend_exit_code}).",
                    file=sys.stderr,
                )
                return backend_exit_code or 1
            if frontend_exit_code is not None:
                print(
                    f"[TrafficAI] Frontend band ho gaya (exit code {frontend_exit_code}).",
                    file=sys.stderr,
                )
                return frontend_exit_code or 1
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n[TrafficAI] All Services Off TrafficAI has been stoped ")
        return 0
    finally:
        if frontend is not None:
            _stop_process(frontend)
        _stop_process(backend)


if __name__ == "__main__":
    raise SystemExit(main())