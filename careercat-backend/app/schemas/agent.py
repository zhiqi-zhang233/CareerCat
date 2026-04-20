from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class AgentAssistRequest(BaseModel):
    user_id: str
    message: str
    current_page: str = "/"


class AgentAssistResponse(BaseModel):
    reply: str
    intent: str
    selected_tool: str
    route: str
    reason: str
    needs_user_input: bool = False
    follow_up_question: Optional[str] = None
    tool_args: Dict[str, Any] = Field(default_factory=dict)
