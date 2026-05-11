from app.services.bedrock_service import generate_structured_json
from app.services.workflow_agent_registry import (
    build_workflow_orchestrator_prompt,
    workflow_agent_model_id,
)


ALLOWED_ROUTES = {
    "/",
    "/workspace",
    "/profile",
    "/recommendations",
    "/import-jobs",
    "/dashboard",
    "/insights",
    "/coach",
}

ALLOWED_TOOLS = {
    "go_to_profile",
    "search_adzuna_jobs",
    "parse_job_post",
    "view_dashboard",
    "view_insights",
    "start_gap_analysis",
    "start_mock_interview",
    "start_written_practice",
    "offer_platform_guidance",
    "ask_followup_question",
}


_LOCALE_INSTRUCTION = {
    "en": "Respond in English. Use clear, concise English for every user-facing string (reply, follow_up_question, workflow_goal, stage titles, stage actions, stage outputs).",
    "zh": "请用简体中文回复。所有面向用户的字段（reply、follow_up_question、workflow_goal、stages 中的 title/action/output）都使用简体中文撰写，但保持 JSON 字段名、tool 名称、route 字符串和 stage id 为英文。",
}


def decide_next_step(
    message: str,
    profile: dict | None,
    current_page: str = "/workspace",
    locale: str = "en",
):
    locale_directive = _LOCALE_INSTRUCTION.get(locale, _LOCALE_INSTRUCTION["en"])
    system_prompt = build_workflow_orchestrator_prompt(locale_directive)

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
            model_id=workflow_agent_model_id("orchestrator"),
        )
    except Exception as e:
        print(f"[Workflow Coordinator] Bedrock decision failed, using fallback. Error: {e}")
        decision = _fallback_decision(message, locale)

    return _normalize_decision(decision, locale)


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


def _normalize_decision(decision: dict, locale: str = "en"):
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
    stage_ids = {stage["id"] for stage in stages}
    requested_stage_id = str(decision.get("current_stage_id") or "")
    current_stage_id = (
        requested_stage_id
        if requested_stage_id in stage_ids
        else (_first_ready_stage_id(stages) or (stages[0]["id"] if stages else ""))
    )

    return {
        **normalized,
        "workflow_goal": workflow_goal,
        "current_stage_id": current_stage_id,
        "stages": stages,
        "suggested_actions": _normalize_suggested_actions(
            decision.get("suggested_actions"),
            stages=stages,
            locale=locale,
        ),
        "harness": _harness_summary(stages, normalized["selected_tool"], route),
    }


def _harness_summary(stages: list[dict], selected_tool: str, route: str):
    agents = []
    for stage in stages:
        agent = stage.get("agent")
        if agent and agent not in agents:
            agents.append(agent)
    return {
        "mode": "multi_agent_harness",
        "coordinator": "Harness Coordinator",
        "selected_handoff": _agent_for_tool(selected_tool),
        "next_route": route,
        "agents": agents,
        "todo_count": len(stages),
        "ready_count": len([stage for stage in stages if stage.get("status") == "ready"]),
        "blocked_count": len([stage for stage in stages if stage.get("status") == "blocked"]),
    }


def _normalize_suggested_actions(raw_actions, stages: list[dict], locale: str):
    actions = []
    if isinstance(raw_actions, list):
        for index, action in enumerate(raw_actions[:4]):
            if not isinstance(action, dict):
                continue
            route = action.get("route")
            if route not in ALLOWED_ROUTES:
                continue
            action_id = str(action.get("id") or f"suggested_action_{index + 1}")
            label = str(action.get("label") or _action_label_for_route(route, locale))
            actions.append(
                {
                    "id": action_id,
                    "label": label,
                    "route": route,
                    "reason": str(action.get("reason") or ""),
                }
            )

    if actions:
        return _dedupe_actions(actions)

    generated = []
    for stage in stages:
        route = stage.get("route")
        if route in {"/workspace", "/"} or route not in ALLOWED_ROUTES:
            continue
        generated.append(
            {
                "id": f"open_{str(route).strip('/').replace('-', '_') or 'workspace'}",
                "label": _action_label_for_route(route, locale),
                "route": route,
                "reason": str(stage.get("action") or stage.get("title") or ""),
            }
        )
        if len(generated) >= 4:
            break
    return _dedupe_actions(generated)


