from pydantic import BaseModel
from typing import List, Optional


class BasicContactInfo(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""


class EducationEntry(BaseModel):
    school_name: str = ""
    degree: str = ""
    major: str = ""
    start_date: str = ""
    end_date: str = ""
    details: str = ""


class ExperienceEntry(BaseModel):
    company_name: str = ""
    employment_type: str = ""
    job_title: str = ""
    start_date: str = ""
    end_date: str = ""
    details: str = ""


class ProjectEntry(BaseModel):
    project_name: str = ""
    project_role: str = ""
    start_date: str = ""
    end_date: str = ""
    details: str = ""


class UserProfileCreate(BaseModel):
    user_id: str
    basic_info: BasicContactInfo
    resume_text: str
    education: List[EducationEntry]
    experiences: List[ExperienceEntry]
    projects: List[ProjectEntry]
    target_roles: List[str]
    preferred_locations: List[str]
    sponsorship_need: bool
    known_skills: List[str]


class UserProfileResponse(BaseModel):
    message: str
    profile: UserProfileCreate


class ResumeParseRequest(BaseModel):
    user_id: str
    resume_text: str


class ResumeParseResponse(BaseModel):
    user_id: str
    basic_info: BasicContactInfo
    education: List[EducationEntry]
    experiences: List[ExperienceEntry]
    projects: List[ProjectEntry]
    skills: List[str]
    raw_text: str
    source_file_name: Optional[str] = None