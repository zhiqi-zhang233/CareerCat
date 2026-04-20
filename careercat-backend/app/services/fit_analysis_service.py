def analyze_job_fit(profile: dict, job: dict):
    user_skills = set(skill.lower() for skill in profile.get("known_skills", []))
    job_skills = set(skill.lower() for skill in job.get("required_skills", []))

    matched = sorted([skill for skill in job_skills if skill in user_skills])
    missing = sorted([skill for skill in job_skills if skill not in user_skills])

    if len(job_skills) == 0:
        fit_score = 50
    else:
        fit_score = round((len(matched) / len(job_skills)) * 100)

    if fit_score >= 80:
        recommendation = "Strong Match"
    elif fit_score >= 50:
        recommendation = "Moderate Match"
    else:
        recommendation = "Needs Skill Improvement"

    return {
        "job_id": job["job_id"],
        "title": job["title"],
        "fit_score": fit_score,
        "matched_skills": matched,
        "missing_skills": missing,
        "recommendation": recommendation,
    }