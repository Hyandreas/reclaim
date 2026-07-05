"""Tiny .env loader for the Reclaim backend.

Parses KEY=VALUE lines from vultr-project-a/.env (one directory above backend/).
os.environ always wins over file values. Values are never printed or logged.
"""
from __future__ import annotations

import os
from pathlib import Path

_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
_file_values: dict[str, str] = {}
_loaded = False


def _load() -> None:
    global _loaded
    if _loaded:
        return
    _loaded = True
    try:
        text = _ENV_PATH.read_text(encoding="utf-8")
    except OSError:
        return
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if key:
            _file_values[key] = value.strip().strip('"').strip("'")


def get(name: str, default: str | None = None) -> str | None:
    """Return the value for ``name`` (os.environ first, then .env, then default)."""
    if name in os.environ:
        return os.environ[name]
    _load()
    return _file_values.get(name, default)
