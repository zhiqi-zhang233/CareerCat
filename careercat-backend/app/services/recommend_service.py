def recommend_jobs_from_profile(profile: dict):
    skills = [skill.lower() for skill in profile.get("known_skills", [])]

    recommended_jobs = set()
    matched_skills = []

    if "python" in skills:
        recommended_jobs.update(["Data Scientist", "Machine Learning Engineer"])
        matched_skills.append("Python")

    if "sql" in skills:
        recommended_jobs.update(["Data Analyst", "Business Intelligence Analyst"])
        matched_skills.append("SQL")

    if "machine learning" in skills:
        recommended_jobs.update(["Machine Learning Engineer", "AI Engineer", "Data Scientist"])
        matched_skills.append("Machine Learning")

    if "statistics" in skills:
        recommended_jobs.update(["Data Scientist", "Research Analyst"])
        matched_skills.append("Statistics")

    if not recommended_jobs:
        recommended_jobs.update(["Data Analyst", "Junior Data Scientist"])

    return {
        "recommended_jobs": sorted(list(recommended_jobs)),
        "matched_skills": matched_skills,
    }