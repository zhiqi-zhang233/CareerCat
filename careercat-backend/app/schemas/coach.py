from typing import List, Literal, Optional

from pydantic import BaseModel, Field


Locale = Literal["en", "zh"]


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
    locale: Optional[Locale] = "en"


class CoachChatResponse(BaseModel):
    reply: str


class CoachSession(BaseModel):
    user_id: str
    session_id: str
    title: str
    mode: str
    subtype: Optional[str] = None
    job_id: Optional[str] = None
    focus_topic: Optional[str] = None
    messages: List[CoachMessage] = Field(default_factory=list)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CoachSessionUpsertRequest(CoachSession):
    pass


class CoachSessionResponse(BaseModel):
    message: str
    session: CoachSession


class CoachSessionsResponse(BaseModel):
    user_id: str
    sessions: List[CoachSession] = Field(default_factory=list)
