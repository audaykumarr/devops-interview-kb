import { pickRepresentativeQuestions } from "@/scripts/lib/guide-question-selection";
import type { QuestionIndexEntry } from "./questions";
import type { PracticeEntry } from "./questions";

export const INTERVIEW_QUESTION_COUNTS = [5, 10, 15, 20] as const;
export type InterviewQuestionCount = (typeof INTERVIEW_QUESTION_COUNTS)[number];

export const TIME_MODES = ["off", "per-question", "session"] as const;
export type TimeMode = (typeof TIME_MODES)[number];

export const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced", "expert"] as const;

export const SELF_ASSESSMENTS = ["nailed", "partial", "needs-work"] as const;
export type SelfAssessment = (typeof SELF_ASSESSMENTS)[number];

export const SELF_ASSESSMENT_LABELS: Record<SelfAssessment, string> = {
  nailed: "Nailed it",
  partial: "Partially there",
  "needs-work": "Need more work",
};

const SELF_ASSESSMENT_POINTS: Record<SelfAssessment, number> = { nailed: 2, partial: 1, "needs-work": 0 };

/** Backward-compatible mapping onto the practice-progress binary vocabulary, so the Roadmap's
 * stage-in-progress inference (which only checks key presence, not value) keeps working
 * regardless of whether a question was engaged with via /practice or /interview. */
const SELF_ASSESSMENT_TO_PRACTICE_STATUS: Record<SelfAssessment, "known" | "review"> = {
  nailed: "known",
  partial: "review",
  "needs-work": "review",
};

export interface InterviewQuestionEntry {
  id: string;
  category: string;
  subcategory: string;
  difficulty: string;
  question_type: string[];
  interview_level: string[];
  technologies: string[];
  question: string;
  shortAnswer: string;
  url: string;
}

export interface InterviewConfig {
  levels: string[];
  types: string[];
  difficulties: string[];
  categories: string[];
  count: InterviewQuestionCount;
  timeMode: TimeMode;
}

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  levels: [],
  types: [],
  difficulties: [],
  categories: [],
  count: 10,
  timeMode: "session",
};

/** Joins the metadata-rich question index (interview_level, difficulty, etc. — needed for
 * filtering/selection) with the practice set (question/shortAnswer body text — needed for
 * display), by id. Two views of the same content already generated for other features; no new
 * generated artifact needed. */
export function buildInterviewPool(allQuestions: QuestionIndexEntry[], practiceSet: PracticeEntry[]): InterviewQuestionEntry[] {
  const practiceById = new Map(practiceSet.map((p) => [p.id, p]));
  const pool: InterviewQuestionEntry[] = [];
  for (const q of allQuestions) {
    const practice = practiceById.get(q.id);
    if (!practice) continue;
    pool.push({
      id: q.id,
      category: q.category,
      subcategory: q.subcategory,
      difficulty: q.difficulty,
      question_type: q.question_type,
      interview_level: q.interview_level,
      technologies: q.technologies,
      question: practice.question,
      shortAnswer: practice.shortAnswer,
      url: q.url,
    });
  }
  return pool;
}

