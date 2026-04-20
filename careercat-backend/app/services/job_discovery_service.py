from uuid import uuid4
import re

from app.services.adzuna_service import search_adzuna_jobs
from app.services.sponsorship_filter_service import (
    infer_visa_sponsorship,
    should_block_for_sponsorship,
)


SKILL_KEYWORDS = [
    "Python",
    "SQL",
    "Machine Learning",
    "Deep Learning",
    "Statistics",
    "Data Analysis",
    "R",
    "Excel",
    "Tableau",
    "Power BI",
    "Spark",
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Java",
    "C++",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "DynamoDB",
    "Git",
    "NLP",
    "LLM",
    "Bedrock",
]


def _extract_skills(text: str):
    lower_text = text.lower()
    return sorted(
        {
            skill
            for skill in SKILL_KEYWORDS
            if re.search(rf"(?<![a-zA-Z0-9]){re.escape(skill.lower())}(?![a-zA-Z0-9])", lower_text)
        }
    )


def _format_salary(job: dict):
    salary_min = job.get("salary_min")
    salary_max = job.get("salary_max")

    if salary_min and salary_max:
        return f"${int(salary_min):,} - ${int(salary_max):,}"

    if salary_min:
        return f"${int(salary_min):,}+"

    if salary_max:
        return f"Up to ${int(salary_max):,}"

    return ""


def _infer_work_mode(text: str):
    lower = text.lower()
    if "remote" in lower:
        return "Remote"
    if "hybrid" in lower:
        return "Hybrid"
    if "onsite" in lower or "on-site" in lower:
        return "Onsite"
    return "Unknown"


def _map_contract_time(value: str | None):
    if value == "full_time":
        return "Full-time"
    if value == "part_time":
        return "Part-time"
    return "Unknown"


def _infer_visa_sponsorship(text: str):
    return infer_visa_sponsorship(text)


def _location_display(job: dict):
    location = job.get("location") or {}
    return location.get("display_name") or ", ".join(location.get("area", []) or [])


def _company_display(job: dict):
    company = job.get("company") or {}
    return company.get("display_name") or ""


def _score_job(profile: dict, job: dict, skills: list[str], keywords: str):
    user_skills = {
        skill.lower()
        for skill in profile.get("known_skills", [])
    }
    target_roles = [
        role.lower()
        for role in profile.get("target_roles", [])
    ]
    preferred_locations = [
        location.lower()
        for location in profile.get("preferred_locations", [])
    ]

    title = (job.get("title") or "").lower()
    location = _location_display(job).lower()
    description = (job.get("description") or "").lower()
    keyword_terms = [
        term.strip().lower()
        for term in keywords.replace(",", " ").split()
        if term.strip()
    ]
    job_skills = {skill.lower() for skill in skills}

    score = 35
    reasons = []

    matched_skills = sorted(user_skills.intersection(job_skills))
    if matched_skills:
        score += min(30, len(matched_skills) * 8)
        reasons.append(f"Matches skills: {', '.join(matched_skills[:5])}")

    if any(role and role in title for role in target_roles):
        score += 20
        reasons.append("Matches one of your target roles.")

    if any(term in title or term in description for term in keyword_terms):
        score += 10
        reasons.append("Matches your search keywords.")

    if any(loc and loc in location for loc in preferred_locations):
        score += 10
        reasons.append("Matches your preferred location.")

    missing_skills = sorted(job_skills.difference(user_skills))

    return {
        "match_score": min(score, 100),
        "match_reasons": reasons or ["Matches the search criteria."],
        "missing_skills": missing_skills,
    }


def discover_adzuna_jobs(profile: dict, request_data: dict):
    adzuna_jobs = search_adzuna_jobs(
        keywords=request_data["keywords"],
        location=request_data.get("location", ""),
        country=request_data.get("country", "us"),
        posted_within_days=request_data.get("posted_within_days", 7),
        results_per_page=request_data.get("results_per_page", 20),
        remote_only=request_data.get("remote_only", False),
        salary_min=request_data.get("salary_min"),
    )

    recommendations = []
    needs_sponsorship = bool(profile.get("sponsorship_need"))

    for job in adzuna_jobs:
        description = job.get("description") or ""
        title = job.get("title") or "Unknown Title"
        company = _company_display(job)
        location = _location_display(job)
        visa_sponsorship = _infer_visa_sponsorship(" ".join([title, description]))

        if should_block_for_sponsorship(needs_sponsorship, visa_sponsorship):
            continue

        skills = _extract_skills(" ".join([title, description]))
        score_info = _score_job(
            profile,
            job,
            skills,
            request_data["keywords"],
        )

        raw_text = "\n".join(
            [
                title,
                f"Company: {company}",
                f"Location: {location}",
                description,
            ]
        ).strip()

        recommendations.append(
            {
                "recommendation_id": str(uuid4()),
                "source": "adzuna",
                "source_job_id": str(job.get("id") or ""),
                "external_url": job.get("redirect_url") or "",
                "company": company,
                "title": title,
                "location": location,
                "work_mode": _infer_work_mode(" ".join([title, location, description])),
                "employment_type": _map_contract_time(job.get("contract_time")),
                "seniority": "Unknown",
                "visa_sponsorship": visa_sponsorship,
                "salary_range": _format_salary(job),
                "posting_date": job.get("created") or "",
                "required_skills": skills,
                "preferred_skills": [],
                "requirements": [],
                "responsibilities": [],
                "summary": description,
                "raw_job_text": raw_text,
                **score_info,
            }
        )

    return sorted(
        recommendations,
        key=lambda recommendation: recommendation["match_score"],
        reverse=True,
    )
