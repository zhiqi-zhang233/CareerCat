from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user_id, resolve_user_id
from app.services.dynamodb_service import get_user_profile, get_job_posts_for_user
from app.services.fit_analysis_service import analyze_job_fit

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/fit/{user_id}")
def analyze_fit_for_user(
    user_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    profile = get_user_profile(resolved_user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    jobs = get_job_posts_for_user(resolved_user_id)

    results = [analyze_job_fit(profile, job) for job in jobs]

    return {
        "user_id": resolved_user_id,
        "fit_analyses": results,
    }
