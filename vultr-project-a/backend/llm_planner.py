"""LLM planner for telecom SLA audit cases.

The planner only PLANS (which stages to run) and writes rationale text. It never
emits dollar amounts, deadlines, prior-credit determinations, or precedence -
those stay in deterministic tools. Provider chain: Vultr -> NVIDIA -> rules.
"""
from __future__ import annotations

import json
import time
import urllib.request
from typing import Any

import env_config

_AMBIGUOUS_TAGS = {"scheduled maintenance", "customer-caused"}
_TIMEOUT = 12
_PROBE_TIMEOUT = 5
_PROBE_TTL = 300  # seconds

_case_cache: dict[str, dict[str, Any]] = {}
_probe_cache: dict[str, Any] = {"at": 0.0, "value": None}


def _providers() -> list[dict[str, Any]]:
    return [
        {
            "name": "vultr",
            "base": env_config.get("VULTR_INFERENCE_BASE_URL"),
            "key": env_config.get("VULTR_INFERENCE_API_KEY"),
            "model": env_config.get("VULTR_INFERENCE_MODEL"),
        },
        {
            "name": "nvidia",
            "base": env_config.get("NVIDIA_BASE_URL"),
            "key": env_config.get("NVIDIA_API_KEY"),
            "model": env_config.get("NVIDIA_MODEL"),
        },
    ]


# --- prompt -------------------------------------------------------------------


def _messages(bundle: dict[str, Any]) -> list[dict[str, str]]:
    system = (
        "You are a telecom SLA audit planner. You decide which review stages an "
        "audit agent should run for one circuit case. You never compute money, "
        "deadlines, or credit amounts - deterministic tools do that. You only plan "
        "and explain. Return ONLY a single JSON object, no prose, with exactly "
        "these keys: needs_exclusion_review (bool), needs_billing_crosscheck (bool), "
        "rationale (string, <=280 chars), evidence_needed (array of strings), "
        "stop_condition (string). Decision rules: if any interval tag is ambiguous "
        "(scheduled maintenance or customer-caused) the downtime may be excludable, "
        "so set needs_exclusion_review true; if invoiceHistory shows any prior "
        "credit, set needs_billing_crosscheck true to avoid double counting. Weigh "
        "the evidence yourself and decide."
    )
    user = "Plan the SLA audit for this case bundle:\n" + json.dumps(bundle, indent=2)
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


# --- HTTP + parsing -----------------------------------------------------------


def _chat(base: str, key: str, model: str, messages: list[dict[str, str]]) -> str:
    url = base.rstrip("/") + "/chat/completions"
    # Nemotron-Cascade is a reasoning model: it spends tokens on chain-of-thought
    # before emitting content, so the budget must be generous or content is empty.
    payload = {"model": model, "messages": messages, "temperature": 0.2, "max_tokens": 3000}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
    )
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    message = body["choices"][0]["message"]
    content = (message.get("content") or "").strip()
    if not content:
        # Fall back to the reasoning trace (Vultr uses "reasoning", others "reasoning_content").
        content = (message.get("reasoning_content") or message.get("reasoning") or "").strip()
    return content


def _extract_json(text: str) -> str | None:
    """Return the first balanced JSON object via a brace-matching scan."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        char = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _valid(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    schema = {
        "needs_exclusion_review": bool,
        "needs_billing_crosscheck": bool,
        "rationale": str,
        "evidence_needed": list,
        "stop_condition": str,
    }
    for key, expected in schema.items():
        if key not in obj or not isinstance(obj[key], expected):
            return False
    return all(isinstance(item, str) for item in obj["evidence_needed"])


# --- deterministic fallback ---------------------------------------------------


def rules_plan(bundle: dict[str, Any]) -> dict[str, Any]:
    """Deterministic planner ported from the original plan_for_case logic."""
    started = time.time()
    intervals = bundle.get("intervals", [])
    has_ambiguous = any(iv.get("tag") in _AMBIGUOUS_TAGS for iv in intervals)
    has_prior_credit = len(bundle.get("invoiceHistory", [])) > 0
    return {
        "needsExclusion": has_ambiguous,
        "needsBilling": has_prior_credit,
        "rationale": (
            "Rules planner: "
            + ("ambiguous interval tag -> exclusion review. " if has_ambiguous else "no ambiguous tag. ")
            + ("prior credit in invoice history -> billing cross-check." if has_prior_credit else "no prior credit.")
        )[:280],
        "evidence": [iv.get("ticket", "") for iv in intervals],
        "stopCondition": "Stop when memo has amount, citations, confidence terms, and approval state.",
        "plannerSource": "rules",
        "plannerModel": None,
        "latencyMs": int((time.time() - started) * 1000),
        "rawResponse": None,
    }


# --- provider attempt ---------------------------------------------------------


def _try_provider(provider: dict[str, Any], bundle: dict[str, Any]) -> dict[str, Any] | None:
    base, key, model = provider["base"], provider["key"], provider["model"]
    if not base or not key or not model:
        return None
    started = time.time()
    try:
        raw = _chat(base, key, model, _messages(bundle))
        snippet = _extract_json(raw)
        obj = json.loads(snippet) if snippet else None
    except Exception:
        return None
    if not _valid(obj):
        return None

    needs_exclusion = obj["needs_exclusion_review"]
    source = provider["name"]
    # Sanity guard: planner may only ask for MORE work than rules require, never less.
    has_ambiguous = any(iv.get("tag") in _AMBIGUOUS_TAGS for iv in bundle.get("intervals", []))
    if has_ambiguous and not needs_exclusion:
        needs_exclusion = True
        source = f"{provider['name']}-guard-corrected"

    return {
        "needsExclusion": needs_exclusion,
        "needsBilling": obj["needs_billing_crosscheck"],
        "rationale": obj["rationale"][:280],
        "evidence": obj["evidence_needed"],
        "stopCondition": obj["stop_condition"],
        "plannerSource": source,
        "plannerModel": model,
        "latencyMs": int((time.time() - started) * 1000),
        "rawResponse": raw[:2000],
    }


def plan_case(bundle: dict[str, Any]) -> dict[str, Any]:
    """Plan one case through the provider chain, cached per circuit id."""
    circuit = bundle.get("circuit")
    if circuit in _case_cache:
        return _case_cache[circuit]
    for provider in _providers():
        result = _try_provider(provider, bundle)
        if result is not None:
            _case_cache[circuit] = result
            return result
    result = rules_plan(bundle)
    _case_cache[circuit] = result
    return result


# --- health probe -------------------------------------------------------------


def _models_reachable(base: str, key: str) -> bool:
    url = base.rstrip("/") + "/models"
    req = urllib.request.Request(url, method="GET", headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=_PROBE_TIMEOUT) as resp:
        return resp.status == 200


def probe_planner() -> dict[str, Any]:
    """Which provider is actually reachable now. Cached for 5 minutes."""
    now = time.time()
    if _probe_cache["value"] is not None and now - _probe_cache["at"] < _PROBE_TTL:
        return _probe_cache["value"]
    value = {"mode": "rules", "model": None, "live": False}
    for provider in _providers():
        base, key, model = provider["base"], provider["key"], provider["model"]
        if not base or not key:
            continue
        try:
            if _models_reachable(base, key):
                value = {"mode": provider["name"], "model": model, "live": True}
                break
        except Exception:
            continue
    _probe_cache.update(at=now, value=value)
    return value
