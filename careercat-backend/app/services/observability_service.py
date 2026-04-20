from datetime import datetime, timezone
from uuid import uuid4

from app.services.dynamodb_service import get_agent_runs_for_user, save_agent_run


def summarize_text(value: object, max_length: int = 280) -> str:
    text = str(value or "").replace("\n", " ").strip()
    if len(text) <= max_length:
        return text
    return f"{text[: max_length - 3]}..."


def record_agent_run(
    user_id: str,
    action_type: str,
    input_summary: str,
    selected_tool: str = "",
    route: str = "",
    model_output_summary: str = "",
    tool_result_summary: str = "",
    success: bool = True,
    latency_ms: int = 0,
    error_message: str = "",
    metadata: dict | None = None,
):
    timestamp = datetime.now(timezone.utc).isoformat()
    item = {
        "user_id": user_id,
        "run_id": f"{timestamp}#{uuid4()}",
        "action_type": action_type,
        "selected_tool": selected_tool,
        "route": route,
        "input_summary": summarize_text(input_summary),
        "model_output_summary": summarize_text(model_output_summary),
        "tool_result_summary": summarize_text(tool_result_summary),
        "success": bool(success),
        "latency_ms": int(latency_ms or 0),
        "error_message": summarize_text(error_message, 500),
        "metadata": _clean_metadata(metadata or {}),
        "created_at": timestamp,
    }

    try:
        return save_agent_run(item)
    except Exception as exc:
        print(f"[observability] failed to save agent run: {exc}")
        return None


def get_recent_agent_runs(user_id: str, limit: int = 50) -> list[dict]:
    try:
        runs = get_agent_runs_for_user(user_id, max(1, min(limit, 100)))
    except Exception as exc:
        print(f"[observability] failed to read agent runs: {exc}")
        return []

    return [_normalize_run(run) for run in runs]


def compute_observability_metrics(user_id: str) -> dict:
    runs = get_recent_agent_runs(user_id, 100)
    total_runs = len(runs)
    failure_count = len([run for run in runs if not run.get("success", True)])
    success_count = total_runs - failure_count
    success_rate = round((success_count / total_runs) * 100, 1) if total_runs else 0
    average_latency_ms = (
        round(sum(int(run.get("latency_ms") or 0) for run in runs) / total_runs)
        if total_runs
        else 0
    )
    action_counts = _count_by(runs, "action_type")
    tool_counts = _count_by(runs, "selected_tool")
    latest_run_at = runs[0].get("created_at", "") if runs else ""

    return {
        "user_id": user_id,
        "total_runs": total_runs,
        "success_rate": success_rate,
        "average_latency_ms": average_latency_ms,
        "failure_count": failure_count,
        "action_counts": action_counts,
        "tool_counts": tool_counts,
        "latest_run_at": latest_run_at,
        "metric_cards": [
            {
                "label": "Recorded Agent Runs",
                "value": str(total_runs),
                "explanation": (
                    "How many AI or tool-driven workflows were captured for this "
                    "local account. This shows whether the monitoring layer is "
                    "capturing real user activity."
                ),
            },
            {
                "label": "Workflow Success Rate",
                "value": f"{success_rate}%",
                "explanation": (
                    "The share of recorded workflows that completed without an "
                    "error. It is a simple reliability signal for demos and testing."
                ),
            },
            {
                "label": "Average Latency",
                "value": f"{average_latency_ms} ms",
                "explanation": (
                    "The average time spent in AI or external-tool workflows. This "
                    "helps identify whether users may experience slow responses."
                ),
            },
            {
                "label": "Failures",
                "value": str(failure_count),
                "explanation": (
                    "How many recorded workflows ended with an error. The recent run "
                    "log below shows the error message for debugging."
                ),
            },
        ],
    }


def _count_by(runs: list[dict], key: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for run in runs:
        value = str(run.get(key) or "none")
        counts[value] = counts.get(value, 0) + 1
    return counts


def _normalize_run(run: dict) -> dict:
    return {
        "user_id": run.get("user_id", ""),
        "run_id": run.get("run_id", ""),
        "action_type": run.get("action_type", ""),
        "selected_tool": run.get("selected_tool", ""),
        "route": run.get("route", ""),
        "input_summary": run.get("input_summary", ""),
        "model_output_summary": run.get("model_output_summary", ""),
        "tool_result_summary": run.get("tool_result_summary", ""),
        "success": bool(run.get("success", True)),
        "latency_ms": int(run.get("latency_ms") or 0),
        "error_message": run.get("error_message", ""),
        "created_at": run.get("created_at", ""),
        "metadata": dict(run.get("metadata") or {}),
    }


def _clean_metadata(value: object) -> object:
    if isinstance(value, dict):
        return {str(key): _clean_metadata(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_clean_metadata(item) for item in value[:20]]
    if isinstance(value, bool) or value is None:
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return str(value)
    return summarize_text(value, 200)