def _dedupe_actions(actions: list[dict]):
    seen = set()
    deduped = []
    for action in actions:
        key = action.get("route")
        if key in seen:
            continue
        seen.add(key)
        deduped.append(action)
    return deduped


def _action_label_for_route(route: str, locale: str):
    zh = locale == "zh"
    labels = {
        "/profile": ("查看并完善简历资料", "Review and complete profile"),
        "/recommendations": ("按要求推荐岗位", "Find matching jobs"),
        "/import-jobs": ("输入或导入岗位描述", "Import a job description"),
        "/dashboard": ("查看投递面板", "Open application dashboard"),
        "/insights": ("查看进度分析", "Review progress insights"),
        "/coach": ("进行差距分析或面试练习", "Start gap analysis or coaching"),
        "/workspace": ("继续和智能体沟通", "Continue with the agent"),
        "/": ("回到主页", "Go home"),
    }
    label_zh, label_en = labels.get(route, ("继续下一步", "Continue next step"))
    return label_zh if zh else label_en


def _route_for_tool(selected_tool: str):
    return {
        "go_to_profile": "/profile",
        "search_adzuna_jobs": "/recommendations",
        "parse_job_post": "/import-jobs",
        "view_dashboard": "/dashboard",
        "view_insights": "/insights",
        "start_gap_analysis": "/coach",
        "start_mock_interview": "/coach",
        "start_written_practice": "/coach",
        "offer_platform_guidance": "/workspace",
        "ask_followup_question": "/workspace",
    }.get(selected_tool, "/workspace")


_FALLBACK_COPY = {
    "en": {
        "general_reply": "Hi, I can help you set up your profile, find jobs, import job posts, track applications, or practice interviews. What would you like to work on first?",
        "general_followup": "Do you want to set up your profile, find jobs, import a job post, track applications, or practice interviews?",
        "general_reason": "The message does not contain a clear CareerCat workflow request yet.",
        "general_goal": "Choose the right CareerCat workflow.",
        "broad_reply": "I can help with profile setup, job discovery, job import, application tracking, or coaching. What would you like to do first?",
        "broad_reason": "The user request is too broad to choose a workflow.",
        "broad_goal": "Choose the next job-search workflow.",
        "search_reply": "I can help you find fresh job matches. Open Recommendations and I will use your keywords and location.",
        "search_reason": "The user is asking to discover job opportunities.",
        "search_goal": "Find relevant jobs and prioritize the next application steps.",
        "interview_reply": "I can start a coaching session for interview practice.",
        "interview_reason": "The user is asking for interview preparation.",
        "interview_goal": "Prepare for an interview with targeted practice.",
        "practice_reply": "I can help you train for written assessments and technical screens.",
        "practice_reason": "The user is asking for skill practice.",
        "practice_goal": "Practice for a written assessment or technical screen.",
    },
    "zh": {
        "general_reply": "你好，我可以帮你设置个人资料、查找岗位、导入岗位描述、追踪投递或练习面试。你想先做哪一项？",
        "general_followup": "你想先做哪一项：设置个人资料、查找岗位、导入岗位、追踪投递，还是练习面试？",
        "general_reason": "目前的消息还没有明确的 CareerCat 工作流意图。",
        "general_goal": "选择合适的 CareerCat 工作流。",
        "broad_reply": "我可以帮你做个人资料设置、岗位发现、岗位导入、投递追踪或求职辅导。你想先做哪一项？",
        "broad_reason": "用户的请求太宽泛，难以直接选择工作流。",
        "broad_goal": "确定下一步求职工作流。",
        "search_reply": "我可以帮你寻找匹配岗位。打开「岗位推荐」，我会基于你的关键词和地点搜索。",
        "search_reason": "用户在请求发现岗位机会。",
        "search_goal": "找到相关岗位并安排接下来的投递。",
        "interview_reply": "我可以开启一段辅导会话来练习面试。",
        "interview_reason": "用户在请求面试准备。",
        "interview_goal": "通过针对性练习为面试做准备。",
        "practice_reply": "我可以帮你针对笔试和技术筛选做练习。",
        "practice_reason": "用户在请求技能练习。",
        "practice_goal": "为笔试或技术筛选做练习。",
    },
}


