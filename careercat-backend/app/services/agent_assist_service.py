from app.services.bedrock_service import generate_structured_json


ALLOWED_ROUTES = {
    "/",
    "/profile",
    "/recommendations",
    "/import-jobs",
    "/dashboard",
    "/coach",
}

ALLOWED_TOOLS = {
    "go_to_profile",
    "search_adzuna_jobs",
    "parse_job_post",
    "view_dashboard",
    "start_gap_analysis",
    "start_mock_interview",
    "start_written_practice",
    "offer_platform_guidance",
    "ask_followup_question",
}


def decide_next_step(message: str, profile: dict | None, current_page: str = "/"):
    system_prompt = """
You are CareerCat Agent Assist, a supervisor agent for an AI job-search web app.

CareerCat has these tools and pages:
1. go_to_profile -> /profile
   Use when the user needs to create or edit their resume profile, goals, skills,
   locations, or visa sponsorship preference.
2. search_adzuna_jobs -> /recommendations
   Use when the user wants to find fresh jobs by keyword, location, salary, date,
   remote preference, or recommendations.
3. parse_job_post -> /import-jobs
   Use when the user has a job post or job description to paste/import/parse.
4. view_dashboard -> /dashboard
   Use when the user wants to track saved jobs, update application status, dates,
   notes, or review their application pipeline.
5. start_gap_analysis -> /coach
   Use when the user wants resume-vs-job gap analysis or wants to improve a resume
   for a selected saved job.
6. start_mock_interview -> /coach
   Use when the user wants technical or behavioral interview practice.
7. start_written_practice -> /coach
   Use when the user wants written assessment, coding test, SQL, analytics,
   statistics, or technical skill practice.
8. offer_platform_guidance -> /
   Use when the user sends a greeting, small talk, unclear text, off-topic text,
   nonsense, or a vague request that does not yet point to a CareerCat workflow.
   Do not force a page route. Briefly explain what CareerCat can help with and
   ask one simple question that helps the user choose a workflow.
9. ask_followup_question -> /
   Use only when the user goal is related to CareerCat but still too ambiguous
   to choose a useful route.

You must choose exactly one selected_tool.
Return ONLY valid JSON.
Do not include markdown.

JSON schema:
{
  "reply": "short helpful assistant response",
  "intent": "profile_setup | job_discovery | job_import | dashboard_tracking | gap_analysis | mock_interview | written_practice | general_guidance | unclear",
  "selected_tool": "one allowed tool",
  "route": "/ | /profile | /recommendations | /import-jobs | /dashboard | /coach",
  "reason": "why this tool was selected",
  "needs_user_input": true,
  "follow_up_question": "string or null",
  "tool_args": {
    "keywords": "string",
    "location": "string",
    "posted_within_days": 7,
    "mode": "gap_analysis | mock_interview | written_practice",
    "subtype": "technical | behavioral",
    "focus_topic": "string"
  }
}

Rules:
1. If the user asks to find jobs, extract keywords, location, and date window when possible.
2. If the user asks for interview practice, route to /coach and set mode/subtype/focus_topic.
3. If the user asks for written assessment practice, route to /coach and set mode/focus_topic.
4. If the user asks about a specific saved job or resume gap, route to /coach with mode gap_analysis.
5. If important details are missing but a route is still obvious, choose the route and ask a brief follow-up.
6. If the message is only a greeting, small talk, random text, or not connected
   to a job-search task, choose offer_platform_guidance and route "/".
7. Keep reply under 80 words.
"""

    profile_context = _profile_summary(profile)
    user_prompt = f"""
Current page: {current_page}
User profile summary:
{profile_context}

User message:
{message}
"""

    try:
        decision = generate_structured_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.1,
            max_tokens=900,
        )
    except Exception as e:
        print(f"[Agent Assist] Bedrock decision failed, using fallback. Error: {e}")
        decision = _fallback_decision(message)

    return _normalize_decision(decision)


def _profile_summary(profile: dict | None):
    if not profile:
        return "No saved profile found."

    return "\n".join(
        [
            f"Known skills: {', '.join(profile.get('known_skills', []))}",
            f"Target roles: {', '.join(profile.get('target_roles', []))}",
            f"Preferred locations: {', '.join(profile.get('preferred_locations', []))}",
            f"Needs sponsorship: {profile.get('sponsorship_need', False)}",
        ]
    )


