import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import (
    AUTH_MODE,
    COGNITO_REGION,
    COGNITO_USER_POOL_ID,
    DEMO_AUTH_CONFIRM_ENABLED,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class DemoConfirmRequest(BaseModel):
    email: str


@router.post("/demo-confirm")
def demo_confirm_account(payload: DemoConfirmRequest):
    if AUTH_MODE != "cognito" or not DEMO_AUTH_CONFIRM_ENABLED:
        raise HTTPException(status_code=404, detail="Demo confirmation is disabled.")

    if not COGNITO_USER_POOL_ID:
        raise HTTPException(status_code=500, detail="Cognito user pool is not configured.")

    email = payload.email.strip()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    client = boto3.client("cognito-idp", region_name=COGNITO_REGION)

    try:
        client.admin_confirm_sign_up(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email,
        )
    except client.exceptions.NotAuthorizedException:
        pass
    except client.exceptions.UserNotFoundException:
        raise HTTPException(status_code=404, detail="Account was not found.")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not confirm account: {exc}")

    client.admin_update_user_attributes(
        UserPoolId=COGNITO_USER_POOL_ID,
        Username=email,
        UserAttributes=[
            {
                "Name": "email_verified",
                "Value": "true",
            }
        ],
    )

    return {
        "message": "Demo account confirmation completed. You can sign in now.",
        "email": email,
    }
