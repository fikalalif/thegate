"""Standalone Entrypoint for TheGate Ingress Gateway."""

import argparse
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_root = Path(__file__).parent.resolve()
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import uvicorn
from app.main import app


def main() -> None:
    parser = argparse.ArgumentParser(description="TheGate Standalone Ingress Gateway")
    parser.add_argument("--host", default="0.0.0.0", help="Binding host")
    parser.add_argument("--port", type=int, default=8001, help="Binding port")
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
