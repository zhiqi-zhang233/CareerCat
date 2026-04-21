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
};

export type AgentAssistRequest = {
  user_id: string;
  message: string;
  current_page: string;
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
};

export type AgentRun = {
  user_id: string;
  run_id: string;
  action_type: string;
  selected_tool: string;
  route: string;
  input_summary: string;
  model_output_summary: string;
  tool_result_summary: string;
  success: boolean;
  latency_ms: number;
  error_message: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type MetricCard = {
  label: string;
  value: string;
  explanation: string;
};

export type ObservabilityMetrics = {
  user_id: string;
  total_runs: number;
  success_rate: number;
  average_latency_ms: number;
  failure_count: number;
  action_counts: Record<string, number>;
  tool_counts: Record<string, number>;
  latest_run_at: string;
  metric_cards: MetricCard[];
};

export type SponsorshipFilterCase = {
  case_id: string;
  label: string;
  job_text: string;
  expected_visa_sponsorship: string;
  detected_visa_sponsorship: string;
  expected_action: string;
  actual_action: string;
  passed: boolean;
  explanation: string;
};

export type SponsorshipFilterCheck = {
  user_id: string;
  metric_name: string;
  sample_count: number;
  accuracy: number;
  passed_cases: number;
  total_cases: number;
  current_profile_requires_sponsorship: boolean;
  decision_rule: string;
  cases: SponsorshipFilterCase[];
};
