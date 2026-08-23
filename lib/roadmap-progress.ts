export type StageStatus = "not-started" | "in-progress" | "completed";

export const ROADMAP_PROGRESS_STORAGE_KEY = "roadmap-progress";
export const PRACTICE_PROGRESS_STORAGE_KEY = "practice-progress";

/** Parses a roadmap-progress localStorage value, tolerant of missing, malformed, or stale (non-string, non-array) data — always returns a usable (possibly empty) set rather than throwing. */
export function parseRoadmapProgress(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("completedStageIds" in parsed) ||
      !Array.isArray((parsed as { completedStageIds: unknown }).completedStageIds)
    ) {
      return new Set();
    }
    return new Set(
      (parsed as { completedStageIds: unknown[] }).completedStageIds.filter((id): id is string => typeof id === "string"),
    );
  } catch {
    return new Set();
  }
}

export function serializeRoadmapProgress(completedStageIds: Set<string>): string {
  return JSON.stringify({ completedStageIds: Array.from(completedStageIds) });
}

export function loadRoadmapProgress(): Set<string> {
  try {
    return parseRoadmapProgress(localStorage.getItem(ROADMAP_PROGRESS_STORAGE_KEY));
  } catch {
    return new Set();
  }
}

export function saveRoadmapProgress(completedStageIds: Set<string>): void {
  try {
    localStorage.setItem(ROADMAP_PROGRESS_STORAGE_KEY, serializeRoadmapProgress(completedStageIds));
  } catch {
    // localStorage unavailable (privacy mode, etc.) — progress just won't persist across reloads.
  }
}

/** Same tolerant-parse shape as parseRoadmapProgress, for the existing practice-progress key written by PracticeClient. */
export function parsePracticeProgress(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function loadPracticeProgress(): Record<string, string> {
  try {
    return parsePracticeProgress(localStorage.getItem(PRACTICE_PROGRESS_STORAGE_KEY));
  } catch {
    return {};
  }
}

/**
 * A stage is "completed" only via explicit user action. Absent that, it's
 * inferred "in progress" when the learner has already practiced (in Practice
 * mode) any question whose category falls within this stage — a free,
 * zero-extra-effort signal from data the site already collects. Falls back
 * to "not started" otherwise. `stageId` is only checked against `completedStageIds`,
 * so a stale id for a stage that no longer exists is simply never matched.
 */
export function computeStageStatus(
  stageId: string,
  stageCategories: string[],
  completedStageIds: Set<string>,
  practiceProgress: Record<string, string>,
  questionCategoryById: Map<string, string>,
): StageStatus {
  if (completedStageIds.has(stageId)) return "completed";

  const categorySet = new Set(stageCategories);
  for (const questionId of Object.keys(practiceProgress)) {
    const category = questionCategoryById.get(questionId);
    if (category && categorySet.has(category)) return "in-progress";
  }
  return "not-started";
}
