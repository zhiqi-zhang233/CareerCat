import re
from typing import Dict, List

from app.services.bedrock_service import parse_resume_with_bedrock


SKILL_KEYWORDS = [
    "Python",
    "SQL",
    "Machine Learning",
    "Deep Learning",
    "PyTorch",
    "TensorFlow",
    "Pandas",
    "NumPy",
    "Scikit-learn",
    "R",
    "Excel",
    "Tableau",
    "Power BI",
    "Spark",
    "Hadoop",
    "AWS",
    "Docker",
    "Kubernetes",
    "FastAPI",
    "Flask",
    "Django",
    "Java",
    "C++",
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "MongoDB",
    "MySQL",
    "PostgreSQL",
    "DynamoDB",
    "Git",
    "NLP",
    "LLM",
    "Bedrock",
]

DEGREE_HINTS = [
    "bachelor",
    "master",
    "phd",
    "doctor",
    "b.s",
    "b.a",
    "m.s",
    "m.a",
    "mba",
    "bs ",
    "ba ",
    "ms ",
    "ma ",
]

SECTION_KEYWORDS = {
    "education": ["education", "academic background"],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "internship",
        "internships",
        "employment",
    ],
    "projects": [
        "projects",
        "project experience",
        "selected projects",
        "academic projects",
    ],
    "skills": ["skills", "technical skills"],
}


