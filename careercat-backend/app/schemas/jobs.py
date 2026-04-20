from typing import List, Optional

from pydantic import BaseModel, Field


class JobImportRequest(BaseModel):
    user_id: str
    raw_job_text: str
    force_save: bool = False


class JobUpdateRequest(BaseModel):
    status: Optional[str] = None
    application_date: Optional[str] = None
    notes: Optional[str] = None


class ParsedJob(BaseModel):
    job_id: str
    user_id: str
    company: str = ""
    title: str
    location: str = ""
    work_mode: str = "Unknown"
    employment_type: str = "Unknown"
    seniority: str = "Unknown"
    visa_sponsorship: str = "Unknown"
    salary_range: str = ""
    posting_date: str = ""
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    summary: str
    raw_job_text: str = ""
    status: str = "not_applied"
    application_date: str = ""
    notes: str = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class JobImportResponse(BaseModel):
    message: str
    parsed_job: ParsedJob
    blocked: bool = False
    warning: Optional[str] = None


class JobUpdateResponse(BaseModel):
    message: str
    job: ParsedJob
