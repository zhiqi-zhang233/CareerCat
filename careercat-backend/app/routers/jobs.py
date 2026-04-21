import time
from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4

from app.auth import get_current_user_id, resolve_user_id
from app.schemas.jobs import (
    JobCreateRequest,
    JobDeleteResponse,
    JobImportRequest,
    JobImportResponse,
    JobParseRequest,
    JobUpdateRequest,
    JobUpdateResponse,
)
from app.services.job_parser_service import parse_job_text
from app.services.dynamodb_service import (
    delete_job_post,
    get_user_profile,
    get_job_posts_for_user,
    save_job_post,
    update_job_post,
)
from app.services.observability_service import record_agent_run
from app.services.sponsorship_filter_service import should_block_for_sponsorship

router = APIRouter(prefix="/jobs", tags=["jobs"])

ALLOWED_STATUSES = {
    "not_applied",
    "applied",
    "assessment",
    "interview",
    "offer",
    "rejected",
}


@router.post("/parse", response_model=JobImportResponse)
def parse_job_only(
    payload: JobParseRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    start_time = time.perf_counter()
    user_id = resolve_user_id(payload.user_id, auth_user_id)

    if not payload.raw_job_text.strip():
        raise HTTPException(status_code=400, detail="Job post text is required.")

    try:
        parsed_job = parse_job_text(payload.raw_job_text)
    except Exception as exc:
        record_agent_run(
            user_id=user_id,
            action_type="job_parse_preview",
            selected_tool="parse_job_post",
            route="/import-jobs",
            input_summary=payload.raw_job_text,
            success=False,
            latency_ms=_elapsed_ms(start_time),
            error_message=str(exc),
        )
        raise

    profile = get_user_profile(user_id)
    needs_sponsorship = bool(profile and profile.get("sponsorship_need"))
    does_not_sponsor = should_block_for_sponsorship(
        needs_sponsorship,
        parsed_job["visa_sponsorship"],
    )

    preview_job = {
        "job_id": "",
        "user_id": user_id,
        "company": parsed_job["company"],
        "title": parsed_job["title"],
        "location": parsed_job["location"],
        "work_mode": parsed_job["work_mode"],
        "employment_type": parsed_job["employment_type"],
        "seniority": parsed_job["seniority"],
        "visa_sponsorship": parsed_job["visa_sponsorship"],
        "salary_range": parsed_job["salary_range"],
        "posting_date": parsed_job["posting_date"],
        "required_skills": parsed_job["required_skills"],
        "preferred_skills": parsed_job["preferred_skills"],
        "requirements": parsed_job["requirements"],
        "responsibilities": parsed_job["responsibilities"],
        "summary": parsed_job["summary"],
        "raw_job_text": payload.raw_job_text,
        "status": "not_applied",
        "application_date": "",
        "notes": "",
    }

    record_agent_run(
        user_id=user_id,
        action_type="job_parse_preview",
        selected_tool="parse_job_post",
        route="/import-jobs",
        input_summary=payload.raw_job_text,
        model_output_summary=(
            f"Parsed {parsed_job['title']} at {parsed_job['company']}. "
            f"Visa sponsorship: {parsed_job['visa_sponsorship']}."
        ),
        tool_result_summary="Returned editable preview before save",
        success=True,
        latency_ms=_elapsed_ms(start_time),
        metadata={"blocked_by_sponsorship": does_not_sponsor},
    )

    return {
        "message": "Job post parsed successfully",
        "parsed_job": preview_job,
        "blocked": does_not_sponsor,
        "warning": (
            "This job appears to not support visa sponsorship. "
            "Because your profile says you need sponsorship, review it carefully before saving."
            if does_not_sponsor
            else None
        ),
    }


@router.post("", response_model=JobImportResponse)
def create_job(
    payload: JobCreateRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    start_time = time.perf_counter()
    user_id = resolve_user_id(payload.user_id, auth_user_id)
    job_data = payload.model_dump()
    force_save = job_data.pop("force_save", False)
    job_data["user_id"] = user_id
    job_data["job_id"] = str(uuid4())

    if not job_data.get("title", "").strip():
        raise HTTPException(status_code=400, detail="Job title is required.")

    if job_data.get("status") and job_data["status"] not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Unsupported job status.")

    profile = get_user_profile(user_id)
    needs_sponsorship = bool(profile and profile.get("sponsorship_need"))
    does_not_sponsor = should_block_for_sponsorship(
        needs_sponsorship,
        job_data.get("visa_sponsorship", "Unknown"),
    )

    if does_not_sponsor and not force_save:
        return {
            "message": "Job was not saved",
            "parsed_job": job_data,
            "blocked": True,
            "warning": (
                "This job appears to not support visa sponsorship. "
                "Because your profile says you need sponsorship, it was not saved."
            ),
        }

    saved_job = save_job_post(job_data)

    record_agent_run(
        user_id=user_id,
        action_type="job_create",
        selected_tool="save_job_post",
        route="/dashboard",
        input_summary=f"{job_data['title']} at {job_data.get('company', '')}",
        tool_result_summary=f"Saved job {saved_job['job_id']} to dashboard",
        success=True,
        latency_ms=_elapsed_ms(start_time),
        metadata={"blocked_by_sponsorship": False, "force_save": force_save},
    )

    return {
        "message": "Job saved successfully",
        "parsed_job": saved_job,
        "blocked": False,
        "warning": None,
    }


@router.post("/import", response_model=JobImportResponse)
def import_job(
    job: JobImportRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    start_time = time.perf_counter()
    user_id = resolve_user_id(job.user_id, auth_user_id)

    if not job.raw_job_text.strip():
        record_agent_run(
            user_id=user_id,
            action_type="job_import",
            selected_tool="parse_job_post",
            route="/import-jobs",
            input_summary="Empty job post text",
            success=False,
            latency_ms=_elapsed_ms(start_time),
            error_message="Job post text is required.",
        )
        raise HTTPException(status_code=400, detail="Job post text is required.")

    try:
        parsed_job = parse_job_text(job.raw_job_text)
    except Exception as exc:
        record_agent_run(
            user_id=user_id,
            action_type="job_import",
            selected_tool="parse_job_post",
            route="/import-jobs",
            input_summary=job.raw_job_text,
            success=False,
            latency_ms=_elapsed_ms(start_time),
            error_message=str(exc),
        )
        raise

    job_item = {
        "job_id": str(uuid4()),
        "user_id": user_id,
        "company": parsed_job["company"],
        "title": parsed_job["title"],
        "location": parsed_job["location"],
        "work_mode": parsed_job["work_mode"],
        "employment_type": parsed_job["employment_type"],
        "seniority": parsed_job["seniority"],
        "visa_sponsorship": parsed_job["visa_sponsorship"],
        "salary_range": parsed_job["salary_range"],
        "posting_date": parsed_job["posting_date"],
        "required_skills": parsed_job["required_skills"],
        "preferred_skills": parsed_job["preferred_skills"],
        "requirements": parsed_job["requirements"],
        "responsibilities": parsed_job["responsibilities"],
        "summary": parsed_job["summary"],
        "raw_job_text": job.raw_job_text,
        "status": "not_applied",
        "application_date": "",
        "notes": "",
    }

    profile = get_user_profile(user_id)
    needs_sponsorship = bool(profile and profile.get("sponsorship_need"))
    does_not_sponsor = should_block_for_sponsorship(
        needs_sponsorship,
        parsed_job["visa_sponsorship"],
    )

    if does_not_sponsor and not job.force_save:
        record_agent_run(
            user_id=user_id,
            action_type="job_import",
            selected_tool="parse_job_post",
            route="/import-jobs",
            input_summary=job.raw_job_text,
            model_output_summary=(
                f"Parsed {parsed_job['title']} at {parsed_job['company']}. "
                "Visa sponsorship: No."
            ),
            tool_result_summary="Blocked save because user needs sponsorship",
            success=True,
            latency_ms=_elapsed_ms(start_time),
            metadata={
                "blocked_by_sponsorship": True,
                "force_save": job.force_save,
            },
        )
        return {
            "message": "Job post parsed but not saved",
            "parsed_job": job_item,
            "blocked": True,
            "warning": (
                "This job appears to not support visa sponsorship. "
                "Because your profile says you need sponsorship, it was not saved."
            ),
        }

    saved_job = save_job_post(job_item)

    record_agent_run(
        user_id=user_id,
        action_type="job_import",
        selected_tool="parse_job_post",
        route="/dashboard",
        input_summary=job.raw_job_text,
        model_output_summary=(
            f"Parsed {parsed_job['title']} at {parsed_job['company']}. "
            f"Visa sponsorship: {parsed_job['visa_sponsorship']}."
        ),
        tool_result_summary=f"Saved job {saved_job['job_id']} to dashboard",
        success=True,
        latency_ms=_elapsed_ms(start_time),
        metadata={
            "blocked_by_sponsorship": False,
            "force_save": job.force_save,
        },
    )

    return {
        "message": "Job post parsed and saved successfully",
        "parsed_job": saved_job,
        "blocked": False,
        "warning": None,
    }


@router.get("/{user_id}")
def get_jobs_for_user(
    user_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    jobs = get_job_posts_for_user(resolved_user_id)

    return {
        "user_id": resolved_user_id,
        "jobs": jobs,
    }


@router.patch("/{user_id}/{job_id}", response_model=JobUpdateResponse)
def update_job_for_user(
    user_id: str,
    job_id: str,
    payload: JobUpdateRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    updates = payload.model_dump(exclude_unset=True)

    if "status" in updates:
        if updates["status"] not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Unsupported job status.")

    updated_job = update_job_post(resolved_user_id, job_id, updates)

    if not updated_job:
        raise HTTPException(status_code=404, detail="Job not found.")

    return {
        "message": "Job updated successfully",
        "job": updated_job,
    }


@router.delete("/{user_id}/{job_id}", response_model=JobDeleteResponse)
def delete_job_for_user(
    user_id: str,
    job_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    deleted = delete_job_post(resolved_user_id, job_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Job not found.")

    return {"message": "Job deleted successfully"}


def _elapsed_ms(start_time: float) -> int:
    return round((time.perf_counter() - start_time) * 1000)
