from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_user_id, resolve_user_id
from app.services.dynamodb_service import get_user_profile
from app.services.recommend_service import recommend_jobs_from_profile

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.get("/{user_id}")
def recommend_jobs(
    user_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    profile = get_user_profile(resolved_user_id)

    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")

    recommendation_result = recommend_jobs_from_profile(profile)

    return {
        "user_id": resolved_user_id,
        "recommended_jobs": recommendation_result["recommended_jobs"],
        "matched_skills": recommendation_result["matched_skills"],
    }
