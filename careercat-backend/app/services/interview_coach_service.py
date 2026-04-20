from app.services.bedrock_service import generate_bedrock_interview_prep, generate_text


def generate_interview_prep(job: dict):
    try:
        return generate_bedrock_interview_prep(job)
    except Exception as e:
        print(f"Bedrock generation failed: {e}")

        title = job.get("title", "this role")
        skills = job.get("required_skills", [])

        behavioral_questions = [
            f"Why are you interested in the {title} position?",
            "Tell me about a time you solved a difficult problem.",
            "Describe a time you worked with a team to complete a project.",
        ]

        technical_topics = skills if skills else ["General data analysis", "Problem solving"]

        preparation_tips = [
            f"Review the core skills listed for the {title} role.",
            "Prepare 2 to 3 project examples that match the job requirements.",
            "Practice explaining your technical work clearly and concisely.",
        ]

        return {
            "title": title,
            "behavioral_questions": behavioral_questions,
            "technical_topics": technical_topics,
            "preparation_tips": preparation_tips,
        }


def generate_coach_reply(
    profile: dict | None,
    job: dict | None,
    mode: str,
    subtype: str | None,
    focus_topic: str | None,
    messages: list[dict],
):
    system_prompt = """
You are CareerCat Coach, a precise AI job-search mentor for technical job seekers.

Your job is to help users close gaps for written assessments, technical interviews,
behavioral interviews, and job-specific resume targeting.

Rules:
1. Be concrete and actionable.
2. If doing job gap analysis, compare the user's resume/profile against the selected job.
3. If doing interview simulation, act like an interviewer. Ask one question at a time.
4. When the user answers an interview question, grade the answer, explain the score,
   give a stronger sample answer or structure, then ask the next question if appropriate.
5. If doing written assessment practice, teach the underlying concept, give a practice
   problem, and ask the user to try before revealing too much.
6. Do not invent profile facts. Say when information is missing.
7. Use concise sections with clear next steps.
"""

    context = _build_context(profile, job, mode, subtype, focus_topic)
    history = _format_history(messages)

    user_prompt = f"""
Context:
{context}

Conversation:
{history}

Write the next coach response.
"""

    try:
        return generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.4,
            max_tokens=1800,
        )
    except Exception as e:
        print(f"[Coach] Bedrock chat failed, using fallback. Error: {e}")
        return _fallback_reply(profile, job, mode, subtype, focus_topic, messages)


def _build_context(
    profile: dict | None,
    job: dict | None,
    mode: str,
    subtype: str | None,
    focus_topic: str | None,
):
    profile = profile or {}
    basic_info = profile.get("basic_info", {})
    job = job or {}

    return "\n".join(
        [
            f"Mode: {mode}",
            f"Subtype: {subtype or ''}",
            f"Focus topic: {focus_topic or ''}",
            "",
            "User profile:",
            f"Name: {basic_info.get('full_name', '')}",
            f"Location: {basic_info.get('location', '')}",
            f"Target roles: {', '.join(profile.get('target_roles', []))}",
            f"Preferred locations: {', '.join(profile.get('preferred_locations', []))}",
            f"Needs sponsorship: {profile.get('sponsorship_need', False)}",
            f"Known skills: {', '.join(profile.get('known_skills', []))}",
            f"Education: {profile.get('education', [])}",
            f"Experiences: {profile.get('experiences', [])}",
            f"Projects: {profile.get('projects', [])}",
            "",
            "Selected job:",
            f"Company: {job.get('company', '')}",
            f"Title: {job.get('title', '')}",
            f"Location: {job.get('location', '')}",
            f"Required skills: {', '.join(job.get('required_skills', []))}",
            f"Preferred skills: {', '.join(job.get('preferred_skills', []))}",
            f"Requirements: {job.get('requirements', [])}",
            f"Responsibilities: {job.get('responsibilities', [])}",
            f"Summary: {job.get('summary', '')}",
        ]
    )


def _format_history(messages: list[dict]):
    if not messages:
        return "No prior messages. Start the session based on the selected mode."

    lines = []
    for message in messages[-12:]:
        role = message.get("role", "user")
        content = message.get("content", "")
        lines.append(f"{role.upper()}: {content}")
    return "\n".join(lines)


def _fallback_reply(
    profile: dict | None,
    job: dict | None,
    mode: str,
    subtype: str | None,
    focus_topic: str | None,
    messages: list[dict],
):
    profile = profile or {}
    job = job or {}
    skills = set(skill.lower() for skill in profile.get("known_skills", []))
    job_skills = set(skill.lower() for skill in job.get("required_skills", []))
    missing = sorted(job_skills - skills)

    if mode == "gap_analysis":
        return (
            f"Here is the gap analysis for {job.get('title', 'the selected role')}.\n\n"
            f"Resume positioning: emphasize projects and experience that show impact, "
            f"metrics, tools used, and business outcomes. Tailor your summary toward "
            f"{job.get('title', 'this role')} and mirror the most important job keywords.\n\n"
            f"Skill gaps: {', '.join(missing) if missing else 'No major keyword gaps found.'}\n\n"
            "Next steps: update 2 to 3 resume bullets, build one small portfolio project "
            "covering the missing skills, and practice explaining your strongest project "
            "with problem, action, result, and technical tradeoffs."
        )

    if mode == "mock_interview":
        if messages and messages[-1].get("role") == "user":
            return (
                "Score: 7/10.\n\n"
                "What worked: your answer addressed the question and showed relevant experience.\n\n"
                "How to improve: be more specific about constraints, tradeoffs, metrics, and your exact contribution.\n\n"
                "Next question: Tell me about a project where you had to debug or improve a technical system. What was the issue, what did you try, and what was the final impact?"
            )
        if subtype == "behavioral":
            return "Behavioral mock interview started. First question: Tell me about a time you solved a difficult problem under time pressure. Use the STAR structure."
        return f"Technical mock interview started for {focus_topic or 'your target stack'}. First question: Explain a core concept in this area and walk me through a project where you used it."

    return (
        f"Written assessment practice for {focus_topic or 'your target skill'}.\n\n"
        "Concept: start by identifying inputs, outputs, constraints, and edge cases.\n\n"
        "Practice problem: solve a small but realistic task in this topic. First explain your approach, then write the solution, then analyze complexity or tradeoffs."
    )
