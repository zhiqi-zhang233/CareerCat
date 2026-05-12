import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone

from app.config import (
    AWS_REGION,
    DYNAMODB_AGENT_RUNS_TABLE,
    DYNAMODB_COACH_SESSIONS_TABLE,
    DYNAMODB_WORKFLOW_HISTORIES_TABLE,
    DYNAMODB_USER_PROFILES_TABLE,
    DYNAMODB_JOB_POSTS_TABLE,
)

dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)

user_profiles_table = dynamodb.Table(DYNAMODB_USER_PROFILES_TABLE)
job_posts_table = dynamodb.Table(DYNAMODB_JOB_POSTS_TABLE)
agent_runs_table = dynamodb.Table(DYNAMODB_AGENT_RUNS_TABLE)
coach_sessions_table = dynamodb.Table(DYNAMODB_COACH_SESSIONS_TABLE)
workflow_histories_table = dynamodb.Table(DYNAMODB_WORKFLOW_HISTORIES_TABLE)


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


def save_workflow_history(workflow_data: dict):
    existing = get_workflow_history_by_id(
        workflow_data["user_id"],
        workflow_data["workflow_id"],
    )

    item = {
        **workflow_data,
        "updated_at": _utc_now_iso(),
    }

    if existing:
        item["created_at"] = existing.get(
            "created_at",
            workflow_data.get("created_at") or _utc_now_iso(),
        )
    else:
        item["created_at"] = workflow_data.get("created_at") or _utc_now_iso()

    workflow_histories_table.put_item(Item=item)
    return item


def get_workflow_histories_for_user(user_id: str):
    response = workflow_histories_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id)
    )
    histories = response.get("Items", [])
    return sorted(
        histories,
        key=lambda history: history.get("updated_at") or history.get("created_at") or "",
        reverse=True,
    )


def get_workflow_history_by_id(user_id: str, workflow_id: str):
    response = workflow_histories_table.get_item(
        Key={
            "user_id": user_id,
            "workflow_id": workflow_id,
        }
    )
    return response.get("Item")


def delete_workflow_history(user_id: str, workflow_id: str):
    existing = get_workflow_history_by_id(user_id, workflow_id)
    if not existing:
        return False

    workflow_histories_table.delete_item(
        Key={
            "user_id": user_id,
            "workflow_id": workflow_id,
        }
    )
    return True


def delete_all_user_data(user_id: str) -> dict:
    """Delete every record belonging to user_id across all tables."""
    counts = {"user_profiles": 0, "job_posts": 0, "agent_runs": 0,
               "coach_sessions": 0, "workflow_histories": 0}

    # UserProfiles (PK only)
    if get_user_profile(user_id):
        user_profiles_table.delete_item(Key={"user_id": user_id})
        counts["user_profiles"] = 1

    def _delete_all(table, items: list, key_fn):
        for item in items:
            table.delete_item(Key=key_fn(item))
        return len(items)

    counts["job_posts"] = _delete_all(
        job_posts_table,
        get_job_posts_for_user(user_id),
        lambda i: {"user_id": user_id, "job_id": i["job_id"]},
    )
    counts["agent_runs"] = _delete_all(
        agent_runs_table,
        agent_runs_table.query(KeyConditionExpression=Key("user_id").eq(user_id)).get("Items", []),
        lambda i: {"user_id": user_id, "run_id": i["run_id"]},
    )
    counts["coach_sessions"] = _delete_all(
        coach_sessions_table,
        get_coach_sessions_for_user(user_id),
        lambda i: {"user_id": user_id, "session_id": i["session_id"]},
    )
    counts["workflow_histories"] = _delete_all(
        workflow_histories_table,
        get_workflow_histories_for_user(user_id),
        lambda i: {"user_id": user_id, "workflow_id": i["workflow_id"]},
    )

    return counts
