import time

from fastapi import APIRouter, Depends

from app.auth import get_current_user_id, resolve_user_id
from app.schemas.agent import AgentAssistRequest, AgentAssistResponse
from app.services.agent_assist_service import decide_next_step
from app.services.dynamodb_service import get_user_profile
from app.services.observability_service import record_agent_run, summarize_text

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/assist", response_model=AgentAssistResponse)
def workflow_agent(
    payload: AgentAssistRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    start_time = time.perf_counter()
    user_id = resolve_user_id(payload.user_id, auth_user_id)

    try:
        profile = get_user_profile(user_id)
        decision = decide_next_step(
            message=payload.message,
            profile=profile,
            current_page=payload.current_page,
        )
    except Exception as exc:
        record_agent_run(
            user_id=user_id,
            action_type="workflow_agent",
            selected_tool="route_request",
            route=payload.current_page,
            input_summary=payload.message,
            success=False,
            latency_ms=_elapsed_ms(start_time),
            error_message=str(exc),
        )
        raise

    record_agent_run(
        user_id=user_id,
        action_type="workflow_agent",
        selected_tool=decision["selected_tool"],
        route=decision["route"],
        input_summary=payload.message,
        model_output_summary=(
            f"Intent: {decision['intent']}. Needs input: "
            f"{decision['needs_user_input']}. Reply: {summarize_text(decision['reply'], 160)}"
        ),
        tool_result_summary=_agent_result_summary(decision),
        success=True,
        latency_ms=_elapsed_ms(start_time),
        metadata={
            "current_page": payload.current_page,
            "tool_args": decision["tool_args"],
        },
    )

    return decision


def _elapsed_ms(start_time: float) -> int:
    return round((time.perf_counter() - start_time) * 1000)


def _agent_result_summary(decision: dict) -> str:
    if decision["route"] == "/":
        return "Answered on the home page without routing to another workflow"
    return f"Routed user to {decision['route']}"
