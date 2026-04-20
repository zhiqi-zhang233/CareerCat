from typing import List, Optional

from pydantic import BaseModel, Field


class JobDiscoveryRequest(BaseModel):
    user_id: str
    keywords: str
    location: str = ""
    country: str = "us"
    posted_within_days: int = 7
    results_per_page: int = 20
    remote_only: bool = False
    salary_min: Optional[int] = None


class JobRecommendation(BaseModel):
    recommendation_id: str
    source: str
    source_job_id: str
    external_url: str = ""
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
    match_score: int = 0
    match_reasons: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)


class JobDiscoveryResponse(BaseModel):
    user_id: str
    recommendations: List[JobRecommendation]


class SaveRecommendationRequest(BaseModel):
    user_id: str
    recommendation: JobRecommendation
