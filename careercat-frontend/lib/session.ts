export type LocalUserSession = {
  user_id: string;
  created_at: string;
  last_active_at: string;
};

const SESSION_STORAGE_KEY = "careercat_user_session";
const SESSION_CHANGE_EVENT = "careercat-session-change";

function generateUserId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `user_${randomPart}`;
}

function saveSession(session: LocalUserSession) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

export function getStoredSession(): LocalUserSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalUserSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function createLocalSession(): LocalUserSession {
  const now = new Date().toISOString();

  const session: LocalUserSession = {
    user_id: generateUserId(),
    created_at: now,
    last_active_at: now,
  };

  saveSession(session);
  return session;
}

export function getOrCreateLocalSession(): LocalUserSession {
  const existing = getStoredSession();

  if (existing) {
    const updated: LocalUserSession = {
      ...existing,
      last_active_at: new Date().toISOString(),
    };

    saveSession(updated);
    return updated;
  }

  return createLocalSession();
}

export function getCurrentUserId(): string {
  return getOrCreateLocalSession().user_id;
}

export function resetLocalSession(): LocalUserSession {
  clearLocalSession();
  return createLocalSession();
}

export function clearLocalSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}
