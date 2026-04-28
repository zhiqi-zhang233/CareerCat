from datetime import datetime, timezone
from uuid import uuid4

from app.services.dynamodb_service import save_agent_run


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
        print(f"[workflow-log] failed to save agent run: {exc}")
        return None


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
