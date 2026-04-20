from typing import List, Optional

from pydantic import BaseModel, Field


class CoachMessage(BaseModel):
    role: str
    content: str


class CoachChatRequest(BaseModel):
    user_id: str
    mode: str
    subtype: Optional[str] = None
    job_id: Optional[str] = None
    focus_topic: Optional[str] = None
    messages: List[CoachMessage] = Field(default_factory=list)


class CoachChatResponse(BaseModel):
    reply: str
