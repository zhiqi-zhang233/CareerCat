import time
from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4

from app.auth import get_current_user_id, resolve_user_id
from app.schemas.job_discovery import (
    JobDiscoveryRequest,
    JobDiscoveryResponse,
    SaveRecommendationRequest,
)
from app.schemas.jobs import JobImportResponse
from app.services.dynamodb_service import get_user_profile, save_job_post
from app.services.job_discovery_service import discover_adzuna_jobs
from app.services.observability_service import record_agent_run

router = APIRouter(prefix="/job-discovery", tags=["job-discovery"])


@router.post("/adzuna", response_model=JobDiscoveryResponse)
def discover_jobs(
    payload: JobDiscoveryRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    start_time = time.perf_counter()
    user_id = resolve_user_id(payload.user_id, auth_user_id)
    profile = get_user_profile(user_id) or {}

    try:
        recommendations = discover_adzuna_jobs(profile, payload.model_dump())
    except ValueError as e:
        record_agent_run(
            user_id=user_id,
            action_type="job_discovery",
            selected_tool="search_adzuna_jobs",
            route="/recommendations",
            input_summary=_job_discovery_input(payload),
            success=False,
            latency_ms=_elapsed_ms(start_time),
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        record_agent_run(
            user_id=user_id,
            action_type="job_discovery",
            selected_tool="search_adzuna_jobs",
            route="/recommendations",
            input_summary=_job_discovery_input(payload),
            success=False,
            latency_ms=_elapsed_ms(start_time),
            error_message=f"Adzuna search failed: {e}",
        )
        raise HTTPException(status_code=502, detail=f"Adzuna search failed: {e}")

    record_agent_run(
        user_id=user_id,
        action_type="job_discovery",
        selected_tool="search_adzuna_jobs",
        route="/recommendations",
        input_summary=_job_discovery_input(payload),
        tool_result_summary=f"Returned {len(recommendations)} job recommendations",
        success=True,
        latency_ms=_elapsed_ms(start_time),
        metadata={
            "keywords": payload.keywords,
            "location": payload.location,
            "posted_within_days": payload.posted_within_days,
            "remote_only": payload.remote_only,
        },
    )

    return {
        "user_id": user_id,
        "recommendations": recommendations,
    }


@router.post("/save", response_model=JobImportResponse)
def save_recommendation(
    payload: SaveRecommendationRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    start_time = time.perf_counter()
    user_id = resolve_user_id(payload.user_id, auth_user_id)
    recommendation = payload.recommendation.model_dump()

    saved_job = {
        "job_id": str(uuid4()),
        "user_id": user_id,
        "company": recommendation["company"],
        "title": recommendation["title"],
        "location": recommendation["location"],
        "work_mode": recommendation["work_mode"],
        "employment_type": recommendation["employment_type"],
        "seniority": recommendation["seniority"],
        "visa_sponsorship": recommendation["visa_sponsorship"],
        "salary_range": recommendation["salary_range"],
        "posting_date": recommendation["posting_date"],
        "required_skills": recommendation["required_skills"],
        "preferred_skills": recommendation["preferred_skills"],
        "requirements": recommendation["requirements"],
        "responsibilities": recommendation["responsibilities"],
        "summary": recommendation["summary"],
        "raw_job_text": recommendation["raw_job_text"],
        "source": recommendation["source"],
        "source_job_id": recommendation["source_job_id"],
        "external_url": recommendation["external_url"],
        "match_score": recommendation["match_score"],
        "match_reasons": recommendation["match_reasons"],
        "missing_skills": recommendation["missing_skills"],
        "status": "not_applied",
        "application_date": "",
        "notes": "",
    }

    saved_job = save_job_post(saved_job)

    record_agent_run(
        user_id=user_id,
        action_type="save_recommendation",
        selected_tool="save_job_to_dashboard",
        route="/dashboard",
        input_summary=f"{recommendation['title']} at {recommendation['company']}",
        tool_result_summary=f"Saved job {saved_job['job_id']} to dashboard",
        success=True,
        latency_ms=_elapsed_ms(start_time),
    )

    return {
        "message": "Recommendation saved to dashboard",
        "parsed_job": saved_job,
    }


def _job_discovery_input(payload: JobDiscoveryRequest) -> str:
    return (
        f"keywords={payload.keywords}; location={payload.location}; "
        f"country={payload.country}; posted_within_days={payload.posted_within_days}; "
        f"results_per_page={payload.results_per_page}; remote_only={payload.remote_only}"
    )


def _elapsed_ms(start_time: float) -> int:
    return round((time.perf_counter() - start_time) * 1000)
