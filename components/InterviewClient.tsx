"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DifficultyBadge, TypeBadge } from "./Badge";
import { JobReadinessPanel } from "./JobReadinessPanel";
import { JobSpecificSetup } from "./JobSpecificSetup";
import { MarkdownSection } from "./MarkdownSection";
import { PRACTICE_PROGRESS_STORAGE_KEY, loadPracticeProgress } from "@/lib/roadmap-progress";
import { labelize } from "@/lib/format";
import { buildRequirementAssessments, type JobSpecificBuildResult } from "@/lib/job-match";
import { appendJobSessionRecord, loadJobSessionRecordsForFingerprint } from "@/lib/job-readiness-storage";
import { loadJobProfile } from "@/lib/job-session-storage";
import type { TaxonomyCategory } from "@/lib/questions";
import {
  DEFAULT_INTERVIEW_CONFIG,
  DIFFICULTY_ORDER,
  INTERVIEW_QUESTION_COUNTS,
  SELF_ASSESSMENTS,
  SELF_ASSESSMENT_LABELS,
  TIME_MODES,
  clearActiveSession,
  appendSessionHistory,
  computeResults,
  filterInterviewPool,
  loadActiveSession,
  loadSessionHistory,
  mapAssessmentToPracticeStatus,
  saveActiveSession,
  selectBalancedSession,
  type ActiveInterviewSession,
  type AnsweredQuestion,
  type InterviewConfig,
  type InterviewQuestionCount,
  type InterviewQuestionEntry,
  type SelfAssessment,
  type TimeMode,
} from "@/lib/interview-session";

type InterviewMode = "general" | "job-specific";
const RECENT_HISTORY_SESSIONS = 3;

const TIME_MODE_LABELS: Record<TimeMode, string> = { off: "Off", "per-question": "Per-question guideline", session: "Session budget" };
const SECONDS_PER_QUESTION_BUDGET = 90;

type Phase = "config" | "active" | "results";

