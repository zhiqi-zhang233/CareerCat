from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


Locale = Literal["en", "zh"]

InlineActionType = Literal["file_upload", "navigate", "quick_select", "confirm_or_continue"]


class InlineActionOption(BaseModel):
    label: str
    value: str


class InlineAction(BaseModel):
    id: str
    type: InlineActionType
    label: str = ""
    # file_upload
    accept: Optional[str] = None
    # navigate
    target: Optional[str] = None
    # quick_select
    options: Optional[List[InlineActionOption]] = None
    # confirm_or_continue
    confirm_label: Optional[str] = None
    confirm_route: Optional[str] = None
    continue_label: Optional[str] = None
    # flow
    depends_on: Optional[str] = None
    on_complete: Optional[str] = None


class AgentAssistRequest(BaseModel):
    user_id: str
    message: str
    current_page: str = "/workspace"
    locale: Optional[Locale] = "en"


class AgentAssistResponse(BaseModel):
    reply: str
    intent: str
    selected_tool: str
    route: str
    reason: str
    needs_user_input: bool = False
    follow_up_question: Optional[str] = None
    tool_args: Dict[str, Any] = Field(default_factory=dict)
    workflow_goal: str = ""
    current_stage_id: str = ""
    stages: list[Dict[str, Any]] = Field(default_factory=list)
    suggested_actions: list[Dict[str, Any]] = Field(default_factory=list)
    inline_actions: List[InlineAction] = Field(default_factory=list)
    harness: Dict[str, Any] = Field(default_factory=dict)
