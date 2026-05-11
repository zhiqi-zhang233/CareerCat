from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_user_id, resolve_user_id
from app.schemas.workflows import (
    WorkflowHistoriesResponse,
    WorkflowHistoryResponse,
    WorkflowHistoryUpsertRequest,
)
from app.services.dynamodb_service import (
    delete_workflow_history,
    get_workflow_histories_for_user,
    save_workflow_history,
)

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/history/{user_id}", response_model=WorkflowHistoriesResponse)
def get_workflow_history(
    user_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    workflows = get_workflow_histories_for_user(resolved_user_id)

    return {
        "user_id": resolved_user_id,
        "workflows": workflows,
    }


@router.put("/history/{user_id}/{workflow_id}", response_model=WorkflowHistoryResponse)
def upsert_workflow_history(
    user_id: str,
    workflow_id: str,
    payload: WorkflowHistoryUpsertRequest,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)

    if payload.user_id and payload.user_id != resolved_user_id:
        raise HTTPException(status_code=403, detail="Cannot save another user's workflow.")

    if payload.workflow_id != workflow_id:
        raise HTTPException(status_code=400, detail="Workflow id mismatch.")

    workflow = save_workflow_history(
        {
            **payload.model_dump(),
            "user_id": resolved_user_id,
            "workflow_id": workflow_id,
        }
    )

    return {
        "message": "Workflow history saved successfully",
        "workflow": workflow,
    }


@router.delete("/history/{user_id}/{workflow_id}")
def delete_workflow_history_for_user(
    user_id: str,
    workflow_id: str,
    auth_user_id: str | None = Depends(get_current_user_id),
):
    resolved_user_id = resolve_user_id(user_id, auth_user_id)
    deleted = delete_workflow_history(resolved_user_id, workflow_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow history not found.")

    return {"message": "Workflow history deleted successfully"}
