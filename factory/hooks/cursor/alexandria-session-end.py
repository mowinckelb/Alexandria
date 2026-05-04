#!/usr/bin/env python3
"""Cursor hook: append a resilient session-end log record."""

from __future__ import annotations

import json
import os
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path


def _emit(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def _parse_payload(raw: str) -> dict:
    try:
        return json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        return {}


def _append_jsonl(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def _run() -> None:
    payload = _parse_payload(sys.stdin.read())

    log_path = Path.home() / ".alexandria" / "logs" / "cursor-session-end.jsonl"

    row = {
        **payload,
        "ts": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "hook": "sessionEnd",
        "cursor_project_dir": os.environ.get("CURSOR_PROJECT_DIR"),
        "alexandria_session_id": os.environ.get("ALEXANDRIA_SESSION_ID"),
    }
    try:
        _append_jsonl(log_path, row)
    except OSError:
        # Logging should never block session cleanup.
        pass

    _emit({})


def main() -> None:
    try:
        _run()
    except Exception:
        traceback.print_exc(file=sys.stderr)
        _emit({})


if __name__ == "__main__":
    main()