def _fallback_decision(message: str, locale: str = "en"):
    copy = _FALLBACK_COPY.get(locale, _FALLBACK_COPY["en"])
    lower = message.strip().lower()

    if _looks_like_general_or_empty_input(lower):
        return {
            "reply": copy["general_reply"],
            "intent": "general_guidance",
            "selected_tool": "offer_platform_guidance",
            "route": "/workspace",
            "reason": copy["general_reason"],
            "needs_user_input": True,
            "follow_up_question": copy["general_followup"],
            "tool_args": {},
            "workflow_goal": copy["general_goal"],
            "current_stage_id": "clarify_goal",
            "stages": _guidance_stages(),
        }

    harness_decision = _fallback_harness_decision(message, locale)
    if harness_decision:
        return harness_decision

    if any(word in lower for word in ["find", "search", "recommend", "jobs", "roles", "找", "搜", "推荐", "岗位"]):
        return {
            "reply": copy["search_reply"],
            "intent": "job_discovery",
            "selected_tool": "search_adzuna_jobs",
            "route": "/recommendations",
            "reason": copy["search_reason"],
            "needs_user_input": False,
            "follow_up_question": None,
            "tool_args": {},
            "workflow_goal": copy["search_goal"],
            "current_stage_id": "search_jobs",
            "stages": _job_search_stages(),
        }

    if any(word in lower for word in ["interview", "mock", "behavioral", "technical", "面试", "模拟"]):
        return {
            "reply": copy["interview_reply"],
            "intent": "mock_interview",
            "selected_tool": "start_mock_interview",
            "route": "/coach",
            "reason": copy["interview_reason"],
            "needs_user_input": False,
            "follow_up_question": None,
            "tool_args": {"mode": "mock_interview"},
            "workflow_goal": copy["interview_goal"],
            "current_stage_id": "start_coach",
            "stages": _coach_stages("mock_interview"),
        }

    if any(word in lower for word in ["assessment", "practice", "sql", "python", "coding", "笔试", "练习"]):
        return {
            "reply": copy["practice_reply"],
            "intent": "written_practice",
            "selected_tool": "start_written_practice",
            "route": "/coach",
            "reason": copy["practice_reason"],
            "needs_user_input": False,
            "follow_up_question": None,
            "tool_args": {"mode": "written_practice"},
            "workflow_goal": copy["practice_goal"],
            "current_stage_id": "start_coach",
            "stages": _coach_stages("written_practice"),
        }

    return {
        "reply": copy["broad_reply"],
        "intent": "general_guidance",
        "selected_tool": "offer_platform_guidance",
        "route": "/workspace",
        "reason": copy["broad_reason"],
        "needs_user_input": True,
        "follow_up_question": copy["general_followup"],
        "tool_args": {},
        "workflow_goal": copy["broad_goal"],
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
            "简历",
            "个人资料",
            "岗位",
            "职位",
            "投递",
            "面试",
            "笔试",
            "练习",
            "匹配",
            "差距",
            "推荐",
            "导入",
            "追踪",
            "分析",
        ]
    )


_INTENT_KEYWORDS = {
    "profile_setup": ["resume", "cv", "profile", "skill", "target", "简历", "个人资料", "技能", "目标"],
    "job_discovery": ["find", "search", "recommend", "job", "role", "h1b", "visa", "sponsor", "找", "搜", "推荐", "岗位", "职位", "担保"],
    "job_import": ["import", "paste", "jd", "description", "post", "parse", "导入", "粘贴", "岗位描述", "解析"],
    "dashboard_tracking": ["track", "dashboard", "status", "application", "pipeline", "投递", "面板", "追踪", "状态", "看板"],
    "insights": ["insight", "analytics", "progress", "funnel", "report", "数据", "分析", "进度", "漏斗", "报告"],
    "gap_analysis": ["gap", "fit", "match", "improve", "tailor", "差距", "匹配", "优化", "改简历"],
    "mock_interview": ["interview", "mock", "behavioral", "technical", "面试", "模拟", "行为面"],
    "written_practice": ["assessment", "practice", "sql", "python", "coding", "test", "笔试", "练习", "代码", "测评"],
}


