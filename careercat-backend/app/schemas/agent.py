from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


Locale = Literal["en", "zh"]


class AgentAssistRequest(BaseModel):
    user_id: str
    message: str
    current_page: str = "/workspace"
    # Language the user's UI is currently in. The agent will respond in this
    # language. Defaults to English when missing.
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
