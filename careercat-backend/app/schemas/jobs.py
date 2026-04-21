from typing import List, Optional

from pydantic import BaseModel, Field


class JobImportRequest(BaseModel):
    user_id: str
    raw_job_text: str
    force_save: bool = False


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


class JobDraft(BaseModel):
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
    summary: str = ""
    raw_job_text: str = ""
    status: str = "not_applied"
    application_date: str = ""
    notes: str = ""


class JobParseRequest(BaseModel):
    user_id: str
    raw_job_text: str


class JobCreateRequest(JobDraft):
    force_save: bool = False


class JobUpdateRequest(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    employment_type: Optional[str] = None
    seniority: Optional[str] = None
    visa_sponsorship: Optional[str] = None
    salary_range: Optional[str] = None
    posting_date: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    summary: Optional[str] = None
    raw_job_text: Optional[str] = None
    status: Optional[str] = None
    application_date: Optional[str] = None
    notes: Optional[str] = None


class JobImportResponse(BaseModel):
    message: str
    parsed_job: ParsedJob
    blocked: bool = False
    warning: Optional[str] = None


class JobUpdateResponse(BaseModel):
    message: str
    job: ParsedJob


class JobDeleteResponse(BaseModel):
    message: str