def _fallback_harness_decision(message: str, locale: str):
    lower = message.strip().lower()
    detected = [
        intent
        for intent, keywords in _INTENT_KEYWORDS.items()
        if any(keyword in lower for keyword in keywords)
    ]
    if not detected:
        return None

    stages = _build_harness_stages(detected, locale)
    selected_tool, route, intent = _handoff_for_stage(stages[0])
    if any(item in detected for item in ["mock_interview", "written_practice", "gap_analysis"]):
        selected_tool = {
            "gap_analysis": "start_gap_analysis",
            "mock_interview": "start_mock_interview",
            "written_practice": "start_written_practice",
        }.get(next(item for item in ["gap_analysis", "mock_interview", "written_practice"] if item in detected), selected_tool)
        route = "/coach"
        intent = next(item for item in ["gap_analysis", "mock_interview", "written_practice"] if item in detected)
    elif "job_discovery" in detected:
        selected_tool = "search_adzuna_jobs"
        route = "/recommendations"
        intent = "job_discovery"
    elif "job_import" in detected:
        selected_tool = "parse_job_post"
        route = "/import-jobs"
        intent = "job_import"
    elif "profile_setup" in detected:
        selected_tool = "go_to_profile"
        route = "/profile"
        intent = "profile_setup"
    elif "dashboard_tracking" in detected:
        selected_tool = "view_dashboard"
        route = "/dashboard"
        intent = "dashboard_tracking"
    elif "insights" in detected:
        selected_tool = "view_insights"
        route = "/insights"
        intent = "insights"

    if locale == "zh":
        reply = "我会用 Harness Coordinator 把这个复杂目标拆成可执行 todo，并按 Profile、Search、Tracker、Fit、Coach 等子智能体依次交接。"
        reason = "该请求包含多个求职子任务，需要由多智能体 harness 拆分、排序并跟踪依赖。"
        goal = _zh_goal_from_intents(detected)
    else:
        reply = "I will use the Harness Coordinator to split this complex goal into executable todos and hand work across the Profile, Search, Tracker, Fit, and Coach agents."
        reason = "The request contains multiple job-search subtasks, so it needs a multi-agent harness plan with dependencies."
        goal = _en_goal_from_intents(detected)

    return {
        "reply": reply,
        "intent": intent,
        "selected_tool": selected_tool,
        "route": route,
        "reason": reason,
        "needs_user_input": True,
        "follow_up_question": None,
        "tool_args": _extract_tool_args(message, detected),
        "workflow_goal": goal,
        "current_stage_id": _first_ready_stage_id(stages),
        "stages": stages,
    }


