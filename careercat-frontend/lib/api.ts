import { getCurrentAuthToken } from "./authToken";
import type {
  AgentAssistRequest,
  CoachChatRequest,
  CoachSession,
  JobDiscoveryRequest,
  JobRecommendation,
  JobUpdatePayload,
  UserProfile,
  WorkflowHistoryEntry,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export { API_BASE_URL };

async function buildHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = await getCurrentAuthToken();

  if (token) {
    nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  return nextHeaders;
}

export async function fetchHealthCheck() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to fetch health check");
  }

  return response.json();
}

/* =========================
   Profile
========================= */

export async function createProfile(profileData: UserProfile) {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    throw new Error("Failed to create profile");
  }

  return response.json();
}

export async function fetchProfile(userId: string) {
  const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  return response.json();
}

export async function updateProfile(userId: string, profileData: UserProfile) {
  const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
    method: "PUT",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    throw new Error("Failed to update profile");
  }

  return response.json();
}

export async function parseResume(userId: string, resumeText: string) {
  const response = await fetch(`${API_BASE_URL}/profile/parse-resume`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      user_id: userId,
      resume_text: resumeText,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to parse resume");
  }

  return response.json();
}

export async function parseResumeFile(userId: string, file: File) {
  const formData = new FormData();
  formData.append("user_id", userId);
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/profile/parse-resume-file`, {
    method: "POST",
    headers: await buildHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to parse resume file");
  }

  return response.json();
}

/* =========================
   Jobs
========================= */

export async function importJobPost(jobData: {
  user_id: string;
  raw_job_text: string;
  force_save?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/jobs/import`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    throw new Error("Failed to import job post");
  }

  return response.json();
}

export async function parseJobPost(jobData: {
  user_id: string;
  raw_job_text: string;
}) {
  const response = await fetch(`${API_BASE_URL}/jobs/parse`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to parse job post");
  }

  return response.json();
}

export async function createJobPost(jobData: {
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
  status?: JobUpdatePayload["status"];
  application_date?: string;
  notes?: string;
  force_save?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to save job post");
  }

  return response.json();
}

export async function fetchUserJobs(userId: string) {
  const response = await fetch(`${API_BASE_URL}/jobs/${userId}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user jobs");
  }

  return response.json();
}

export async function updateJobPost(
  userId: string,
  jobId: string,
  updates: JobUpdatePayload
) {
  const response = await fetch(`${API_BASE_URL}/jobs/${userId}/${jobId}`, {
    method: "PATCH",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Failed to update job post");
  }

  return response.json();
}

export async function deleteJobPost(userId: string, jobId: string) {
  const response = await fetch(`${API_BASE_URL}/jobs/${userId}/${jobId}`, {
    method: "DELETE",
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete job post");
  }

  return response.json();
}

export async function discoverAdzunaJobs(payload: JobDiscoveryRequest) {
  const response = await fetch(`${API_BASE_URL}/job-discovery/adzuna`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to discover jobs");
  }

  return response.json();
}

export async function saveJobRecommendation(
  userId: string,
  recommendation: JobRecommendation
) {
  const response = await fetch(`${API_BASE_URL}/job-discovery/save`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      user_id: userId,
      recommendation,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to save recommendation");
  }

  return response.json();
}

export async function fetchRecommendedJobs(userId: string) {
  const response = await fetch(`${API_BASE_URL}/recommend/${userId}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recommended jobs");
  }

  return response.json();
}

export async function fetchFitAnalysis(userId: string) {
  const response = await fetch(`${API_BASE_URL}/analysis/fit/${userId}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch fit analysis");
  }

  return response.json();
}

export async function fetchInterviewPrep(userId: string, jobId: string) {
  const response = await fetch(`${API_BASE_URL}/coach/${userId}/${jobId}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch interview prep");
  }

  return response.json();
}

export async function sendCoachChat(payload: CoachChatRequest) {
  const response = await fetch(`${API_BASE_URL}/coach/chat`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to send coach message");
  }

  return response.json();
}

export async function fetchCoachSessions(
  userId: string
): Promise<{ user_id: string; sessions: CoachSession[] }> {
  const response = await fetch(`${API_BASE_URL}/coach/sessions/${userId}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch coach sessions");
  }

  return response.json();
}

export async function saveCoachSession(session: CoachSession) {
  const response = await fetch(
    `${API_BASE_URL}/coach/sessions/${session.user_id}/${session.session_id}`,
    {
      method: "PUT",
      headers: await buildHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(session),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to save coach session");
  }

  return response.json();
}

export async function deleteCoachSession(userId: string, sessionId: string) {
  const response = await fetch(
    `${API_BASE_URL}/coach/sessions/${userId}/${sessionId}`,
    {
      method: "DELETE",
      headers: await buildHeaders(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete coach session");
  }

  return response.json();
}

export async function sendAgentAssist(payload: AgentAssistRequest) {
  const response = await fetch(`${API_BASE_URL}/agent/assist`, {
    method: "POST",
    headers: await buildHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to run the workflow agent");
  }

  return response.json();
}

export async function fetchWorkflowHistory(
  userId: string
): Promise<{ user_id: string; workflows: WorkflowHistoryEntry[] }> {
  const response = await fetch(`${API_BASE_URL}/workflows/history/${userId}`, {
    headers: await buildHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to fetch workflow history");
  }

  return response.json();
}

export async function saveWorkflowHistory(workflow: WorkflowHistoryEntry) {
  const response = await fetch(
    `${API_BASE_URL}/workflows/history/${workflow.user_id}/${workflow.workflow_id}`,
    {
      method: "PUT",
      headers: await buildHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(workflow),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to save workflow history");
  }

  return response.json();
}

export async function deleteWorkflowHistory(userId: string, workflowId: string) {
  const response = await fetch(
    `${API_BASE_URL}/workflows/history/${userId}/${workflowId}`,
    {
      method: "DELETE",
      headers: await buildHeaders(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete workflow history");
  }

  return response.json();
}

/* =========================
   Account Deletion
========================= */

export async function requestAccountDeletion(email: string) {
  const response = await fetch(`${API_BASE_URL}/user/request-deletion`, {
    method: "POST",
    headers: await buildHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to send verification code");
  }

  return response.json();
}

export async function deleteAccount(email: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/user`, {
    method: "DELETE",
    headers: await buildHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete account");
  }

  return response.json();
}
