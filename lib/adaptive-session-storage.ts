import type { AdaptiveInterviewSession, AdaptiveSessionRecord } from "./adaptive-interview";

const ACTIVE_KEY = "adaptive-interview-active-session";
const HISTORY_KEY = "adaptive-interview-history";

function isAdaptiveInterviewSession(value: unknown): value is AdaptiveInterviewSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AdaptiveInterviewSession>;
  return (
    typeof candidate.jdFingerprint === "string" &&
    Array.isArray(candidate.questionIds) &&
    Array.isArray(candidate.turns) &&
    Array.isArray(candidate.evaluations) &&
    typeof candidate.currentCanonicalIndex === "number"
  );
}

export function parseActiveAdaptiveSession(raw: string | null): AdaptiveInterviewSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAdaptiveInterviewSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadActiveAdaptiveSession(): AdaptiveInterviewSession | null {
  try {
    return parseActiveAdaptiveSession(localStorage.getItem(ACTIVE_KEY));
  } catch {
    return null;
  }
}

export function saveActiveAdaptiveSession(session: AdaptiveInterviewSession): void {
  try {
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  } catch {}
}

export function clearActiveAdaptiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

function isAdaptiveSessionRecord(value: unknown): value is AdaptiveSessionRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AdaptiveSessionRecord>;
  return typeof candidate.completedAt === "number" && isAdaptiveInterviewSession(candidate.session);
}

export function parseAdaptiveHistory(raw: string | null): AdaptiveSessionRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isAdaptiveSessionRecord) : [];
  } catch {
    return [];
  }
}

export function loadAdaptiveHistory(): AdaptiveSessionRecord[] {
  try {
    return parseAdaptiveHistory(localStorage.getItem(HISTORY_KEY));
  } catch {
    return [];
  }
}

export function appendAdaptiveHistory(record: AdaptiveSessionRecord): void {
  try {
    const history = loadAdaptiveHistory();
    history.push(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export function clearAdaptiveHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
}

export function clearAllAdaptiveData(): void {
  clearActiveAdaptiveSession();
  clearAdaptiveHistory();
}