def _build_harness_stages(detected: list[str], locale: str):
    zh = locale == "zh"
    specs = []

    def add(stage_id, title_en, title_zh, agent, route, action_en, action_zh, output_en, output_zh):
        if stage_id in [item[0] for item in specs]:
            return
        specs.append((stage_id, title_en, title_zh, agent, route, action_en, action_zh, output_en, output_zh))

    add(
        "clarify_constraints",
        "Clarify Constraints",
        "明确约束条件",
        "Harness Coordinator",
        "/workspace",
        "Turn the messy request into scope, constraints, and acceptance criteria.",
        "把复杂需求整理成目标、限制条件和完成标准。",
        "Clear execution brief.",
        "清晰的执行说明。",
    )
    if "profile_setup" in detected or "job_discovery" in detected or "gap_analysis" in detected:
        add("profile_context", "Prepare Profile Context", "准备简历上下文", "Profile Agent", "/profile", "Check resume, skills, target roles, location, and sponsorship needs.", "检查简历、技能、目标岗位、地点和身份/担保需求。", "Profile context for downstream agents.", "后续智能体可使用的个人资料上下文。")
    if "job_import" in detected:
        add("parse_job_post", "Parse Job Post", "解析岗位描述", "Job Parser Agent", "/import-jobs", "Extract structured fields from the pasted job description.", "从粘贴的岗位描述中提取结构化字段。", "Editable job record.", "可编辑的岗位记录。")
    if "job_discovery" in detected:
        add("search_jobs", "Search Matching Jobs", "搜索匹配岗位", "Job Search Agent", "/recommendations", "Search and shortlist jobs using role, location, sponsorship, salary, and recency constraints.", "基于岗位、地点、担保、薪资和发布时间筛选岗位。", "Shortlisted jobs.", "候选岗位清单。")
        add("rank_jobs", "Rank and Filter", "排序与筛选", "Fit Agent", "/recommendations", "Rank jobs by profile fit, missing skills, and practical constraints.", "按简历匹配度、技能差距和实际限制对岗位排序。", "Ranked recommendation list.", "排序后的推荐列表。")
    if "dashboard_tracking" in detected or "job_discovery" in detected or "job_import" in detected:
        add("save_and_track", "Save and Track", "保存并追踪", "Tracker Agent", "/dashboard", "Save selected jobs and turn next actions into application-tracking items.", "保存选中的岗位，并把下一步动作放进投递追踪。", "Tracked job pipeline.", "可追踪的投递管线。")
    if "insights" in detected or "dashboard_tracking" in detected:
        add("review_progress", "Review Progress", "复盘进度", "Insights Agent", "/insights", "Summarize funnel health, response rates, and bottlenecks.", "汇总投递漏斗、回复率和当前瓶颈。", "Progress snapshot.", "求职进度快照。")
    if "gap_analysis" in detected:
        add("analyze_fit", "Analyze Fit Gaps", "分析匹配差距", "Fit Agent", "/coach", "Compare resume context against selected jobs and identify gaps.", "对比简历与目标岗位，识别技能和经历差距。", "Gap analysis.", "差距分析。")
    if "mock_interview" in detected:
        add("mock_interview", "Run Interview Practice", "进行模拟面试", "Coach Agent", "/coach", "Run technical or behavioral practice based on the target role.", "基于目标岗位进行技术或行为面试练习。", "Interview practice session.", "模拟面试练习。")
    if "written_practice" in detected:
        add("written_practice", "Practice Assessment", "练习笔试测评", "Coach Agent", "/coach", "Create SQL, Python, analytics, or written assessment drills.", "生成 SQL、Python、数据分析或笔试测评练习。", "Practice set and feedback loop.", "练习题与反馈循环。")

    stages = []
    previous_ids = []
    for index, spec in enumerate(specs[:7]):
        stage_id, title_en, title_zh, agent, route, action_en, action_zh, output_en, output_zh = spec
        status = "complete" if index == 0 else ("ready" if index == 1 else "planned")
        stages.append(_stage(stage_id, title_zh if zh else title_en, agent, route, action_zh if zh else action_en, previous_ids[-1:] if previous_ids else [], status, True, output_zh if zh else output_en))
        previous_ids.append(stage_id)
    return stages


def _handoff_for_stage(stage: dict):
    route = stage.get("route", "/workspace")
    route_tool = {
        "/profile": "go_to_profile",
        "/recommendations": "search_adzuna_jobs",
        "/import-jobs": "parse_job_post",
        "/dashboard": "view_dashboard",
        "/insights": "view_insights",
        "/coach": "start_gap_analysis",
    }
    selected_tool = route_tool.get(route, "offer_platform_guidance")
    return selected_tool, route, {
        "/profile": "profile_setup",
        "/recommendations": "job_discovery",
        "/import-jobs": "job_import",
        "/dashboard": "dashboard_tracking",
        "/insights": "insights",
        "/coach": "gap_analysis",
    }.get(route, "general_guidance")


def _extract_tool_args(message: str, detected: list[str]):
    args = {"source": "fallback_harness"}
    lower = message.lower()
    if "sql" in lower:
        args["focus_topic"] = "SQL"
    elif "python" in lower:
        args["focus_topic"] = "Python"
    if any(term in lower for term in ["chicago", "芝加哥"]):
        args["location"] = "Chicago"
    if any(term in lower for term in ["h1b", "visa", "sponsor", "担保"]):
        args["sponsorship"] = True
    if "written_practice" in detected:
        args["mode"] = "written_practice"
    elif "mock_interview" in detected:
        args["mode"] = "mock_interview"
    elif "gap_analysis" in detected:
        args["mode"] = "gap_analysis"
    return args


