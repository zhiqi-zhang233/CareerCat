import time

from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user_id, resolve_user_id
from app.schemas.coach import CoachChatRequest, CoachChatResponse
from app.services.dynamodb_service import get_job_post_by_id, get_user_profile
from app.services.interview_coach_service import generate_coach_reply, generate_interview_prep
from app.services.observability_service import record_agent_run, summarize_text

router = APIRouter(prefix="/coach", tags=["coach"])


@router.get("/{user_id}/{job_id}")
def get_interview_coach(
    user_id: str,
    job_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    job = get_job_post_by_id(resolved_user_id, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    prep = generate_interview_prep(job)

    return {
        "user_id": resolved_user_id,
        "job_id": job_id,
        "interview_prep": prep,
    }


@router.post("/chat", response_model=CoachChatResponse)
def coach_chat(
    payload: CoachChatRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    start_time = time.perf_counter()
    user_id = resolve_user_id(payload.user_id, auth_user_id)
    profile = get_user_profile(user_id)
    job = None

    if payload.job_id:
        job = get_job_post_by_id(user_id, payload.job_id)
        if not job:
            record_agent_run(
                user_id=user_id,
                action_type="coach_chat",
                selected_tool=_coach_tool(payload),
                route="/coach",
                input_summary=_coach_input(payload),
                success=False,
                latency_ms=_elapsed_ms(start_time),
                error_message="Job not found",
                metadata={"job_id": payload.job_id},
            )
            raise HTTPException(status_code=404, detail="Job not found")

    try:
        reply = generate_coach_reply(
            profile=profile,
            job=job,
            mode=payload.mode,
            subtype=payload.subtype,
            focus_topic=payload.focus_topic,
            messages=[message.model_dump() for message in payload.messages],
        )
    except Exception as exc:
        record_agent_run(
            user_id=user_id,
            action_type="coach_chat",
            selected_tool=_coach_tool(payload),
            route="/coach",
            input_summary=_coach_input(payload),
            success=False,
            latency_ms=_elapsed_ms(start_time),
            error_message=str(exc),
            metadata={"job_id": payload.job_id or ""},
        )
        raise

    record_agent_run(
        user_id=user_id,
        action_type="coach_chat",
        selected_tool=_coach_tool(payload),
        route="/coach",
        input_summary=_coach_input(payload),
        model_output_summary=summarize_text(reply, 260),
        tool_result_summary="Returned a coach response",
        success=True,
        latency_ms=_elapsed_ms(start_time),
        metadata={
            "mode": payload.mode,
            "subtype": payload.subtype or "",
            "job_id": payload.job_id or "",
            "focus_topic": payload.focus_topic or "",
        },
    )

    return {"reply": reply}


def _coach_tool(payload: CoachChatRequest) -> str:
    if payload.mode == "gap_analysis":
        return "start_gap_analysis"
    if payload.mode == "mock_interview":
        return "start_mock_interview"
    return "start_written_practice"


def _coach_input(payload: CoachChatRequest) -> str:
    latest_message = payload.messages[-1].content if payload.messages else ""
    return (
        f"mode={payload.mode}; subtype={payload.subtype or ''}; "
        f"focus={payload.focus_topic or ''}; latest_message={latest_message}"
    )


def _elapsed_ms(start_time: float) -> int:
    return round((time.perf_counter() - start_time) * 1000)
