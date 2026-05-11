from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class WorkflowChatMessage(BaseModel):
    id: str
    role: str
    content: str
    plan: Optional[Dict[str, Any]] = None


class WorkflowHistory(BaseModel):
    user_id: str
    workflow_id: str
    title: str
    messages: List[WorkflowChatMessage] = Field(default_factory=list)
    plan: Dict[str, Any] = Field(default_factory=dict)
    completed_task_ids: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class WorkflowHistoryUpsertRequest(WorkflowHistory):
    pass


class WorkflowHistoryResponse(BaseModel):
    message: str
    workflow: WorkflowHistory


class WorkflowHistoriesResponse(BaseModel):
    user_id: str
    workflows: List[WorkflowHistory] = Field(default_factory=list)
