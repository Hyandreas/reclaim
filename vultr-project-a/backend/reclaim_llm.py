"""Live LLM calls for bounded, tool-backed audit-note generation."""

from __future__ import annotations

import json
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from reclaim_keys import configured_secret


DEFAULT_INFERENCE_BASE_URL = "https://api.vultrinference.com/v1"
DEFAULT_INFERENCE_MODEL = "kimi-k2-instruct"
PROMPT_VERSION = "tool-planner-v2"
MAX_TOOL_ROUNDS = 4


def llm_planner_event(
    item: dict[str, Any],
    plan: dict[str, Any],
    credit: dict[str, Any],
    allow_live: bool = True,
) -> dict[str, Any]:
    """Return a trace event produced by Vultr Serverless Inference when configured."""

    if not allow_live:
        return {
            "id": "llm-plan",
            "kind": "skip",
            "eventName": "llm.planner_note.skipped",
            "source": "vultr-serverless-inference",
            "title": "LLM audit tools not invoked",
            "status": "local preview",
            "detail": "Live inference is only invoked during an explicit run; deterministic audit tools run locally.",
            "metric": "Run audit invokes tool calling",
            "payload": {
                "provider": "vultr-serverless-inference",
                "promptVersion": PROMPT_VERSION,
                "live": False,
                "reason": "not-requested",
                "toolCalling": False,
            },
        }

    api_key = configured_secret("VULTR_SERVERLESS_INFERENCE_API_KEY")
    if not api_key:
        return {
            "id": "llm-plan",
            "kind": "skip",
            "eventName": "llm.planner_note.skipped",
            "source": "vultr-serverless-inference",
            "title": "LLM audit tools skipped",
            "status": "keys pending",
            "detail": "No inference key configured; deterministic audit tools run locally.",
            "metric": "VULTR_SERVERLESS_INFERENCE_API_KEY missing",
            "payload": {
                "provider": "vultr-serverless-inference",
                "promptVersion": PROMPT_VERSION,
                "live": False,
                "reason": "missing-key",
                "toolCalling": False,
            },
        }

    model = configured_secret("VULTR_SERVERLESS_INFERENCE_MODEL") or DEFAULT_INFERENCE_MODEL
    base_url = configured_secret("VULTR_SERVERLESS_INFERENCE_BASE_URL") or DEFAULT_INFERENCE_BASE_URL
    timeout = _float_secret("VULTR_SERVERLESS_INFERENCE_TIMEOUT_SECONDS", 12)
    endpoint = f"{base_url.rstrip('/')}/chat/completions"

    started = time.perf_counter()
    try:
        note, tool_calls, model_calls = _tool_backed_note(
            endpoint=endpoint,
            api_key=api_key,
            model=model,
            item=item,
            plan=plan,
            credit=credit,
            timeout=timeout,
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        return {
            "id": "llm-plan",
            "kind": "model",
            "eventName": "llm.planner_note.generated",
            "source": "vultr-serverless-inference",
            "title": "LLM called audit tools",
            "status": "live inference",
            "detail": note,
            "metric": f"{model} / {len(tool_calls)} tool calls / {elapsed_ms} ms",
            "payload": {
                "provider": "vultr-serverless-inference",
                "model": model,
                "promptVersion": PROMPT_VERSION,
                "live": True,
                "latencyMs": elapsed_ms,
                "modelCalls": model_calls,
                "toolCalling": bool(tool_calls),
                "toolCalls": tool_calls,
            },
        }
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as exc:
        return {
            "id": "llm-plan",
            "kind": "model",
            "eventName": "llm.planner_note.failed",
            "source": "vultr-serverless-inference",
            "title": "LLM audit tools fallback",
            "status": "fallback",
            "detail": f"Inference tool run failed; deterministic audit trace is still valid. {type(exc).__name__}: {_safe_error(exc)}",
            "metric": f"{model} unavailable",
            "payload": {
                "provider": "vultr-serverless-inference",
                "model": model,
                "promptVersion": PROMPT_VERSION,
                "live": False,
                "toolCalling": False,
                "errorType": type(exc).__name__,
            },
        }


def _tool_backed_note(
    endpoint: str,
    api_key: str,
    model: str,
    item: dict[str, Any],
    plan: dict[str, Any],
    credit: dict[str, Any],
    timeout: float,
) -> tuple[str, list[str], int]:
    messages: list[dict[str, Any]] = _planner_messages(item, plan)
    called_tools: list[str] = []
    model_calls = 0

    for round_index in range(MAX_TOOL_ROUNDS):
        message = _chat_completion_message(
            endpoint=endpoint,
            api_key=api_key,
            model=model,
            messages=messages,
            timeout=timeout,
            tools=_audit_tool_definitions(),
            tool_choice="required" if round_index == 0 else "auto",
            max_tokens=160,
        )
        model_calls += 1

        tool_calls = _extract_tool_calls(message)
        if tool_calls:
            messages.append(_assistant_tool_call_message(message, tool_calls))
            for tool_call in tool_calls:
                result = _execute_audit_tool(tool_call, item, plan, credit)
                called_tools.append(result["tool"])
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": result["tool"],
                        "content": json.dumps(result, sort_keys=True),
                    }
                )
            continue

        note = _compact_note(_message_text(message))
        return note, called_tools, model_calls

    raise ValueError("Inference did not return final content after tool calls.")


