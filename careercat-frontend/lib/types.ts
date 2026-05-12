export type BasicContactInfo = {
  full_name: string;
  email: string;
  phone: string;
  location: string;
};

export type EducationEntry = {
  school_name: string;
  degree: string;
  major: string;
  start_date: string;
  end_date: string;
  details: string;
};

export type ExperienceEntry = {
  company_name: string;
  employment_type: string;
  job_title: string;
  start_date: string;
  end_date: string;
  details: string;
};

export type ProjectEntry = {
  project_name: string;
  project_role: string;
  start_date: string;
  end_date: string;
  details: string;
};

export type UserProfile = {
  user_id: string;
  basic_info: BasicContactInfo;
  resume_text: string;
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  projects: ProjectEntry[];
  target_roles: string[];
  preferred_locations: string[];
  sponsorship_need: boolean;
  known_skills: string[];
  created_at?: string;
  updated_at?: string;
};

export type ParsedResumeResponse = {
  user_id: string;
  basic_info: BasicContactInfo;
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: string[];
  raw_text: string;
  source_file_name?: string | null;
};

export type JobPost = {
  job_id: string;
  user_id: string;
  company: string;
  title: string;
  location: string;
  work_mode: string;
  employment_type: string;
  seniority: string;
  visa_sponsorship: string;
  salary_range: string;
  posting_date: string;
  required_skills: string[];
  preferred_skills: string[];
  requirements: string[];
  responsibilities: string[];
  summary: string;
  raw_job_text: string;
  status: JobApplicationStatus;
  application_date: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
  fit_score?: number;
  action_recommendation?: string;
};

export type JobApplicationStatus =
  | "not_applied"
  | "applied"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected";

export type JobUpdatePayload = {
  company?: string;
  title?: string;
  location?: string;
  work_mode?: string;
  employment_type?: string;
  seniority?: string;
  visa_sponsorship?: string;
  salary_range?: string;
  posting_date?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  requirements?: string[];
  responsibilities?: string[];
  summary?: string;
  raw_job_text?: string;
  status?: JobApplicationStatus;
  application_date?: string;
  notes?: string;
};

export type JobRecommendation = {
  recommendation_id: string;
  source: string;
  source_job_id: string;
  external_url: string;
  company: string;
  title: string;
  location: string;
  work_mode: string;
  employment_type: string;
  seniority: string;
  visa_sponsorship: string;
  salary_range: string;
  posting_date: string;
  required_skills: string[];
  preferred_skills: string[];
  requirements: string[];
  responsibilities: string[];
  summary: string;
  raw_job_text: string;
  match_score: number;
  match_reasons: string[];
  missing_skills: string[];
};

export type JobDiscoveryRequest = {
  user_id: string;
  keywords: string;
  location: string;
  country: string;
  posted_within_days: number;
  results_per_page: number;
  remote_only: boolean;
  salary_min?: number;
};

export type SkillInsight = {
  top_skills: string[];
  missing_skills: string[];
  recommended_skills: string[];
};

export type InterviewPrep = {
  behavioral_questions: string[];
  technical_topics: string[];
  assessment_focus: string[];
  prep_plan: string[];
};

export type CoachMode = "gap_analysis" | "mock_interview" | "written_practice";

export type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CoachSession = {
  user_id: string;
  session_id: string;
  title: string;
  mode: CoachMode;
  subtype?: string;
  job_id?: string;
  focus_topic?: string;
  messages: CoachMessage[];
  created_at?: string;
  updated_at?: string;
};

export type CoachChatRequest = {
  user_id: string;
  mode: CoachMode;
  subtype?: string;
  job_id?: string;
  focus_topic?: string;
  messages: CoachMessage[];
  locale?: "en" | "zh";
};

export type AgentAssistRequest = {
  user_id: string;
  message: string;
  current_page: string;
  locale?: "en" | "zh";
};

export type InlineActionType = "file_upload" | "navigate" | "quick_select" | "confirm_or_continue";

export type InlineAction = {
  id: string;
  type: InlineActionType;
  label: string;
  // file_upload
  accept?: string;
  // navigate
  target?: string;
  // quick_select
  options?: { label: string; value: string }[];
  // confirm_or_continue
  confirm_label?: string;
  confirm_route?: string;
  continue_label?: string;
  // flow
  depends_on?: string;
  on_complete?: string;
};

export type AgentAssistResponse = {
  reply: string;
  intent: string;
  selected_tool: string;
  route: string;
  reason: string;
  needs_user_input: boolean;
  follow_up_question?: string | null;
  tool_args: Record<string, unknown>;
  workflow_goal: string;
  current_stage_id: string;
  stages: WorkflowStage[];
  suggested_actions?: WorkflowSuggestedAction[];
  inline_actions?: InlineAction[];
  harness?: {
    mode?: string;
    coordinator?: string;
    selected_handoff?: string;
    next_route?: string;
    agents?: string[];
    todo_count?: number;
    ready_count?: number;
    blocked_count?: number;
  };
};

export type WorkflowSuggestedAction = {
  id: string;
  label: string;
  route: string;
  reason?: string;
};

export type WorkflowStage = {
  id: string;
  title: string;
  agent: string;
  action: string;
  route: string;
  depends_on: string[];
  status: "ready" | "blocked" | "planned" | "complete";
  needs_user_input: boolean;
  output: string;
};

export type WorkflowChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  plan?: AgentAssistResponse;
  inline_actions?: InlineAction[];
};

export type WorkflowHistoryEntry = {
  user_id: string;
  workflow_id: string;
  title: string;
  messages: WorkflowChatMessage[];
  plan: AgentAssistResponse;
  completed_task_ids: string[];
  completed_inline_action_ids?: string[];
  created_at?: string;
  updated_at?: string;
};
