from fastapi import APIRouter
from app.config import (
    AWS_REGION,
    DYNAMODB_USER_PROFILES_TABLE,
    DYNAMODB_JOB_POSTS_TABLE,
    BEDROCK_REGION,
    BEDROCK_MODEL_ID,
)

router = APIRouter(prefix="/debug", tags=["debug"])


@router.get("/config")
def debug_config():
    return {
        "AWS_REGION": AWS_REGION,
        "DYNAMODB_USER_PROFILES_TABLE": DYNAMODB_USER_PROFILES_TABLE,
        "DYNAMODB_JOB_POSTS_TABLE": DYNAMODB_JOB_POSTS_TABLE,
        "BEDROCK_REGION": BEDROCK_REGION,
        "BEDROCK_MODEL_ID": BEDROCK_MODEL_ID,
    }