function formatSeconds(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

function configFromParams(params: URLSearchParams): InterviewConfig {
  const list = (key: string) => (params.get(key) ? params.get(key)!.split(",").filter(Boolean) : []);
  const count = Number(params.get("count"));
  const validCount = (INTERVIEW_QUESTION_COUNTS as readonly number[]).includes(count) ? (count as InterviewQuestionCount) : DEFAULT_INTERVIEW_CONFIG.count;
  const time = params.get("time");
  const validTime = (TIME_MODES as readonly string[]).includes(time ?? "") ? (time as TimeMode) : DEFAULT_INTERVIEW_CONFIG.timeMode;

  return {
    levels: list("level"),
    types: list("type"),
    difficulties: list("difficulty"),
    categories: list("category"),
    count: validCount,
    timeMode: validTime,
  };
}

function configToParams(config: InterviewConfig): URLSearchParams {
  const params = new URLSearchParams();
  if (config.levels.length) params.set("level", config.levels.join(","));
  if (config.types.length) params.set("type", config.types.join(","));
  if (config.difficulties.length) params.set("difficulty", config.difficulties.join(","));
  if (config.categories.length) params.set("category", config.categories.join(","));
  if (config.count !== DEFAULT_INTERVIEW_CONFIG.count) params.set("count", String(config.count));
  if (config.timeMode !== DEFAULT_INTERVIEW_CONFIG.timeMode) params.set("time", config.timeMode);
  return params;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const CHIP_BASE = "rounded-full border px-3 py-1.5 text-sm";
const CHIP_ON = "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300";
const CHIP_OFF = "border-slate-300 text-slate-600 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-400";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${CHIP_BASE} ${active ? CHIP_ON : CHIP_OFF}`}>
      {children}
    </button>
  );
}

export function InterviewClient({
  pool,
  categories,
  levels,
  types,
}: {
  pool: InterviewQuestionEntry[];
  categories: TaxonomyCategory[];
  levels: { slug: string; label: string }[];
  types: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [config, setConfig] = useState<InterviewConfig>(() => configFromParams(searchParams));
  const [mode, setMode] = useState<InterviewMode>("general");
  const [phase, setPhase] = useState<Phase>("config");
  const [session, setSession] = useState<ActiveInterviewSession | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [resumable, setResumable] = useState<ActiveInterviewSession | null>(null);
  const restoredRef = useRef(false);

  // Detect a session left in progress (from a reload, or from navigating away and back) exactly
  // once on mount — but never silently jump into it. Landing on /interview should always show a
  // clear, known state; resuming is an explicit choice offered on the config screen instead.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const active = loadActiveSession();
    if (active && active.questionIds.length > 0 && active.answers.length < active.questionIds.length) {
      setResumable(active);
    }
  }, []);

  function resumeSession(active: ActiveInterviewSession) {
    setSession(active);
    setIndex(active.answers.length);
    setConfig(active.config);
    setResumable(null);
    setPhase("active");
    setAnnouncement(`Resumed. Question ${active.answers.length + 1} of ${active.questionIds.length}.`);
  }

  function discardResumableSession() {
    clearActiveSession();
    setResumable(null);
  }

  useEffect(() => {
    if (phase !== "active" || config.timeMode === "off") return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase, config.timeMode]);

  const filtered = useMemo(() => filterInterviewPool(pool, config), [pool, config]);
  const matchedCount = Math.min(filtered.length, config.count);

  function updateConfig(next: InterviewConfig) {
    setConfig(next);
    const query = configToParams(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function startSession() {
    const questions = selectBalancedSession(filtered, config.count);
    const newSession: ActiveInterviewSession = { config, questionIds: questions.map((q) => q.id), startedAt: Date.now(), answers: [] };
    saveActiveSession(newSession);
    setSession(newSession);
    setIndex(0);
    setRevealed(false);
    setElapsedSeconds(0);
    setResumable(null);
    setAnnouncement(`Interview started. Question 1 of ${questions.length}.`);
    setPhase("active");
  }

  const recentlySeenIds = useMemo(() => {
    const history = loadSessionHistory().slice(-RECENT_HISTORY_SESSIONS);
    return new Set(history.flatMap((h) => h.answers.map((a) => a.id)));
  }, []);

  function startJobSpecificSession(result: JobSpecificBuildResult, count: InterviewQuestionCount, timeMode: TimeMode, jdFingerprint: string) {
    const jobConfig: InterviewConfig = { ...DEFAULT_INTERVIEW_CONFIG, count: (result.questionIds.length || 1) as InterviewQuestionCount, timeMode };
    const newSession: ActiveInterviewSession = {
      config: jobConfig,
      questionIds: result.questionIds,
      startedAt: Date.now(),
      answers: [],
      explanations: result.explanations,
      jdFingerprint,
    };
    saveActiveSession(newSession);
    setConfig(jobConfig);
    setSession(newSession);
    setIndex(0);
    setRevealed(false);
    setElapsedSeconds(0);
    setResumable(null);
    setAnnouncement(`Interview started. Question 1 of ${result.questionIds.length}.`);
    setPhase("active");
  }

  const sessionQuestions = useMemo(() => {
    if (!session) return [];
    const byId = new Map(pool.map((q) => [q.id, q]));
    return session.questionIds.map((id) => byId.get(id)).filter((q): q is InterviewQuestionEntry => q !== undefined);
  }, [session, pool]);

  const current = sessionQuestions[index];

  function assess(assessment: SelfAssessment) {
    if (!session || !current) return;
    const answered: AnsweredQuestion = {
      id: current.id,
      difficulty: current.difficulty,
      question_type: current.question_type,
      interview_level: current.interview_level,
      assessment,
    };
    const nextSession: ActiveInterviewSession = { ...session, answers: [...session.answers, answered] };

    // Cross-write into the existing practice-progress key so the Roadmap's stage-in-progress
    // inference (which only checks key presence, not value) keeps working regardless of
    // whether this question was engaged with via /practice or /interview.
    try {
      const practiceProgress = loadPracticeProgress();
      practiceProgress[current.id] = mapAssessmentToPracticeStatus(assessment);
      localStorage.setItem(PRACTICE_PROGRESS_STORAGE_KEY, JSON.stringify(practiceProgress));
    } catch {
      // localStorage unavailable — cross-write just won't persist this time.
    }

    if (index + 1 < sessionQuestions.length) {
      saveActiveSession(nextSession);
      setSession(nextSession);
      setIndex(index + 1);
      setRevealed(false);
      setAnnouncement(`Question ${index + 2} of ${sessionQuestions.length}.`);
    } else {
      const completedAt = Date.now();
      appendSessionHistory({ config: nextSession.config, startedAt: nextSession.startedAt, completedAt, answers: nextSession.answers });
      if (nextSession.jdFingerprint && nextSession.explanations) {
        appendJobSessionRecord({ jdFingerprint: nextSession.jdFingerprint, completedAt, answers: nextSession.answers, explanations: nextSession.explanations });
      }
      clearActiveSession();
      setSession(nextSession);
      setAnnouncement("Interview complete. Showing your results.");
      setPhase("results");
    }
  }

  function endEarly() {
    if (!session) return;
    const completedAt = Date.now();
    appendSessionHistory({ config: session.config, startedAt: session.startedAt, completedAt, answers: session.answers });
    if (session.jdFingerprint && session.explanations) {
      appendJobSessionRecord({ jdFingerprint: session.jdFingerprint, completedAt, answers: session.answers, explanations: session.explanations });
    }
    clearActiveSession();
    setAnnouncement("Interview ended early. Showing your results.");
    setPhase("results");
  }

  function retrySameConfiguration() {
    startSession();
  }

  function newConfiguration() {
    if (session?.explanations) setMode("job-specific");
    setSession(null);
    setPhase("config");
    setAnnouncement("Back to interview configuration.");
  }

  const results = phase === "results" && session ? computeResults(session.questionIds.length, session.answers) : null;

  const jobReadinessData = useMemo(() => {
    if (!session?.jdFingerprint) return null;
    const profile = loadJobProfile();
    if (!profile) return null;
    const assessments = buildRequirementAssessments(profile.requirements, profile.resumeSkills);
    const records = loadJobSessionRecordsForFingerprint(session.jdFingerprint);
    return { assessments, resumeSkills: profile.resumeSkills, records };
  }, [session?.jdFingerprint, phase]);
  const budgetSeconds = config.count * SECONDS_PER_QUESTION_BUDGET;
  const remaining = budgetSeconds - elapsedSeconds;

  return (
    <div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <p className="mb-6 max-w-2xl text-slate-600 dark:text-slate-400">
        {mode === "general"
          ? "Configure a timed, assessment-style mock interview — pick a level, question types, and difficulty, then self-score your answers and see a breakdown at the end."
          : "Turn your job description and resume into a personalized, timed mock interview — built from the same question bank, but weighted toward the skills, gaps, and claims that matter most for the role, then self-score your answers and see a breakdown at the end."}
      </p>

      {phase === "config" && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
            <Chip active={mode === "general"} onClick={() => setMode("general")}>
              General Interview
            </Chip>
            <Chip active={mode === "job-specific"} onClick={() => setMode("job-specific")}>
              Job-Specific Interview
            </Chip>
          </div>

          {resumable && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
              <p className="text-sm text-indigo-900 dark:text-indigo-200">
                You have an interview in progress — question {resumable.answers.length + 1} of {resumable.questionIds.length}.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => resumeSession(resumable)}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Resume Interview
                </button>
                <button
                  type="button"
                  onClick={discardResumableSession}
                  className="rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900"
                >
                  Discard and Start Fresh
                </button>
              </div>
            </div>
          )}

          {mode === "job-specific" && <JobSpecificSetup pool={pool} recentlySeenIds={recentlySeenIds} onBuild={startJobSpecificSession} />}

          {mode === "general" && (
          <>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Interview Level</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {levels.map((l) => (
                <Chip key={l.slug} active={config.levels.includes(l.slug)} onClick={() => updateConfig({ ...config, levels: toggle(config.levels, l.slug) })}>
                  {l.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Question Type</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {types.map((t) => (
                <Chip key={t} active={config.types.includes(t)} onClick={() => updateConfig({ ...config, types: toggle(config.types, t) })}>
                  {labelize(t)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Difficulty</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTY_ORDER.map((d) => (
                <Chip key={d} active={config.difficulties.includes(d)} onClick={() => updateConfig({ ...config, difficulties: toggle(config.difficulties, d) })}>
                  {labelize(d)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Category</h2>
            <select
              value={config.categories[0] ?? ""}
              onChange={(e) => updateConfig({ ...config, categories: e.target.value ? [e.target.value] : [] })}
              className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Number of Questions</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERVIEW_QUESTION_COUNTS.map((c) => (
                <Chip key={c} active={config.count === c} onClick={() => updateConfig({ ...config, count: c })}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Time Limit</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_MODES.map((t) => (
                <Chip key={t} active={config.timeMode === t} onClick={() => updateConfig({ ...config, timeMode: t })}>
                  {TIME_MODE_LABELS[t]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {filtered.length === 0
                ? "No questions match these filters."
                : matchedCount < config.count
                  ? `Only ${filtered.length} question${filtered.length === 1 ? "" : "s"} match — starting with ${matchedCount}.`
                  : `${filtered.length} questions match. This session will use ${matchedCount}.`}
            </p>
            <button
              type="button"
              onClick={startSession}
              disabled={matchedCount === 0}
              className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Interview
            </button>
          </div>
          </>
          )}
        </div>
      )}

      {phase === "active" && current && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <p>
              Question {index + 1} of {sessionQuestions.length}
            </p>
            {config.timeMode === "session" && (
              <p className={remaining < 0 ? "font-medium text-amber-600 dark:text-amber-400" : ""}>
                {remaining < 0 ? `+${formatSeconds(-remaining)} over` : `${formatSeconds(remaining)} remaining`}
              </p>
            )}
            {config.timeMode === "per-question" && <p>~{SECONDS_PER_QUESTION_BUDGET}s suggested · {formatSeconds(elapsedSeconds)} elapsed</p>}
            <button type="button" onClick={endEarly} className="text-slate-400 underline decoration-slate-300 underline-offset-2 hover:text-slate-600 dark:decoration-slate-700 dark:hover:text-slate-300">
              End session early
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5">
              <DifficultyBadge difficulty={current.difficulty} />
              {current.question_type.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>

            <p className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">{current.question}</p>

            {session?.explanations?.[current.id] && (
              <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-400">{session.explanations[current.id]!.reason}</p>
            )}

            {revealed && (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <MarkdownSection content={current.shortAnswer} />
                <Link href={current.url} className="mt-3 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                  View full explanation →
                </Link>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {!revealed ? (
                <button type="button" onClick={() => setRevealed(true)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                  Reveal Answer
                </button>
              ) : (
                SELF_ASSESSMENTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => assess(a)}
                    className={
                      a === "nailed"
                        ? "rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                        : a === "partial"
                          ? "rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                          : "rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
                    }
                  >
                    {SELF_ASSESSMENT_LABELS[a]}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "results" && results && (
        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {results.score} / {results.maxScore} points · {results.percentage}%
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {results.answeredQuestions} of {results.totalQuestions} questions answered
            </p>
          </div>

          {jobReadinessData && (
            <div className="mt-6">
              <JobReadinessPanel
                assessments={jobReadinessData.assessments}
                resumeSkills={jobReadinessData.resumeSkills}
                records={jobReadinessData.records}
                pool={pool}
              />
            </div>
          )}

          {results.byType.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">By Question Type</h2>
              <div className="mt-2 space-y-1.5">
                {results.byType.map((row) => (
                  <p key={row.type} className="text-sm text-slate-600 dark:text-slate-400">
                    {labelize(row.type)}: {row.nailed} nailed · {row.partial} partial · {row.needsWork} need work (of {row.total})
                  </p>
                ))}
              </div>
            </div>
          )}

          {results.byLevel.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">By Interview Level</h2>
              <div className="mt-2 space-y-1.5">
                {results.byLevel.map((row) => (
                  <p key={row.level} className="text-sm text-slate-600 dark:text-slate-400">
                    {labelize(row.level)}: {row.nailed} nailed · {row.partial} partial · {row.needsWork} need work (of {row.total})
                  </p>
                ))}
              </div>
            </div>
          )}

          {results.needsWorkIds.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Worth Revisiting</h2>
              <ul className="mt-2 space-y-2">
                {results.needsWorkIds.map((id) => {
                  const q = sessionQuestions.find((sq) => sq.id === id);
                  if (!q) return null;
                  return (
                    <li key={id}>
                      <Link href={q.url} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                        {q.question.length > 100 ? `${q.question.slice(0, 100)}…` : q.question}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!session?.explanations && (
              <button type="button" onClick={retrySameConfiguration} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                Retry Same Configuration
              </button>
            )}
            <button
              type="button"
              onClick={newConfiguration}
              className={
                session?.explanations
                  ? "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                  : "rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              }
            >
              {session?.explanations ? "Rebuild From Same JD / Resume" : "New Configuration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
