from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user_id, resolve_user_id
from app.schemas.observability import (
    ObservabilityMetricsResponse,
    ObservabilityRunsResponse,
    SponsorshipFilterCheckResponse,
)
from app.services.dynamodb_service import get_user_profile
from app.services.observability_service import (
    compute_observability_metrics,
    get_recent_agent_runs,
    record_agent_run,
)
from app.services.sponsorship_filter_service import run_sponsorship_filter_accuracy_check

router = APIRouter(prefix="/observability", tags=["observability"])


@router.get("/runs/{user_id}", response_model=ObservabilityRunsResponse)
def get_runs(
    user_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    return {
        "user_id": resolved_user_id,
        "runs": get_recent_agent_runs(resolved_user_id, limit),
    }


@router.get("/metrics/{user_id}", response_model=ObservabilityMetricsResponse)
def get_metrics(
    user_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    return compute_observability_metrics(resolved_user_id)


@router.post(
    "/quality/sponsorship-filter/{user_id}",
    response_model=SponsorshipFilterCheckResponse,
)
def run_sponsorship_filter_check(
    user_id: str,
    sample_count: int = Query(default=5, ge=1, le=50),
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    profile = get_user_profile(resolved_user_id) or {}
    check = run_sponsorship_filter_accuracy_check(sample_count)
    current_profile_requires_sponsorship = bool(profile.get("sponsorship_need"))

    record_agent_run(
        user_id=resolved_user_id,
        action_type="quality_check",
        selected_tool="sponsorship_filter_accuracy_check",
        route="/observability",
        input_summary=(
            f"Run {check['sample_count']} random sponsorship-filter cases for "
            "a simulated user who requires sponsorship."
        ),
        tool_result_summary=(
            f"{check['passed_cases']} of {check['total_cases']} cases passed "
            f"({check['accuracy']}% accuracy)."
        ),
        success=True,
        latency_ms=0,
        metadata={"current_profile_requires_sponsorship": current_profile_requires_sponsorship},
    )

    return {
        "user_id": resolved_user_id,
        "current_profile_requires_sponsorship": current_profile_requires_sponsorship,
        **check,
    }
