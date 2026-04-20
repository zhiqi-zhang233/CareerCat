from functools import lru_cache

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.config import (
    AUTH_MODE,
    COGNITO_APP_CLIENT_ID,
    COGNITO_REGION,
    COGNITO_USER_POOL_ID,
)


@lru_cache(maxsize=1)
def _jwk_client():
    jwks_url = (
        f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/"
        f"{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    )
    return PyJWKClient(jwks_url)


def get_current_user_id(authorization: str | None = Header(default=None)):
    if AUTH_MODE == "local":
        return None

    if AUTH_MODE != "cognito":
        raise HTTPException(status_code=500, detail="Unsupported AUTH_MODE.")

    if not COGNITO_USER_POOL_ID or not COGNITO_APP_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Cognito is not configured.")

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing authentication token.")

    token = authorization.split(" ", 1)[1].strip()
    issuer = (
        f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/"
        f"{COGNITO_USER_POOL_ID}"
    )

    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID,
            issuer=issuer,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token is missing user identity.")

    return user_id


def resolve_user_id(requested_user_id: str, auth_user_id: str | None):
    if AUTH_MODE == "local":
        return requested_user_id

    if requested_user_id and requested_user_id != auth_user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data.")

    if not auth_user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")

    return auth_user_id