def _normalize_decision(decision: dict):
    selected_tool = decision.get("selected_tool") or "ask_followup_question"
    if selected_tool not in ALLOWED_TOOLS:
        selected_tool = "ask_followup_question"

    route = decision.get("route") or _route_for_tool(selected_tool)
    if route not in ALLOWED_ROUTES:
        route = _route_for_tool(selected_tool)

    return {
        "reply": str(decision.get("reply") or "I can help route you to the right CareerCat workflow."),
        "intent": str(decision.get("intent") or "unclear"),
        "selected_tool": selected_tool,
        "route": route,
        "reason": str(decision.get("reason") or "Selected based on the user request."),
        "needs_user_input": bool(decision.get("needs_user_input", False)),
        "follow_up_question": decision.get("follow_up_question"),
        "tool_args": decision.get("tool_args") or {},
    }


def _route_for_tool(selected_tool: str):
    return {
        "go_to_profile": "/profile",
        "search_adzuna_jobs": "/recommendations",
        "parse_job_post": "/import-jobs",
        "view_dashboard": "/dashboard",
        "start_gap_analysis": "/coach",
        "start_mock_interview": "/coach",
        "start_written_practice": "/coach",
        "offer_platform_guidance": "/",
        "ask_followup_question": "/",
    }.get(selected_tool, "/")


def _fallback_decision(message: str):
    lower = message.strip().lower()

    if _looks_like_general_or_empty_input(lower):
        return {
            "reply": "Hi, I can help you set up your profile, find jobs, import job posts, track applications, or practice interviews. What would you like to work on first?",
            "intent": "general_guidance",
            "selected_tool": "offer_platform_guidance",
            "route": "/",
            "reason": "The message does not contain a clear CareerCat workflow request yet.",
            "needs_user_input": True,
            "follow_up_question": "Do you want to set up your profile, find jobs, import a job post, track applications, or practice interviews?",
            "tool_args": {},
        }

    if any(word in lower for word in ["find", "search", "recommend", "jobs", "roles"]):
        return {
            "reply": "I can help you find fresh job matches. Open Recommendations and I will use your keywords and location.",
            "intent": "job_discovery",
            "selected_tool": "search_adzuna_jobs",
            "route": "/recommendations",
            "reason": "The user is asking to discover job opportunities.",
            "needs_user_input": False,
            "follow_up_question": None,
            "tool_args": {},
        }

    if any(word in lower for word in ["interview", "mock", "behavioral", "technical"]):
        return {
            "reply": "I can start a coaching session for interview practice.",
            "intent": "mock_interview",
            "selected_tool": "start_mock_interview",
            "route": "/coach",
            "reason": "The user is asking for interview preparation.",
            "needs_user_input": False,
            "follow_up_question": None,
            "tool_args": {"mode": "mock_interview"},
        }

    if any(word in lower for word in ["assessment", "practice", "sql", "python", "coding"]):
        return {
            "reply": "I can help you train for written assessments and technical screens.",
            "intent": "written_practice",
            "selected_tool": "start_written_practice",
            "route": "/coach",
            "reason": "The user is asking for skill practice.",
            "needs_user_input": False,
            "follow_up_question": None,
            "tool_args": {"mode": "written_practice"},
        }

    return {
        "reply": "I can help with profile setup, job discovery, job import, application tracking, or coaching. What would you like to do first?",
        "intent": "general_guidance",
        "selected_tool": "offer_platform_guidance",
        "route": "/",
        "reason": "The user request is too broad to choose a workflow.",
        "needs_user_input": True,
        "follow_up_question": "Would you like to set up your profile, find jobs, import a job post, track applications, or practice interviews?",
        "tool_args": {},
    }


def _looks_like_general_or_empty_input(message: str):
    if not message:
        return True

    greetings = {
        "hi",
        "hello",
        "hey",
        "yo",
        "thanks",
        "thank you",
        "ok",
        "okay",
        "test",
    }
    if message in greetings:
        return True

    return len(message.split()) <= 2 and not any(
        keyword in message
        for keyword in [
            "job",
            "resume",
            "profile",
            "interview",
            "assessment",
            "dashboard",
            "recommend",
            "search",
            "import",
        ]
    )
