from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.auth import get_current_user_id, resolve_user_id
from app.schemas.profile import (
    UserProfileCreate,
    UserProfileResponse,
    ResumeParseRequest,
    ResumeParseResponse,
)
from app.services.dynamodb_service import (
    save_user_profile,
    get_user_profile,
    update_user_profile,
)
from app.services.resume_parser_service import parse_resume_text
from app.services.resume_file_service import extract_resume_text_from_upload

router = APIRouter(prefix="/profile", tags=["profile"])


@router.post("", response_model=UserProfileResponse)
def create_profile(
    profile: UserProfileCreate,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    profile_dict = profile.model_dump()
    profile_dict["user_id"] = resolve_user_id(profile.user_id, auth_user_id)
    saved_profile = save_user_profile(profile_dict)

    return {
        "message": "Profile saved successfully",
        "profile": saved_profile,
    }


@router.get("/{user_id}")
def fetch_profile(
    user_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    profile = get_user_profile(resolved_user_id)

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    return profile


@router.put("/{user_id}")
def update_profile(
    user_id: str,
    profile: UserProfileCreate,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    profile_dict = profile.model_dump()
    profile_dict["user_id"] = resolved_user_id
    updated_profile = update_user_profile(resolved_user_id, profile_dict)
    return {
        "message": "Profile updated successfully",
        "profile": updated_profile,
    }


@router.post("/parse-resume", response_model=ResumeParseResponse)
def parse_resume(
    payload: ResumeParseRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(payload.user_id, auth_user_id)
    parsed = parse_resume_text(payload.resume_text)

    return {
        "user_id": resolved_user_id,
        "basic_info": parsed["basic_info"],
        "education": parsed["education"],
        "experiences": parsed["experiences"],
        "projects": parsed["projects"],
        "skills": parsed["skills"],
        "raw_text": parsed["raw_text"],
        "source_file_name": None,
    }


@router.post("/parse-resume-file", response_model=ResumeParseResponse)
async def parse_resume_file(
    user_id: str = Form(...),
    file: UploadFile = File(...),
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name.")

    allowed_extensions = (".pdf", ".docx", ".txt")
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, DOCX, or TXT file.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        extracted_text = extract_resume_text_from_upload(file.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to extract text from uploaded file.",
        )

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="We could not extract readable text from this file.",
        )

    parsed = parse_resume_text(extracted_text)

    return {
        "user_id": resolved_user_id,
        "basic_info": parsed["basic_info"],
        "education": parsed["education"],
        "experiences": parsed["experiences"],
        "projects": parsed["projects"],
        "skills": parsed["skills"],
        "raw_text": parsed["raw_text"],
        "source_file_name": file.filename,
    }
