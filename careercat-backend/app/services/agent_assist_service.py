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
You are CareerCat Workflow Coordinator, a multi-stage planning agent for an AI job-search web app.

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
  },
  "workflow_goal": "the user's overall goal in one sentence",
  "current_stage_id": "stage id for the next best action",
  "stages": [
    {
      "id": "understand_goal",
      "title": "stage title",
      "agent": "Goal Agent | Profile Agent | Job Search Agent | Fit Agent | Coach Agent | Tracker Agent",
      "action": "what this stage does",
      "route": "/profile",
      "depends_on": ["previous_stage_id"],
      "status": "ready | blocked | planned | complete",
      "needs_user_input": true,
      "output": "expected output"
    }
  ]
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
8. For multi-step goals, create 4-7 ordered stages with dependencies.
9. Mark stages that require missing user data as blocked or ready with needs_user_input true.
10. The current_stage_id must point to the first ready stage the user should do next.
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
        print(f"[Workflow Coordinator] Bedrock decision failed, using fallback. Error: {e}")
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

    normalized = {
        "reply": str(decision.get("reply") or "I can help route you to the right CareerCat workflow."),
        "intent": str(decision.get("intent") or "unclear"),
        "selected_tool": selected_tool,
        "route": route,
        "reason": str(decision.get("reason") or "Selected based on the user request."),
        "needs_user_input": bool(decision.get("needs_user_input", False)),
        "follow_up_question": decision.get("follow_up_question"),
        "tool_args": decision.get("tool_args") or {},
    }

    workflow_goal = str(decision.get("workflow_goal") or _goal_for_intent(normalized["intent"]))
    stages = _normalize_stages(
        decision.get("stages"),
        selected_tool=selected_tool,
        route=route,
        intent=normalized["intent"],
    )
    current_stage_id = str(
        decision.get("current_stage_id")
        or _first_ready_stage_id(stages)
        or (stages[0]["id"] if stages else "")
    )

    return {
        **normalized,
        "workflow_goal": workflow_goal,
        "current_stage_id": current_stage_id,
        "stages": stages,
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
            "workflow_goal": "Choose the right CareerCat workflow.",
            "current_stage_id": "clarify_goal",
            "stages": _guidance_stages(),
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
            "workflow_goal": "Find relevant jobs and prioritize the next application steps.",
            "current_stage_id": "search_jobs",
            "stages": _job_search_stages(),
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
            "workflow_goal": "Prepare for an interview with targeted practice.",
            "current_stage_id": "start_coach",
            "stages": _coach_stages("mock_interview"),
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
            "workflow_goal": "Practice for a written assessment or technical screen.",
            "current_stage_id": "start_coach",
            "stages": _coach_stages("written_practice"),
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
        "workflow_goal": "Choose the next job-search workflow.",
        "current_stage_id": "clarify_goal",
        "stages": _guidance_stages(),
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


def _goal_for_intent(intent: str):
    return {
        "profile_setup": "Build a reliable resume profile for downstream job matching.",
        "job_discovery": "Find relevant jobs and prepare them for comparison.",
        "job_import": "Turn a job post into an editable structured record.",
        "dashboard_tracking": "Review and manage saved applications.",
        "gap_analysis": "Compare the profile against saved jobs and plan improvements.",
        "mock_interview": "Run a focused interview practice workflow.",
        "written_practice": "Run a focused written assessment practice workflow.",
    }.get(intent, "Plan the next useful CareerCat workflow.")


def _normalize_stages(raw_stages, selected_tool: str, route: str, intent: str):
    if isinstance(raw_stages, list) and raw_stages:
        stages = []
        for index, stage in enumerate(raw_stages[:7]):
            if not isinstance(stage, dict):
                continue
            stage_id = str(stage.get("id") or f"stage_{index + 1}")
            stage_route = stage.get("route") if stage.get("route") in ALLOWED_ROUTES else route
            status = str(stage.get("status") or "planned").lower()
            if status not in {"ready", "blocked", "planned", "complete"}:
                status = "planned"
            depends_on = stage.get("depends_on") or []
            if not isinstance(depends_on, list):
                depends_on = []
            stages.append(
                {
                    "id": stage_id,
                    "title": str(stage.get("title") or stage_id.replace("_", " ").title()),
                    "agent": str(stage.get("agent") or _agent_for_tool(selected_tool)),
                    "action": str(stage.get("action") or "Complete this workflow step."),
                    "route": stage_route,
                    "depends_on": [str(item) for item in depends_on],
                    "status": status,
                    "needs_user_input": bool(stage.get("needs_user_input", False)),
                    "output": str(stage.get("output") or "A usable result for the next stage."),
                }
            )
        if stages:
            return stages

    if intent == "job_discovery":
        return _job_search_stages()
    if intent in {"mock_interview", "written_practice", "gap_analysis"}:
        return _coach_stages(intent)
    if intent == "job_import":
        return _job_import_stages()
    if intent == "profile_setup":
        return _profile_stages()
    if intent == "dashboard_tracking":
        return _dashboard_stages()
    return _guidance_stages()


def _agent_for_tool(selected_tool: str):
    return {
        "go_to_profile": "Profile Agent",
        "search_adzuna_jobs": "Job Search Agent",
        "parse_job_post": "Job Parser Agent",
        "view_dashboard": "Tracker Agent",
        "start_gap_analysis": "Fit Agent",
        "start_mock_interview": "Coach Agent",
        "start_written_practice": "Coach Agent",
    }.get(selected_tool, "Goal Agent")


def _first_ready_stage_id(stages: list[dict]):
    for stage in stages:
        if stage.get("status") == "ready":
            return stage.get("id")
    for stage in stages:
        if stage.get("status") != "complete":
            return stage.get("id")
    return ""


def _profile_stages():
    return [
        _stage("profile_parse", "Parse Resume", "Profile Agent", "/profile", "Upload or edit resume-derived profile fields.", [], "ready", True, "Structured profile."),
        _stage("profile_constraints", "Confirm Targets", "Goal Agent", "/profile", "Confirm target roles, locations, and sponsorship needs.", ["profile_parse"], "planned", True, "Job-search constraints."),
        _stage("next_workflow", "Choose Next Workflow", "Goal Agent", "/", "Move to recommendations, job import, or coaching.", ["profile_constraints"], "planned", True, "Next workflow decision."),
    ]


def _job_search_stages():
    return [
        _stage("profile_check", "Check Profile", "Profile Agent", "/profile", "Use saved skills, target roles, locations, and sponsorship preferences.", [], "ready", False, "Profile context."),
        _stage("search_jobs", "Search Jobs", "Job Search Agent", "/recommendations", "Search fresh roles with keyword, location, date, remote, and salary constraints.", ["profile_check"], "ready", True, "Candidate job list."),
        _stage("filter_and_rank", "Filter and Rank", "Fit Agent", "/recommendations", "Prioritize roles by skills, constraints, and sponsorship compatibility.", ["search_jobs"], "planned", False, "Ranked recommendations."),
        _stage("save_targets", "Save Targets", "Tracker Agent", "/dashboard", "Save the best roles and track application state.", ["filter_and_rank"], "planned", True, "Tracked application pipeline."),
        _stage("prepare", "Prepare Next Steps", "Coach Agent", "/coach", "Use selected saved jobs for gap analysis or interview practice.", ["save_targets"], "planned", True, "Preparation plan."),
    ]


def _job_import_stages():
    return [
        _stage("parse_post", "Parse Job Post", "Job Parser Agent", "/import-jobs", "Extract role, company, requirements, skills, salary, dates, and sponsorship signal.", [], "ready", True, "Editable job record."),
        _stage("validate_fields", "Review Fields", "Tracker Agent", "/import-jobs", "Correct extracted fields before saving.", ["parse_post"], "planned", True, "Clean structured job."),
        _stage("save_job", "Save Job", "Tracker Agent", "/dashboard", "Store the job with Not Applied status.", ["validate_fields"], "planned", True, "Saved dashboard record."),
        _stage("prepare", "Analyze Fit", "Fit Agent", "/coach", "Compare the saved job with your profile.", ["save_job"], "planned", True, "Gap analysis."),
    ]


def _coach_stages(intent: str):
    mode_title = {
        "gap_analysis": "Analyze Resume Fit",
        "mock_interview": "Run Mock Interview",
        "written_practice": "Practice Assessment",
    }.get(intent, "Start Coaching")
    return [
        _stage("select_context", "Select Context", "Goal Agent", "/coach", "Choose the saved job, interview type, or skill topic.", [], "ready", True, "Coaching context."),
        _stage("start_coach", mode_title, "Coach Agent", "/coach", "Generate targeted coaching prompts and guidance.", ["select_context"], "ready", True, "Interactive coach session."),
        _stage("score_or_review", "Review Progress", "Coach Agent", "/coach", "Assess answers or summarize gaps and next practice actions.", ["start_coach"], "planned", True, "Actionable feedback."),
        _stage("track_followup", "Track Follow-up", "Tracker Agent", "/dashboard", "Use saved jobs and notes to keep next steps visible.", ["score_or_review"], "planned", True, "Tracked next step."),
    ]


def _dashboard_stages():
    return [
        _stage("review_pipeline", "Review Pipeline", "Tracker Agent", "/dashboard", "Filter saved jobs by status, date, skill, salary, and location.", [], "ready", True, "Prioritized job list."),
        _stage("update_records", "Update Records", "Tracker Agent", "/dashboard", "Edit job details, application dates, notes, and statuses.", ["review_pipeline"], "ready", True, "Current application data."),
        _stage("prepare_next", "Prepare Next Action", "Coach Agent", "/coach", "Use the highest-priority saved job for gap analysis or practice.", ["update_records"], "planned", True, "Preparation workflow."),
    ]


def _guidance_stages():
    return [
        _stage("clarify_goal", "Clarify Goal", "Goal Agent", "/", "Identify whether the user wants profile setup, job search, import, tracking, or coaching.", [], "ready", True, "Clear workflow goal."),
        _stage("choose_workflow", "Choose Workflow", "Goal Agent", "/", "Route to the first useful page after the goal is clear.", ["clarify_goal"], "blocked", True, "Selected workflow."),
    ]


def _stage(
    stage_id: str,
    title: str,
    agent: str,
    route: str,
    action: str,
    depends_on: list[str],
    status: str,
    needs_user_input: bool,
    output: str,
):
    return {
        "id": stage_id,
        "title": title,
        "agent": agent,
        "action": action,
        "route": route,
        "depends_on": depends_on,
        "status": status,
        "needs_user_input": needs_user_input,
        "output": output,
    }
