import re
from typing import Dict, List

from app.services.bedrock_service import parse_job_with_bedrock
from app.services.sponsorship_filter_service import infer_visa_sponsorship


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
    "FastAPI",
    "Django",
    "Flask",
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


def _dedupe_strings(values) -> List[str]:
    if isinstance(values, str):
        values = re.split(r",|\n|;", values)

    cleaned = []
    seen = set()

    for value in values or []:
        item = str(value or "").strip()
        key = item.lower()
        if item and key not in seen:
            cleaned.append(item)
            seen.add(key)

    return cleaned


def _normalize_string(value, default: str = "") -> str:
    return str(value or default).strip()


def _normalize_choice(value, allowed: List[str], default: str = "Unknown") -> str:
    text = _normalize_string(value, default)
    for choice in allowed:
        if text.lower() == choice.lower():
            return choice
    return default


def _extract_skills(raw_text: str) -> List[str]:
    lower_text = raw_text.lower()
    detected = []

    for skill in SKILL_KEYWORDS:
        if re.search(rf"(?<![a-zA-Z0-9]){re.escape(skill.lower())}(?![a-zA-Z0-9])", lower_text):
            detected.append(skill)

    return _dedupe_strings(detected)


def _extract_salary(raw_text: str) -> str:
    patterns = [
        r"\$\s?\d{2,3}(?:,\d{3})?\s?(?:-|–|to)\s?\$?\s?\d{2,3}(?:,\d{3})?(?:\s?/\s?(?:year|yr|hour|hr))?",
        r"\$\s?\d{2,3}(?:,\d{3})?(?:\s?/\s?(?:year|yr|hour|hr))",
    ]

    for pattern in patterns:
        match = re.search(pattern, raw_text, flags=re.IGNORECASE)
        if match:
            return match.group(0).strip()

    return ""


def _infer_work_mode(raw_text: str) -> str:
    lower = raw_text.lower()
    if "remote" in lower:
        return "Remote"
    if "hybrid" in lower:
        return "Hybrid"
    if "onsite" in lower or "on-site" in lower or "in office" in lower:
        return "Onsite"
    return "Unknown"


def _infer_employment_type(raw_text: str) -> str:
    lower = raw_text.lower()
    if "intern" in lower:
        return "Internship"
    if "contract" in lower:
        return "Contract"
    if "part-time" in lower or "part time" in lower:
        return "Part-time"
    if "temporary" in lower:
        return "Temporary"
    if "full-time" in lower or "full time" in lower:
        return "Full-time"
    return "Unknown"


def _infer_seniority(raw_text: str) -> str:
    lower = raw_text.lower()
    if "intern" in lower:
        return "Internship"
    if "entry level" in lower or "entry-level" in lower or "junior" in lower:
        return "Entry-level"
    if "senior" in lower or "sr." in lower:
        return "Senior"
    if "lead" in lower or "principal" in lower:
        return "Lead"
    if "manager" in lower:
        return "Manager"
    if "mid level" in lower or "mid-level" in lower:
        return "Mid-level"
    return "Unknown"


def _infer_visa_sponsorship(raw_text: str) -> str:
    return infer_visa_sponsorship(raw_text)


def _rule_based_parse_job_text(raw_text: str) -> Dict:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    title = lines[0] if lines else "Unknown Title"

    return {
        "company": "",
        "title": title,
        "location": "",
        "work_mode": _infer_work_mode(raw_text),
        "employment_type": _infer_employment_type(raw_text),
        "seniority": _infer_seniority(raw_text),
        "visa_sponsorship": _infer_visa_sponsorship(raw_text),
        "salary_range": _extract_salary(raw_text),
        "posting_date": "",
        "required_skills": _extract_skills(raw_text),
        "preferred_skills": [],
        "requirements": [],
        "responsibilities": [],
        "summary": raw_text.strip(),
    }


def _normalize_job_result(parsed: Dict, raw_text: str) -> Dict:
    return {
        "company": _normalize_string(parsed.get("company")),
        "title": _normalize_string(parsed.get("title"), "Unknown Title"),
        "location": _normalize_string(parsed.get("location")),
        "work_mode": _normalize_choice(
            parsed.get("work_mode"), ["Remote", "Hybrid", "Onsite", "Unknown"]
        ),
        "employment_type": _normalize_choice(
            parsed.get("employment_type"),
            ["Full-time", "Part-time", "Internship", "Contract", "Temporary", "Unknown"],
        ),
        "seniority": _normalize_choice(
            parsed.get("seniority"),
            ["Internship", "Entry-level", "Mid-level", "Senior", "Lead", "Manager", "Unknown"],
        ),
        "visa_sponsorship": _normalize_choice(
            parsed.get("visa_sponsorship"), ["Yes", "No", "Unknown"]
        ),
        "salary_range": _normalize_string(parsed.get("salary_range")),
        "posting_date": _normalize_string(parsed.get("posting_date")),
        "required_skills": _dedupe_strings(parsed.get("required_skills", [])),
        "preferred_skills": _dedupe_strings(parsed.get("preferred_skills", [])),
        "requirements": _dedupe_strings(parsed.get("requirements", [])),
        "responsibilities": _dedupe_strings(parsed.get("responsibilities", [])),
        "summary": _normalize_string(parsed.get("summary"), raw_text.strip()),
    }


def _has_meaningful_ai_result(parsed: Dict) -> bool:
    return any(
        [
            parsed.get("company"),
            parsed.get("title") and parsed.get("title") != "Unknown Title",
            parsed.get("location"),
            len(parsed.get("required_skills", [])) > 0,
            parsed.get("summary"),
        ]
    )


def parse_job_text(raw_text: str) -> Dict:
    try:
        ai_result = parse_job_with_bedrock(raw_text)
        normalized_ai_result = _normalize_job_result(ai_result, raw_text)

        if _has_meaningful_ai_result(normalized_ai_result):
            return normalized_ai_result
    except Exception as e:
        print(f"[Job Parser] Bedrock parse failed, using fallback parser. Error: {e}")

    fallback_result = _rule_based_parse_job_text(raw_text)
    return _normalize_job_result(fallback_result, raw_text)