def _chat_completion_message(
    endpoint: str,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    timeout: float,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | None = None,
    max_tokens: int = 96,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    if tools:
        payload["tools"] = tools
    if tool_choice:
        payload["tool_choice"] = tool_choice

    request = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        response_payload = json.loads(response.read().decode("utf-8"))
    return _extract_choice_message(response_payload)


def _planner_messages(
    item: dict[str, Any],
    plan: dict[str, Any],
) -> list[dict[str, Any]]:
    intervals = "; ".join(
        f"{row['ticket']} {row['minutes']}m {row['tag']} notice={row['notice']}"
        for row in item["intervals"]
    )
    invoices = "; ".join(
        f"{row['invoiceLine']} {row['reason']} {row['amount']}"
        for row in item.get("invoiceHistory", [])
    ) or "none"
    branch_decisions = _branch_decisions(plan)
    user_prompt = (
        f"Case: {item['id']} / BAN {item['ban']} / {item['store']}.\n"
        f"Planner stages: {', '.join(plan['selectedStages'])}.\n"
        f"Branch decisions: {json.dumps(branch_decisions, sort_keys=True)}.\n"
        f"Outage intervals: {intervals}.\n"
        f"Invoice history: {invoices}.\n"
        "Call the deterministic audit tools before writing the final note. "
        "Use tool outputs as the only source for uptime, dollars, classification, confidence, and deadline. "
        "Then write one concise audit-note sentence explaining the route."
    )
    return [
        {
            "role": "system",
            "content": (
                "You are a bounded telecom service-credit audit agent. "
                "You may choose and summarize tool results, but deterministic tools own "
                "math, classification, citations, and filing decisions. Do not invent facts."
            ),
        },
        {"role": "user", "content": user_prompt},
    ]


def _audit_tool_definitions() -> list[dict[str, Any]]:
    case_id_schema = {
        "type": "object",
        "properties": {
            "case_id": {
                "type": "string",
                "description": "The current circuit/case id from the prompt.",
            }
        },
        "required": ["case_id"],
    }
    return [
        {
            "type": "function",
            "function": {
                "name": "get_audit_plan",
                "description": "Return the deterministic planner stages and branch decisions for the current case.",
                "parameters": case_id_schema,
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calculate_uptime",
                "description": "Return deterministic counted downtime, uptime, SLA target, and breach status.",
                "parameters": case_id_schema,
            },
        },
        {
            "type": "function",
            "function": {
                "name": "calculate_credit",
                "description": "Return deterministic credit math, prior-credit offset, confidence, and classification.",
                "parameters": case_id_schema,
            },
        },
        {
            "type": "function",
            "function": {
                "name": "check_billing_history",
                "description": "Return deterministic invoice-history and prior-credit findings.",
                "parameters": case_id_schema,
            },
        },
        {
            "type": "function",
            "function": {
                "name": "check_claim_deadline",
                "description": "Return deterministic filing-window status for the current claim.",
                "parameters": case_id_schema,
            },
        },
    ]


def _extract_choice_message(payload: dict[str, Any]) -> dict[str, Any]:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("Inference response did not include choices.")

    choice = choices[0]
    if not isinstance(choice, dict):
        raise ValueError("Inference response choice was not an object.")

    message = choice.get("message")
    if isinstance(message, dict):
        return message

    text = choice.get("text")
    if isinstance(text, str):
        return {"role": "assistant", "content": text}

    raise ValueError("Inference response did not include an assistant message.")


def _extract_tool_calls(message: dict[str, Any]) -> list[dict[str, Any]]:
    raw_calls = message.get("tool_calls")
    if not isinstance(raw_calls, list):
        return []

    calls: list[dict[str, Any]] = []
    for index, raw_call in enumerate(raw_calls):
        if not isinstance(raw_call, dict):
            continue
        function = raw_call.get("function")
        if not isinstance(function, dict):
            continue
        name = function.get("name")
        if not isinstance(name, str) or not name:
            continue
        arguments = function.get("arguments", "{}")
        if isinstance(arguments, dict):
            arguments_text = json.dumps(arguments)
        elif isinstance(arguments, str):
            arguments_text = arguments
        else:
            arguments_text = "{}"
        calls.append(
            {
                "id": raw_call.get("id") if isinstance(raw_call.get("id"), str) else f"call_{index}",
                "type": "function",
                "name": name,
                "argumentsText": arguments_text,
                "arguments": _parse_arguments(arguments_text),
            }
        )
    return calls


def _assistant_tool_call_message(
    message: dict[str, Any],
    tool_calls: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "role": "assistant",
        "content": message.get("content"),
        "tool_calls": [
            {
                "id": tool_call["id"],
                "type": "function",
                "function": {
                    "name": tool_call["name"],
                    "arguments": tool_call["argumentsText"],
                },
            }
            for tool_call in tool_calls
        ],
    }


def _execute_audit_tool(
    tool_call: dict[str, Any],
    item: dict[str, Any],
    plan: dict[str, Any],
    credit: dict[str, Any],
) -> dict[str, Any]:
    name = tool_call["name"]
    requested_case_id = tool_call.get("arguments", {}).get("case_id")
    base = {
        "tool": name,
        "caseId": item["id"],
        "requestedCaseId": requested_case_id,
        "authoritative": True,
    }
    if requested_case_id and requested_case_id != item["id"]:
        base["warning"] = "Tool calls are scoped to the active audit case; returned active case data."

    counted = _counted_intervals(credit)
    if name == "get_audit_plan":
        return {
            **base,
            "selectedStages": plan["selectedStages"],
            "branchDecisions": _branch_decisions(plan),
            "evidence": plan.get("evidenceNeeded", plan.get("evidence", [])),
            "rationale": plan["rationale"],
            "stopCondition": plan["stopCondition"],
        }
    if name == "calculate_uptime":
        return {
            **base,
            "countedMinutes": credit["countedMinutes"],
            "periodMinutes": item["periodMinutes"],
            "uptime": credit["uptime"],
            "slaTarget": item["slaTarget"],
            "breach": credit["breach"],
            "countedIntervals": _summarize_intervals(counted),
        }
    if name == "calculate_credit":
        return {
            **base,
            "mrc": item["mrc"],
            "creditPercent": credit["creditPercent"],
            "grossCredit": _credit_amount(credit),
            "alreadyCredited": credit["alreadyCredited"],
            "recoverableAmount": credit["recoverableAmount"],
            "confidence": credit["confidence"],
            "classification": credit["classification"],
        }
    if name == "check_billing_history":
        return {
            **base,
            "alreadyCredited": credit["alreadyCredited"],
            "invoiceLines": item.get("invoiceHistory", []),
            "status": "prior_credit_found" if credit["alreadyCredited"] else "clear",
        }
    if name == "check_claim_deadline":
        return {
            **base,
            "claimDaysLeft": item["claimDaysLeft"],
            "claimWindowDays": 30,
            "status": "urgent" if item["claimDaysLeft"] <= 3 else "inside_window",
        }
    return {
        **base,
        "authoritative": False,
        "error": f"Unknown audit tool: {name}",
        "availableTools": [
            "get_audit_plan",
            "calculate_uptime",
            "calculate_credit",
            "check_billing_history",
            "check_claim_deadline",
        ],
    }


def _message_text(message: dict[str, Any]) -> str:
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                parts.append(part["text"])
        if parts:
            return " ".join(parts)
    raise ValueError("Inference response did not include message content.")


def _compact_note(value: str) -> str:
    note = " ".join(value.split())
    if not note:
        raise ValueError("Inference response was empty.")
    if len(note) > 280:
        return f"{note[:277].rstrip()}..."
    return note


def _parse_arguments(arguments_text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(arguments_text or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _branch_decisions(plan: dict[str, Any]) -> dict[str, Any]:
    if isinstance(plan.get("branchDecisions"), dict):
        return plan["branchDecisions"]
    return {
        "needsExclusion": bool(plan.get("needsExclusion")),
        "needsBilling": bool(plan.get("needsBilling")),
    }


def _counted_intervals(credit: dict[str, Any]) -> list[dict[str, Any]]:
    counted = credit.get("countedIntervals", credit.get("counted", []))
    return counted if isinstance(counted, list) else []


def _summarize_intervals(intervals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "ticket": interval.get("ticket"),
            "minutes": interval.get("minutes"),
            "tag": interval.get("tag"),
            "notice": interval.get("notice"),
            "counts": interval.get("counts"),
            "reason": interval.get("reason"),
        }
        for interval in intervals
    ]


def _credit_amount(credit: dict[str, Any]) -> float:
    value = credit.get("grossCredit", credit.get("rawCredit", 0))
    return float(value)


def _safe_error(exc: BaseException) -> str:
    if isinstance(exc, HTTPError):
        return f"HTTP {exc.code}"
    return str(exc)[:160]


def _float_secret(name: str, fallback: float) -> float:
    value = configured_secret(name)
    if not value:
        return fallback
    try:
        parsed = float(value)
    except ValueError:
        return fallback
    return parsed if parsed > 0 else fallback