def _normalize_lines(text: str) -> List[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def _clean_for_section_match(line: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z ]", " ", line).lower()
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _is_section_header(line: str, keywords: List[str]) -> bool:
    cleaned = _clean_for_section_match(line)

    if not cleaned:
        return False

    for keyword in keywords:
        if cleaned == keyword:
            return True
        if keyword in cleaned and len(cleaned.split()) <= 4:
            return True

    return False


def _find_section_ranges(lines: List[str]) -> Dict[str, tuple[int, int]]:
    section_positions: List[tuple[str, int]] = []

    for idx, line in enumerate(lines):
        for section_name, keywords in SECTION_KEYWORDS.items():
            if _is_section_header(line, keywords):
                section_positions.append((section_name, idx))
                break

    ranges: Dict[str, tuple[int, int]] = {}
    for i, (section_name, start_idx) in enumerate(section_positions):
        end_idx = len(lines)
        if i + 1 < len(section_positions):
            end_idx = section_positions[i + 1][1]
        ranges[section_name] = (start_idx + 1, end_idx)

    return ranges


def _get_section_lines(lines: List[str], section_name: str) -> List[str]:
    ranges = _find_section_ranges(lines)
    if section_name not in ranges:
        return []
    start_idx, end_idx = ranges[section_name]
    return lines[start_idx:end_idx]


def _extract_email(text: str) -> str:
    match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    return match.group(0) if match else ""


def _extract_phone(text: str) -> str:
    match = re.search(r"(\+?\d[\d\-\(\) ]{7,}\d)", text)
    return match.group(0).strip() if match else ""


def _extract_location(text: str) -> str:
    lines = _normalize_lines(text)[:10]
    pattern = re.compile(r"[A-Za-z .'-]+,\s?[A-Z]{2}")
    for line in lines:
        match = pattern.search(line)
        if match:
            return match.group(0)
    return ""


def _extract_name(text: str) -> str:
    lines = _normalize_lines(text)
    if not lines:
        return ""

    for line in lines[:6]:
        lower = line.lower()
        if "@" in line or "linkedin" in lower or "github" in lower:
            continue
        if re.search(r"\d", line):
            continue
        if len(line.split()) <= 6:
            return line
    return lines[0]


def _extract_date_range(text: str) -> tuple[str, str]:
    pattern = re.search(
        r"((?:Spring|Summer|Fall|Winter)\s+\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\b\d{4})\s*(?:–|-|—|to)\s*((?:Present|Current|Now|(?:Spring|Summer|Fall|Winter)\s+\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\b\d{4}))",
        text,
        flags=re.IGNORECASE,
    )
    if pattern:
        return pattern.group(1).strip(), pattern.group(2).strip()
    return "", ""


def _extract_skills(text: str) -> List[str]:
    lower_text = text.lower()
    found_skills = []

    for skill in SKILL_KEYWORDS:
        if skill.lower() in lower_text:
            found_skills.append(skill)

    return sorted(list(set(found_skills)))


def _looks_like_new_entry(line: str) -> bool:
    if line.startswith(("•", "-", "*")):
        return False

    if len(line) <= 120:
        return True

    return False


def _group_entries(section_lines: List[str]) -> List[List[str]]:
    if not section_lines:
        return []

    groups: List[List[str]] = []
    current: List[str] = []

    for line in section_lines:
        if not current:
            current = [line]
            continue

        if _looks_like_new_entry(line):
            groups.append(current)
            current = [line]
        else:
            current.append(line)

    if current:
        groups.append(current)

    merged_groups: List[List[str]] = []
    for group in groups:
        if merged_groups and len(group) == 1 and len(group[0]) < 35:
            merged_groups[-1].extend(group)
        else:
            merged_groups.append(group)

    return merged_groups


def _split_header_parts(line: str) -> List[str]:
    parts = re.split(r"\s{2,}|\s+\|\s+|\s+•\s+|[|•]", line)
    return [p.strip(" |-•") for p in parts if p.strip(" |-•")]


def _parse_education(lines: List[str]) -> List[Dict]:
    section_lines = _get_section_lines(lines, "education")
    groups = _group_entries(section_lines)
    results: List[Dict] = []

    for group in groups:
        header = group[0]
        details_lines = [line.lstrip("•-* ").strip() for line in group[1:]]
        combined = " ".join(group)

        school_name = ""
        degree = ""
        major = ""
        start_date = ""
        end_date = ""

        header_parts = _split_header_parts(header)

        if header_parts:
            school_name = header_parts[0]

        for part in header_parts[1:]:
            lower = part.lower()
            if any(hint in lower for hint in DEGREE_HINTS):
                if not degree:
                    degree = part
            elif not major and not re.search(r"\d{4}", part):
                major = part

        if not degree:
            for line in group:
                lower = line.lower()
                if any(hint in lower for hint in DEGREE_HINTS):
                    degree = line
                    break

        start_date, end_date = _extract_date_range(combined)

        results.append(
            {
                "school_name": school_name,
                "degree": degree,
                "major": major,
                "start_date": start_date,
                "end_date": end_date,
                "details": " ".join(details_lines).strip(),
            }
        )

    return [r for r in results if any(str(v).strip() for v in r.values())]


def _infer_employment_type(text: str) -> str:
    lower = text.lower()
    if "intern" in lower:
        return "Internship"
    if "research" in lower:
        return "Research"
    if "teaching assistant" in lower or "assistantship" in lower:
        return "Assistantship"
    if "part-time" in lower or "part time" in lower:
        return "Part-time"
    if "full-time" in lower or "full time" in lower:
        return "Full-time"
    return ""


def _parse_experiences(lines: List[str]) -> List[Dict]:
    section_lines = _get_section_lines(lines, "experience")
    groups = _group_entries(section_lines)
    results: List[Dict] = []

    for group in groups:
        header = group[0]
        details_lines = [line.lstrip("•-* ").strip() for line in group[1:]]
        combined = " ".join(group)

        company_name = ""
        employment_type = ""
        job_title = ""
        start_date = ""
        end_date = ""

        header_parts = _split_header_parts(header)

        if header_parts:
            company_name = header_parts[0]

        for part in header_parts[1:]:
            if re.search(r"\d{4}|present|current|spring|summer|fall|winter", part, re.I):
                continue
            if not job_title:
                job_title = part

        employment_type = _infer_employment_type(combined)
        start_date, end_date = _extract_date_range(combined)

        results.append(
            {
                "company_name": company_name,
                "employment_type": employment_type,
                "job_title": job_title,
                "start_date": start_date,
                "end_date": end_date,
                "details": " ".join(details_lines).strip(),
            }
        )

    return [r for r in results if any(str(v).strip() for v in r.values())]


def _parse_projects(lines: List[str]) -> List[Dict]:
    section_lines = _get_section_lines(lines, "projects")
    groups = _group_entries(section_lines)
    results: List[Dict] = []

    for group in groups:
        header = group[0]
        details_lines = [line.lstrip("•-* ").strip() for line in group[1:]]
        combined = " ".join(group)

        project_name = ""
        project_role = ""
        start_date = ""
        end_date = ""

        header_parts = _split_header_parts(header)

        if header_parts:
            project_name = header_parts[0]

        for part in header_parts[1:]:
            if re.search(r"\d{4}|present|current|spring|summer|fall|winter", part, re.I):
                continue
            if not project_role:
                project_role = part

        start_date, end_date = _extract_date_range(combined)

        results.append(
            {
                "project_name": project_name,
                "project_role": project_role,
                "start_date": start_date,
                "end_date": end_date,
                "details": " ".join(details_lines).strip(),
            }
        )

    return [r for r in results if any(str(v).strip() for v in r.values())]


def _rule_based_parse_resume_text(resume_text: str) -> Dict:
    lines = _normalize_lines(resume_text)

    return {
        "basic_info": {
            "full_name": _extract_name(resume_text),
            "email": _extract_email(resume_text),
            "phone": _extract_phone(resume_text),
            "location": _extract_location(resume_text),
        },
        "education": _parse_education(lines),
        "experiences": _parse_experiences(lines),
        "projects": _parse_projects(lines),
        "skills": _extract_skills(resume_text),
        "raw_text": resume_text,
    }


def _normalize_basic_info(basic_info: Dict) -> Dict:
    return {
        "full_name": (basic_info.get("full_name") or "").strip(),
        "email": (basic_info.get("email") or "").strip(),
        "phone": (basic_info.get("phone") or "").strip(),
        "location": (basic_info.get("location") or "").strip(),
    }


def _normalize_education_list(items: List[Dict]) -> List[Dict]:
    normalized = []
    for item in items or []:
        normalized.append(
            {
                "school_name": (item.get("school_name") or "").strip(),
                "degree": (item.get("degree") or "").strip(),
                "major": (item.get("major") or "").strip(),
                "start_date": (item.get("start_date") or "").strip(),
                "end_date": (item.get("end_date") or "").strip(),
                "details": (item.get("details") or "").strip(),
            }
        )
    return normalized


def _normalize_experience_list(items: List[Dict]) -> List[Dict]:
    normalized = []
    for item in items or []:
        normalized.append(
            {
                "company_name": (item.get("company_name") or "").strip(),
                "employment_type": (item.get("employment_type") or "").strip(),
                "job_title": (item.get("job_title") or "").strip(),
                "start_date": (item.get("start_date") or "").strip(),
                "end_date": (item.get("end_date") or "").strip(),
                "details": (item.get("details") or "").strip(),
            }
        )
    return normalized


def _normalize_project_list(items: List[Dict]) -> List[Dict]:
    normalized = []
    for item in items or []:
        normalized.append(
            {
                "project_name": (item.get("project_name") or "").strip(),
                "project_role": (item.get("project_role") or "").strip(),
                "start_date": (item.get("start_date") or "").strip(),
                "end_date": (item.get("end_date") or "").strip(),
                "details": (item.get("details") or "").strip(),
            }
        )
    return normalized


def _normalize_skill_list(skills: List[str]) -> List[str]:
    cleaned = []
    seen = set()

    for skill in skills or []:
        value = (skill or "").strip()
        if value and value.lower() not in seen:
            seen.add(value.lower())
            cleaned.append(value)

    return cleaned


def _normalize_resume_result(parsed: Dict, resume_text: str) -> Dict:
    return {
        "basic_info": _normalize_basic_info(parsed.get("basic_info", {})),
        "education": _normalize_education_list(parsed.get("education", [])),
        "experiences": _normalize_experience_list(parsed.get("experiences", [])),
        "projects": _normalize_project_list(parsed.get("projects", [])),
        "skills": _normalize_skill_list(parsed.get("skills", [])),
        "raw_text": resume_text,
    }


def _has_meaningful_ai_result(parsed: Dict) -> bool:
    basic_info = parsed.get("basic_info", {})
    education = parsed.get("education", [])
    experiences = parsed.get("experiences", [])
    projects = parsed.get("projects", [])
    skills = parsed.get("skills", [])

    return any(
        [
            basic_info.get("full_name"),
            basic_info.get("email"),
            len(education) > 0,
            len(experiences) > 0,
            len(projects) > 0,
            len(skills) > 0,
        ]
    )


def parse_resume_text(resume_text: str) -> Dict:
    try:
        ai_result = parse_resume_with_bedrock(resume_text)
        normalized_ai_result = _normalize_resume_result(ai_result, resume_text)

        if _has_meaningful_ai_result(normalized_ai_result):
            return normalized_ai_result
    except Exception as e:
        print(f"[Resume Parser] Bedrock parse failed, using fallback parser. Error: {e}")

    fallback_result = _rule_based_parse_resume_text(resume_text)
    return _normalize_resume_result(fallback_result, resume_text)