export function filterInterviewPool(pool: InterviewQuestionEntry[], config: InterviewConfig): InterviewQuestionEntry[] {
  const levelSet = new Set(config.levels);
  const typeSet = new Set(config.types);
  const difficultySet = new Set(config.difficulties);
  const categorySet = new Set(config.categories);

  return pool.filter((q) => {
    if (levelSet.size > 0 && !q.interview_level.some((l) => levelSet.has(l))) return false;
    if (typeSet.size > 0 && !q.question_type.some((t) => typeSet.has(t))) return false;
    if (difficultySet.size > 0 && !difficultySet.has(q.difficulty)) return false;
    if (categorySet.size > 0 && !categorySet.has(q.category)) return false;
    return true;
  });
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Splits `count` seats as evenly as possible across whichever difficulties are actually
 * available, capped by each difficulty's real availability, redistributing any shortfall to
 * difficulties with remaining room (in DIFFICULTY_ORDER) rather than under-filling the session.
 * Pure and deterministic given the same availability counts — the randomness in a session comes
 * from which specific questions and their final order, not from this distribution.
 */
export function computeDifficultyQuota(availableByDifficulty: Record<string, number>, count: number): Record<string, number> {
  const difficulties = DIFFICULTY_ORDER.filter((d) => (availableByDifficulty[d] ?? 0) > 0);
  const quota: Record<string, number> = {};
  if (difficulties.length === 0) return quota;

  let remaining = count;
  const base = Math.floor(count / difficulties.length);
  for (const d of difficulties) {
    const take = Math.min(base, availableByDifficulty[d]!);
    quota[d] = take;
    remaining -= take;
  }

  // Distribute the remainder (from flooring, or from a difficulty with less than its even share
  // available) to difficulties that still have unused capacity, round-robin by DIFFICULTY_ORDER.
  let progress = true;
  while (remaining > 0 && progress) {
    progress = false;
    for (const d of difficulties) {
      if (remaining <= 0) break;
      const used = quota[d] ?? 0;
      if (used < availableByDifficulty[d]!) {
        quota[d] = used + 1;
        remaining -= 1;
        progress = true;
      }
    }
  }

  return quota;
}

/**
 * Builds one interview session: a balanced spread across the available difficulties (not just
 * whatever a plain shuffle happens to produce), with type diversity within each difficulty band
 * via the same pickRepresentativeQuestions() Guides already use, then a final full shuffle so
 * the session's actual question order carries no predictable difficulty curve.
 */
export function selectBalancedSession(
  filteredPool: InterviewQuestionEntry[],
  count: number,
  shuffleFn: <T>(items: T[]) => T[] = shuffle,
): InterviewQuestionEntry[] {
  const byDifficulty = new Map<string, InterviewQuestionEntry[]>();
  for (const q of filteredPool) {
    const list = byDifficulty.get(q.difficulty) ?? [];
    list.push(q);
    byDifficulty.set(q.difficulty, list);
  }

  const availableByDifficulty: Record<string, number> = {};
  for (const [d, list] of byDifficulty) availableByDifficulty[d] = list.length;
  const quota = computeDifficultyQuota(availableByDifficulty, count);

  const selected: InterviewQuestionEntry[] = [];
  for (const d of DIFFICULTY_ORDER) {
    const take = quota[d] ?? 0;
    if (take === 0) continue;
    const bucket = shuffleFn(byDifficulty.get(d) ?? []);
    selected.push(...pickRepresentativeQuestions(bucket, new Set(), take));
  }

  return shuffleFn(selected);
}

export interface AnsweredQuestion {
  id: string;
  difficulty: string;
  question_type: string[];
  interview_level: string[];
  assessment: SelfAssessment;
}

export interface JobMatchExplanation {
  kind: "core-requirement" | "covering-gap" | "validating-claim";
  tag: string;
  label: string;
  reason: string;
}

export interface ActiveInterviewSession {
  config: InterviewConfig;
  questionIds: string[];
  startedAt: number;
  answers: AnsweredQuestion[];
  explanations?: Record<string, JobMatchExplanation>;
  jdFingerprint?: string;
}

export interface CompletedInterviewSession {
  config: InterviewConfig;
  startedAt: number;
  completedAt: number;
  answers: AnsweredQuestion[];
}

export interface InterviewResults {
  totalQuestions: number;
  answeredQuestions: number;
  score: number;
  maxScore: number;
  percentage: number;
  byType: { type: string; nailed: number; partial: number; needsWork: number; total: number }[];
  byLevel: { level: string; nailed: number; partial: number; needsWork: number; total: number }[];
  needsWorkIds: string[];
}

function tally(
  answers: AnsweredQuestion[],
  dimension: (a: AnsweredQuestion) => string[],
): { key: string; nailed: number; partial: number; needsWork: number; total: number }[] {
  const byKey = new Map<string, { nailed: number; partial: number; needsWork: number; total: number }>();
  for (const a of answers) {
    for (const key of dimension(a)) {
      const row = byKey.get(key) ?? { nailed: 0, partial: 0, needsWork: 0, total: 0 };
      row.total += 1;
      if (a.assessment === "nailed") row.nailed += 1;
      else if (a.assessment === "partial") row.partial += 1;
      else row.needsWork += 1;
      byKey.set(key, row);
    }
  }
  return Array.from(byKey.entries()).map(([key, row]) => ({ key, ...row }));
}

export function computeResults(totalQuestions: number, answers: AnsweredQuestion[]): InterviewResults {
  const score = answers.reduce((sum, a) => sum + SELF_ASSESSMENT_POINTS[a.assessment], 0);
  const maxScore = answers.length * 2;

  return {
    totalQuestions,
    answeredQuestions: answers.length,
    score,
    maxScore,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    byType: tally(answers, (a) => a.question_type).map(({ key, ...rest }) => ({ type: key, ...rest })),
    byLevel: tally(answers, (a) => a.interview_level).map(({ key, ...rest }) => ({ level: key, ...rest })),
    needsWorkIds: answers.filter((a) => a.assessment === "needs-work").map((a) => a.id),
  };
}

export function mapAssessmentToPracticeStatus(assessment: SelfAssessment): "known" | "review" {
  return SELF_ASSESSMENT_TO_PRACTICE_STATUS[assessment];
}

const ACTIVE_SESSION_KEY = "interview-active-session";
const SESSION_HISTORY_KEY = "interview-session-history";

export function parseActiveSession(raw: string | null): ActiveInterviewSession | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray((parsed as ActiveInterviewSession).questionIds) ||
      !Array.isArray((parsed as ActiveInterviewSession).answers)
    ) {
      return null;
    }
    return parsed as ActiveInterviewSession;
  } catch {
    return null;
  }
}

export function loadActiveSession(): ActiveInterviewSession | null {
  try {
    return parseActiveSession(localStorage.getItem(ACTIVE_SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveInterviewSession): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable — the session simply won't survive a reload.
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

export function parseSessionHistory(raw: string | null): CompletedInterviewSession[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompletedInterviewSession[]) : [];
  } catch {
    return [];
  }
}

export function loadSessionHistory(): CompletedInterviewSession[] {
  try {
    return parseSessionHistory(localStorage.getItem(SESSION_HISTORY_KEY));
  } catch {
    return [];
  }
}

export function appendSessionHistory(session: CompletedInterviewSession): void {
  try {
    const history = loadSessionHistory();
    history.push(session);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // localStorage unavailable — history just won't be recorded this time.
  }
}
