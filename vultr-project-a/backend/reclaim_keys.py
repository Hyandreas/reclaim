"""Credential readiness helpers for optional live provider integrations."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV_PATH = PROJECT_ROOT / ".env"
_LOADED_ENV_FILES: set[Path] = set()

INTEGRATIONS: tuple[dict[str, Any], ...] = (
    {
        "id": "vultr-control-plane",
        "label": "Vultr control plane",
        "requiredEnv": ("VULTR_API_KEY",),
        "kind": "api-key",
    },
    {
        "id": "vultr-serverless-inference",
        "label": "Vultr Serverless Inference",
        "requiredEnv": ("VULTR_SERVERLESS_INFERENCE_API_KEY",),
        "optionalEnv": (
            "VULTR_SERVERLESS_INFERENCE_BASE_URL",
            "VULTR_SERVERLESS_INFERENCE_MODEL",
            "VULTR_SERVERLESS_INFERENCE_TIMEOUT_SECONDS",
        ),
        "kind": "api-key",
    },
    {
        "id": "vultr-object-storage",
        "label": "Vultr Object Storage",
        "requiredEnv": (
            "VULTR_OBJECT_STORAGE_ACCESS_KEY",
            "VULTR_OBJECT_STORAGE_SECRET_KEY",
            "VULTR_OBJECT_STORAGE_ENDPOINT",
            "VULTR_OBJECT_STORAGE_BUCKET",
        ),
        "optionalEnv": ("VULTR_OBJECT_STORAGE_REGION",),
        "kind": "s3-compatible",
    },
    {
        "id": "managed-database",
        "label": "Managed database",
        "requiredEnv": ("DATABASE_URL",),
        "kind": "database-url",
    },
)


def load_env_file() -> Path | None:
    """Load KEY=value pairs from .env without overriding real environment values."""

    raw_path = os.environ.get("RECLAIM_ENV_FILE")
    if raw_path == "":
        return None

    env_path = Path(raw_path).expanduser() if raw_path else DEFAULT_ENV_PATH
    env_path = env_path.resolve()
    if env_path in _LOADED_ENV_FILES:
        return env_path

    _LOADED_ENV_FILES.add(env_path)
    if not env_path.is_file():
        return env_path

    for line in env_path.read_text(encoding="utf-8").splitlines():
        key, value = _parse_env_line(line)
        if key and key not in os.environ:
            os.environ[key] = value
    return env_path


def integration_status() -> dict[str, Any]:
    load_env_file()
    services = [_service_status(service) for service in INTEGRATIONS]
    configured = sum(1 for service in services if service["configured"])
    total = len(services)
    missing = sorted({name for service in services for name in service["missingEnv"]})

    return {
        "summary": {
            "configured": configured,
            "total": total,
            "missing": missing,
            "mode": "configured" if configured == total else "partial" if configured else "local",
        },
        "services": services,
    }


def configured_secret(name: str) -> str | None:
    load_env_file()
    value = os.environ.get(name, "").strip()
    return value or None


def _service_status(service: dict[str, Any]) -> dict[str, Any]:
    required = tuple(service.get("requiredEnv", ()))
    optional = tuple(service.get("optionalEnv", ()))
    missing = [name for name in required if not configured_secret(name)]
    present_optional = [name for name in optional if configured_secret(name)]

    return {
        "id": service["id"],
        "label": service["label"],
        "kind": service["kind"],
        "configured": not missing,
        "requiredEnv": list(required),
        "optionalEnv": list(optional),
        "missingEnv": missing,
        "presentOptionalEnv": present_optional,
    }


def _parse_env_line(line: str) -> tuple[str | None, str]:
    stripped = line.strip()
    if not stripped or stripped.startswith("#") or "=" not in stripped:
        return None, ""

    if stripped.startswith("export "):
        stripped = stripped[len("export ") :].strip()

    key, value = stripped.split("=", 1)
    key = key.strip()
    value = value.strip()
    if not key:
        return None, ""

    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    return key, value
