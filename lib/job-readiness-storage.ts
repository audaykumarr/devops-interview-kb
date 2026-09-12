import type { JobSessionRecord } from "./job-readiness";

const JOB_READINESS_HISTORY_KEY = "job-specific-session-history";

function isJobSessionRecord(value: unknown): value is JobSessionRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<JobSessionRecord>;
  return (
    typeof candidate.jdFingerprint === "string" &&
    typeof candidate.completedAt === "number" &&
    Array.isArray(candidate.answers) &&
    !!candidate.explanations &&
    typeof candidate.explanations === "object"
  );
}

export function parseJobSessionRecords(raw: string | null): JobSessionRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isJobSessionRecord) : [];
  } catch {
    return [];
  }
}

export function loadJobSessionRecords(): JobSessionRecord[] {
  try {
    return parseJobSessionRecords(localStorage.getItem(JOB_READINESS_HISTORY_KEY));
  } catch {
    return [];
  }
}

export function loadJobSessionRecordsForFingerprint(jdFingerprint: string): JobSessionRecord[] {
  return loadJobSessionRecords().filter((r) => r.jdFingerprint === jdFingerprint);
}

export function appendJobSessionRecord(record: JobSessionRecord): void {
  try {
    const records = loadJobSessionRecords();
    records.push(record);
    localStorage.setItem(JOB_READINESS_HISTORY_KEY, JSON.stringify(records));
  } catch {}
}

export function clearJobSessionHistory(): void {
  try {
    localStorage.removeItem(JOB_READINESS_HISTORY_KEY);
  } catch {}
}