def _zh_goal_from_intents(detected: list[str]):
    if len(detected) > 1:
        return "把复杂求职目标拆成可执行的多智能体 todo，并按依赖推进。"
    return {
        "profile_setup": "完善个人资料，为后续匹配和辅导提供上下文。",
        "job_discovery": "寻找并筛选匹配岗位。",
        "job_import": "导入岗位描述并生成结构化记录。",
        "dashboard_tracking": "追踪投递状态并安排下一步。",
        "insights": "复盘求职进度并识别瓶颈。",
        "gap_analysis": "分析简历与目标岗位的差距。",
        "mock_interview": "进行针对性的模拟面试练习。",
        "written_practice": "进行笔试或技术测评练习。",
    }.get(detected[0], "规划下一步求职工作流。")


def _en_goal_from_intents(detected: list[str]):
    if len(detected) > 1:
        return "Break a complex job-search goal into executable multi-agent todos with dependencies."
    return {
        "profile_setup": "Prepare profile context for matching and coaching.",
        "job_discovery": "Find and prioritize matching jobs.",
        "job_import": "Import a job description into a structured record.",
        "dashboard_tracking": "Track applications and next actions.",
        "insights": "Review progress and identify bottlenecks.",
        "gap_analysis": "Analyze profile-to-job fit gaps.",
        "mock_interview": "Run targeted mock interview practice.",
        "written_practice": "Practice for written or technical assessments.",
    }.get(detected[0], "Plan the next useful job-search workflow.")


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
    if intent == "insights":
        return _insights_stages()
    return _guidance_stages()


def _agent_for_tool(selected_tool: str):
    return {
        "go_to_profile": "Profile Agent",
        "search_adzuna_jobs": "Job Search Agent",
        "parse_job_post": "Job Parser Agent",
        "view_dashboard": "Tracker Agent",
        "view_insights": "Insights Agent",
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
        _stage("profile_save", "Save Profile", "Profile Agent", "/profile", "Persist corrected resume details and preferences to the account.", ["profile_constraints"], "planned", True, "Saved profile."),
        _stage("next_workflow", "Choose Next Workflow", "Goal Agent", "/workspace", "Move to recommendations, job import, or coaching.", ["profile_save"], "planned", True, "Next workflow decision."),
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
        _stage("choose_priority", "Choose Priority", "Fit Agent", "/dashboard", "Identify which applications need action first.", ["update_records"], "planned", True, "Priority list."),
        _stage("prepare_next", "Prepare Next Action", "Coach Agent", "/coach", "Use the highest-priority saved job for gap analysis or practice.", ["choose_priority"], "planned", True, "Preparation workflow."),
    ]


def _insights_stages():
    return [
        _stage("open_insights", "Review Progress Insights", "Insights Agent", "/insights", "Open progress analytics to review funnel health, response rate, and bottlenecks.", [], "ready", True, "Progress insights."),
        _stage("update_pipeline", "Update Tracking Data", "Tracker Agent", "/dashboard", "Update application records if the insights are missing enough tracking data.", ["open_insights"], "planned", True, "Current tracking data."),
        _stage("choose_next_action", "Choose Next Action", "Coach Agent", "/coach", "Turn the biggest bottleneck into a preparation or follow-up action.", ["update_pipeline"], "planned", True, "Next improvement action."),
    ]


def _guidance_stages():
    return [
        _stage("clarify_goal", "Clarify Goal", "Goal Agent", "/workspace", "Identify whether the user wants profile setup, job search, import, tracking, or coaching.", [], "ready", True, "Clear workflow goal."),
        _stage("choose_workflow", "Choose Workflow", "Goal Agent", "/workspace", "Route to the first useful page after the goal is clear.", ["clarify_goal"], "blocked", True, "Selected workflow."),
        _stage("open_workspace", "Open Workspace", "Goal Agent", "/workspace", "Send the user to the selected workflow page.", ["choose_workflow"], "blocked", True, "Next page."),
        _stage("continue_task", "Continue Task", "Goal Agent", "/workspace", "Use the selected page to continue the job-search task.", ["open_workspace"], "blocked", True, "Progress on the chosen workflow."),
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
