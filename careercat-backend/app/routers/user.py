import secrets
import boto3
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user_id
from app.config import (
    AUTH_MODE,
    COGNITO_APP_CLIENT_ID,
    COGNITO_REGION,
    COGNITO_USER_POOL_ID,
)
from app.services.dynamodb_service import delete_all_user_data

router = APIRouter(prefix="/user", tags=["user"])


def _require_cognito():
    if AUTH_MODE != "cognito" or not COGNITO_USER_POOL_ID or not COGNITO_APP_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Account deletion requires Cognito auth mode.")


def _cognito_client():
    return boto3.client("cognito-idp", region_name=COGNITO_REGION)


class RequestDeletionBody(BaseModel):
    email: str


class ConfirmDeletionBody(BaseModel):
    email: str
    code: str


@router.post("/request-deletion")
def request_deletion(
    body: RequestDeletionBody,
    auth_user_id: str = Depends(get_current_user_id),
):
    """Send a verification code to the user's email before account deletion."""
    _require_cognito()
    if not auth_user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        client = _cognito_client()
        client.forgot_password(
            ClientId=COGNITO_APP_CLIENT_ID,
            Username=body.email,
        )
    except client.exceptions.UserNotFoundException:
        raise HTTPException(status_code=404, detail="User not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"message": "Verification code sent."}


@router.delete("")
def delete_account(
    body: ConfirmDeletionBody,
    auth_user_id: str = Depends(get_current_user_id),
):
    """Verify code and permanently delete the account and all data."""
    _require_cognito()
    if not auth_user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")

    client = _cognito_client()

    # Verify the code by using it to set a random temporary password.
    # If the code is wrong Cognito raises CodeMismatchException.
    temp_password = "Tmp!" + secrets.token_urlsafe(12)
    try:
        client.confirm_forgot_password(
            ClientId=COGNITO_APP_CLIENT_ID,
            Username=body.email,
            ConfirmationCode=body.code,
            Password=temp_password,
        )
    except client.exceptions.CodeMismatchException:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    except client.exceptions.ExpiredCodeException:
        raise HTTPException(status_code=400, detail="Verification code has expired.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Delete all DynamoDB data first, then the Cognito user.
    try:
        delete_all_user_data(auth_user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user data: {e}")

    try:
        client.admin_delete_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=body.email,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete Cognito user: {e}")

    return {"message": "Account permanently deleted."}
