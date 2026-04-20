import random
from uuid import uuid4


NO_SPONSORSHIP_PATTERNS = [
    "will not sponsor",
    "do not sponsor",
    "does not sponsor",
    "no sponsorship",
    "sponsorship is not available",
    "unable to sponsor",
    "cannot sponsor",
    "must be authorized to work in the u.s. without sponsorship",
    "must be authorized to work in the us without sponsorship",
]

YES_SPONSORSHIP_PATTERNS = [
    "visa sponsorship available",
    "sponsorship available",
    "will sponsor",
    "h-1b sponsorship",
    "h1b sponsorship",
]


def infer_visa_sponsorship(text: str) -> str:
    lower = (text or "").lower()

    if any(pattern in lower for pattern in NO_SPONSORSHIP_PATTERNS):
        return "No"

    if any(pattern in lower for pattern in YES_SPONSORSHIP_PATTERNS):
        return "Yes"

    return "Unknown"


def should_block_for_sponsorship(needs_sponsorship: bool, visa_sponsorship: str) -> bool:
    return bool(needs_sponsorship) and visa_sponsorship == "No"


def run_sponsorship_filter_accuracy_check(sample_count: int = 5) -> dict:
    bounded_count = max(1, min(int(sample_count or 5), 50))
    cases = [_generate_random_case(index) for index in range(bounded_count)]

    checked_cases = []
    for case in cases:
        detected = infer_visa_sponsorship(case["job_text"])
        actual_action = (
            "Blocked"
            if should_block_for_sponsorship(True, detected)
            else "Allowed"
        )
        passed = (
            detected == case["expected_visa_sponsorship"]
            and actual_action == case["expected_action"]
        )
        checked_cases.append(
            {
                **case,
                "detected_visa_sponsorship": detected,
                "actual_action": actual_action,
                "passed": passed,
            }
        )

    passed_cases = len([case for case in checked_cases if case["passed"]])
    total_cases = len(checked_cases)
    accuracy = round((passed_cases / total_cases) * 100, 1) if total_cases else 0

    return {
        "metric_name": "Sponsorship Filter Accuracy Check",
        "sample_count": bounded_count,
        "accuracy": accuracy,
        "passed_cases": passed_cases,
        "total_cases": total_cases,
        "decision_rule": (
            "When a user needs sponsorship, jobs explicitly detected as No are blocked. "
            "Jobs detected as Yes or Unknown are allowed."
        ),
        "cases": checked_cases,
    }


def _generate_random_case(index: int) -> dict:
    category = random.choice(["No", "Yes", "Unknown"])
    title = random.choice(JOB_TITLES)
    company = random.choice(COMPANIES)
    location = random.choice(LOCATIONS)
    skills = ", ".join(random.sample(SKILLS, k=3))
    work_mode = random.choice(["Remote", "Hybrid", "Onsite"])
    salary = random.choice(["$75,000 - $95,000", "$95,000 - $125,000", "$42 - $58/hr"])

    if category == "No":
        sponsorship_sentence = random.choice(NO_SPONSORSHIP_SENTENCES)
        label = "Random no-sponsorship case"
        expected_action = "Blocked"
        explanation = (
            "A user who needs sponsorship should not be recommended this job."
        )
    elif category == "Yes":
        sponsorship_sentence = random.choice(YES_SPONSORSHIP_SENTENCES)
        label = "Random sponsorship-supported case"
        expected_action = "Allowed"
        explanation = (
            "The job should remain eligible because sponsorship is explicitly available."
        )
    else:
        sponsorship_sentence = random.choice(UNKNOWN_SPONSORSHIP_SENTENCES)
        label = "Random unknown-policy case"
        expected_action = "Allowed"
        explanation = (
            "Unknown policy is kept visible because the system only blocks explicit no-sponsorship jobs."
        )

    job_text = (
        f"{title}. Company: {company}. Location: {location}. Work mode: {work_mode}. "
        f"Salary: {salary}. Required skills: {skills}. {sponsorship_sentence} "
        f"The team works on {random.choice(PROJECT_AREAS)}."
    )

    return {
        "case_id": f"random_{index + 1}_{uuid4().hex[:8]}",
        "label": label,
        "job_text": job_text,
        "expected_visa_sponsorship": category,
        "expected_action": expected_action,
        "explanation": explanation,
    }


JOB_TITLES = [
    "Data Analyst",
    "Business Analyst",
    "Machine Learning Engineer",
    "Software Engineer",
    "Product Data Scientist",
    "Backend Engineer",
    "Analytics Engineer",
    "AI Application Developer",
]

COMPANIES = [
    "Northstar Labs",
    "Maple Health",
    "Riverline Finance",
    "CloudNest",
    "BrightGrid",
    "Urban Mobility Group",
    "Civic Data Studio",
    "SignalWorks",
]

LOCATIONS = [
    "Chicago, IL",
    "New York, NY",
    "Austin, TX",
    "Seattle, WA",
    "Nashville, TN",
    "Remote, United States",
]

SKILLS = [
    "Python",
    "SQL",
    "AWS",
    "React",
    "TypeScript",
    "Tableau",
    "Statistics",
    "Machine Learning",
    "DynamoDB",
    "FastAPI",
]

PROJECT_AREAS = [
    "customer analytics",
    "resume matching",
    "workflow automation",
    "forecasting dashboards",
    "search ranking",
    "internal data platforms",
]

NO_SPONSORSHIP_SENTENCES = [
    "Applicants must be authorized to work in the US without sponsorship.",
    "The company will not sponsor employment visas for this position.",
    "Sponsorship is not available for this role.",
    "We are unable to sponsor now or in the future.",
    "Candidates must not require sponsorship; the employer cannot sponsor visas.",
]

YES_SPONSORSHIP_SENTENCES = [
    "Visa sponsorship available for qualified candidates.",
    "The employer will sponsor strong applicants.",
    "H-1B sponsorship is available for this role.",
    "The team can provide H1B sponsorship when needed.",
    "Sponsorship available for candidates who meet the requirements.",
]

UNKNOWN_SPONSORSHIP_SENTENCES = [
    "Applicants should be ready to collaborate across product and engineering teams.",
    "The role includes stakeholder communication and production support.",
    "Candidates should have strong problem-solving and documentation skills.",
    "The hiring team values curiosity, ownership, and clear communication.",
    "This position requires cross-functional work with data and operations teams.",
]
