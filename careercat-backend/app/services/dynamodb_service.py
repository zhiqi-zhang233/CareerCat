import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone

from app.config import (
    AWS_REGION,
    DYNAMODB_AGENT_RUNS_TABLE,
    DYNAMODB_COACH_SESSIONS_TABLE,
    DYNAMODB_USER_PROFILES_TABLE,
    DYNAMODB_JOB_POSTS_TABLE,
)

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

user_profiles_table = dynamodb.Table(DYNAMODB_USER_PROFILES_TABLE)
job_posts_table = dynamodb.Table(DYNAMODB_JOB_POSTS_TABLE)
agent_runs_table = dynamodb.Table(DYNAMODB_AGENT_RUNS_TABLE)
coach_sessions_table = dynamodb.Table(DYNAMODB_COACH_SESSIONS_TABLE)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_user_profile(profile_data: dict):
    existing = get_user_profile(profile_data["user_id"])

    item = {
        **profile_data,
        "updated_at": _utc_now_iso(),
    }

    if existing:
        item["created_at"] = existing.get("created_at", _utc_now_iso())
    else:
        item["created_at"] = _utc_now_iso()

    user_profiles_table.put_item(Item=item)
    return item


def update_user_profile(user_id: str, profile_data: dict):
    existing = get_user_profile(user_id)

    item = {
        **profile_data,
        "user_id": user_id,
        "updated_at": _utc_now_iso(),
    }

    if existing:
        item["created_at"] = existing.get("created_at", _utc_now_iso())
    else:
        item["created_at"] = _utc_now_iso()

    user_profiles_table.put_item(Item=item)
    return item


def get_user_profile(user_id: str):
    response = user_profiles_table.get_item(Key={"user_id": user_id})
    return response.get("Item")


def save_job_post(job_data: dict):
    item = {
        **job_data,
        "updated_at": _utc_now_iso(),
    }

    if not item.get("created_at"):
        item["created_at"] = _utc_now_iso()

    job_posts_table.put_item(Item=item)
    return item


def get_job_posts_for_user(user_id: str):
    response = job_posts_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id)
    )
    return response.get("Items", [])


def get_job_post_by_id(user_id: str, job_id: str):
    response = job_posts_table.get_item(
        Key={
            "user_id": user_id,
            "job_id": job_id,
        }
    )
    return response.get("Item")


def update_job_post(user_id: str, job_id: str, updates: dict):
    existing = get_job_post_by_id(user_id, job_id)

    if not existing:
        return None

    clean_updates = {
        key: value
        for key, value in updates.items()
        if value is not None and key not in {"user_id", "job_id", "created_at"}
    }

    item = {
        **existing,
        **clean_updates,
        "user_id": user_id,
        "job_id": job_id,
        "created_at": existing.get("created_at", _utc_now_iso()),
        "updated_at": _utc_now_iso(),
    }

    job_posts_table.put_item(Item=item)
    return item


def delete_job_post(user_id: str, job_id: str):
    existing = get_job_post_by_id(user_id, job_id)

    if not existing:
        return False

    job_posts_table.delete_item(
        Key={
            "user_id": user_id,
            "job_id": job_id,
        }
    )
    return True


def save_agent_run(run_data: dict):
    item = {
        **run_data,
        "created_at": run_data.get("created_at") or _utc_now_iso(),
    }

    agent_runs_table.put_item(Item=item)
    return item


def get_agent_runs_for_user(user_id: str, limit: int = 50):
    response = agent_runs_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id),
        ScanIndexForward=False,
        Limit=limit,
    )
    return response.get("Items", [])


def save_coach_session(session_data: dict):
    existing = get_coach_session_by_id(
        session_data["user_id"],
        session_data["session_id"],
    )

    item = {
        **session_data,
        "updated_at": _utc_now_iso(),
    }

    if existing:
        item["created_at"] = existing.get(
            "created_at",
            session_data.get("created_at") or _utc_now_iso(),
        )
    else:
        item["created_at"] = session_data.get("created_at") or _utc_now_iso()

    coach_sessions_table.put_item(Item=item)
    return item


def get_coach_sessions_for_user(user_id: str):
    response = coach_sessions_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id)
    )
    sessions = response.get("Items", [])
    return sorted(
        sessions,
        key=lambda session: session.get("updated_at") or session.get("created_at") or "",
        reverse=True,
    )


def get_coach_session_by_id(user_id: str, session_id: str):
    response = coach_sessions_table.get_item(
        Key={
            "user_id": user_id,
            "session_id": session_id,
        }
    )
    return response.get("Item")


def delete_coach_session(user_id: str, session_id: str):
    existing = get_coach_session_by_id(user_id, session_id)
    if not existing:
        return False

    coach_sessions_table.delete_item(
        Key={
            "user_id": user_id,
            "session_id": session_id,
        }
    )
    return True
