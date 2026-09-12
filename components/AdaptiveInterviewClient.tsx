"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DifficultyBadge, TypeBadge } from "./Badge";
import { JobReadinessPanel } from "./JobReadinessPanel";
import {
  ANSWER_MAX_LENGTH,
  buildTurnRequest,
  eligibleFollowUpKinds,
  findCanonicalFollowUp,
  isAnswerTooShort,
  isValidTurnResponse,
  projectToJobSessionRecord,
  shortAnswerFallbackEvaluation,
  type AdaptiveEvaluation,
  type AdaptiveInterviewSession,
  type AdaptiveTurn,
  type ClaimAssessment,
  type FollowUpKind,
  type InterviewerClient,
  type TurnRequestPriorTurn,
  type TurnResponseEvaluation,
  type TurnResponseNextAction,
  type TurnSource,
} from "@/lib/adaptive-interview";
import { clearActiveAdaptiveSession, loadActiveAdaptiveSession, saveActiveAdaptiveSession, appendAdaptiveHistory } from "@/lib/adaptive-session-storage";
import { FakeInterviewerClient } from "@/lib/ai/interviewer-client";
import { SELF_ASSESSMENTS, SELF_ASSESSMENT_LABELS, type InterviewConfig, type InterviewQuestionEntry, type SelfAssessment } from "@/lib/interview-session";
import { appendJobSessionRecord, loadJobSessionRecordsForFingerprint } from "@/lib/job-readiness-storage";
import { MATCH_RULE_LABEL, type JobSpecificBuildResult, type RequirementAssessment, type ResumeSkill } from "@/lib/job-match";
import type { FollowUpLink } from "@/lib/questions";

function SourceTag({ kind }: { kind: "kb-question" | "kb-follow-up" | "ai-follow-up" | "ai-evaluation" }) {
  const isKb = kind === "kb-question" || kind === "kb-follow-up";
  const label = kind === "kb-question" ? "KB Question" : kind === "kb-follow-up" ? "KB Follow-up" : kind === "ai-follow-up" ? "AI Follow-up" : "AI Evaluation";
  const cls = isKb
    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
    : "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function turnSourceTagKind(source: TurnSource): "kb-question" | "kb-follow-up" | "ai-follow-up" {
  if (source === "canonical") return "kb-question";
  if (source === "canonical-follow-up") return "kb-follow-up";
  return "ai-follow-up";
}

function buildFreshSession(
  buildResult: JobSpecificBuildResult,
  config: InterviewConfig,
  jdFingerprint: string,
  pool: InterviewQuestionEntry[],
): AdaptiveInterviewSession {
  const firstEntry = pool.find((q) => q.id === buildResult.questionIds[0]);
  const turns: AdaptiveTurn[] = firstEntry
    ? [{ role: "interviewer", kind: "canonical-question", text: firstEntry.question, questionId: firstEntry.id, timestamp: Date.now() }]
    : [];
  return {
    config,
    jdFingerprint,
    questionIds: buildResult.questionIds,
    explanations: buildResult.explanations,
    turns,
    evaluations: [],
    currentCanonicalIndex: 0,
    currentFollowUpsUsed: 0,
    pendingTurn: null,
    startedAt: Date.now(),
    aiCallCount: 0,
    aiUnavailable: false,
  };
}

export function AdaptiveInterviewClient({
  pool,
  followUpLinks,
  buildResult,
  assessments,
  resumeSkills,
  jdFingerprint,
  config,
  onExit,
  client,
}: {
  pool: InterviewQuestionEntry[];
  followUpLinks: FollowUpLink[];
  buildResult: JobSpecificBuildResult;
  assessments: RequirementAssessment[];
  resumeSkills: ResumeSkill[];
  jdFingerprint: string;
  config: InterviewConfig;
  onExit: () => void;
  client?: InterviewerClient;
}) {
  const interviewerClient = useRef(client ?? new FakeInterviewerClient()).current;
  const [session, setSession] = useState<AdaptiveInterviewSession | null>(null);
  const [resumable, setResumable] = useState<AdaptiveInterviewSession | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [status, setStatus] = useState<"answering" | "evaluating" | "fallback-reveal" | "fallback-assess">("answering");
  const [awaitingAdvance, setAwaitingAdvance] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const stored = loadActiveAdaptiveSession();
    if (stored && stored.jdFingerprint === jdFingerprint && stored.currentCanonicalIndex < stored.questionIds.length) {
      setResumable(stored);
    } else {
      const fresh = buildFreshSession(buildResult, config, jdFingerprint, pool);
      saveActiveAdaptiveSession(fresh);
      setSession(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resumeStoredSession() {
    setSession(resumable);
    setResumable(null);
  }

  function discardAndStartFresh() {
    clearActiveAdaptiveSession();
    const fresh = buildFreshSession(buildResult, config, jdFingerprint, pool);
    saveActiveAdaptiveSession(fresh);
    setSession(fresh);
    setResumable(null);
  }

  const parentEntry = useMemo(() => {
    if (!session || session.currentCanonicalIndex >= session.questionIds.length) return undefined;
    return pool.find((q) => q.id === session.questionIds[session.currentCanonicalIndex]);
  }, [session, pool]);

  const activeEntry = useMemo(() => {
    if (!session) return undefined;
    if (session.pendingTurn?.kind === "canonical-follow-up" && session.pendingTurn.questionId) {
      return pool.find((q) => q.id === session.pendingTurn!.questionId) ?? parentEntry;
    }
    return parentEntry;
  }, [session, pool, parentEntry]);

  const isComplete = !!session && session.currentCanonicalIndex >= session.questionIds.length;

  const explanation = parentEntry && session ? session.explanations[parentEntry.id] : undefined;
  const assessment = explanation ? assessments.find((a) => a.tag === explanation.tag) : undefined;
  const isValidatingClaim = explanation?.kind === "validating-claim";
  const claimSkill = assessment ? resumeSkills.find((s) => s.tag === assessment.tag && s.isClaim) : undefined;

  function priorTurnsFor(parentId: string, session: AdaptiveInterviewSession): TurnRequestPriorTurn[] {
    const pairs: TurnRequestPriorTurn[] = [];
    const chain = session.turns.filter((t) => t.questionId === parentId || (t.kind === "answer" && t.questionId === parentId));
    for (let i = 0; i < chain.length - 1; i++) {
      const t = chain[i]!;
      const next = chain[i + 1];
      if (t.role === "interviewer" && next?.role === "candidate") {
        const evaluationForNext = session.evaluations.find((e) => e.questionId === next.questionId && e.feedback);
        pairs.push({ askedText: t.text, answerText: next.text, verdict: evaluationForNext?.verdict ?? "partial" });
      }
    }
    return pairs.slice(-2);
  }

  function persistAndSet(next: AdaptiveInterviewSession) {
    saveActiveAdaptiveSession(next);
    setSession(next);
  }

  function completeSession(finalSession: AdaptiveInterviewSession) {
    const completedAt = Date.now();
    const record = projectToJobSessionRecord(finalSession, completedAt);
    appendJobSessionRecord(record);
    appendAdaptiveHistory({ session: finalSession, completedAt });
    clearActiveAdaptiveSession();
    saveActiveAdaptiveSession(finalSession);
    setSession(finalSession);
    setAnnouncement("Adaptive interview complete. Showing your results.");
  }

  function advanceAfterEvaluation(params: {
    session: AdaptiveInterviewSession;
    activeQuestionId: string;
    source: TurnSource;
    evaluation: TurnResponseEvaluation;
    nextAction: TurnResponseNextAction;
    claimAssessment: ClaimAssessment | undefined;
    activeEntryForRecord: InterviewQuestionEntry;
    parentId: string;
  }) {
    const { evaluation, nextAction, claimAssessment, activeEntryForRecord, parentId, activeQuestionId, source } = params;
    let working = params.session;

    const evalRecord: AdaptiveEvaluation = {
      parentQuestionId: parentId,
      questionId: activeQuestionId,
      source,
      countsTowardReadiness: source !== "ai-follow-up",
      difficulty: activeEntryForRecord.difficulty,
      questionType: activeEntryForRecord.question_type,
      interviewLevel: activeEntryForRecord.interview_level,
      verdict: evaluation.verdict,
      depth: evaluation.depth,
      ownershipSignal: evaluation.ownershipSignal,
      feedback: evaluation.feedback,
      claimAssessment,
      fallback: false,
    };
    working = { ...working, evaluations: [...working.evaluations, evalRecord] };

    if (nextAction.kind === "move-on") {
      persistAndSet(working);
      setStatus("answering");
      setAwaitingAdvance(true);
      setAnnouncement("Answer evaluated. Ready to continue.");
      return;
    } else {
      const canonicalLink = findCanonicalFollowUp(activeQuestionId, followUpLinks);
      const turns = [...working.turns];
      if (canonicalLink) {
        turns.push({ role: "interviewer", kind: "canonical-follow-up", text: canonicalLink.follow_up, questionId: canonicalLink.matched_id, timestamp: Date.now() });
        working = { ...working, turns, currentFollowUpsUsed: working.currentFollowUpsUsed + 1, pendingTurn: { kind: "canonical-follow-up", text: canonicalLink.follow_up, questionId: canonicalLink.matched_id } };
      } else {
        const text = nextAction.questionText ?? "Can you go into more detail?";
        turns.push({ role: "interviewer", kind: "ai-follow-up", text, timestamp: Date.now() });
        working = { ...working, turns, currentFollowUpsUsed: working.currentFollowUpsUsed + 1, pendingTurn: { kind: "ai-follow-up", text } };
      }
      setAnnouncement("Follow-up question ready.");
    }

    persistAndSet(working);
    setStatus("answering");
    setAnswerText("");
  }

  async function handleSubmit() {
    if (!session || !parentEntry) return;
    const trimmed = answerText.trim();
    if (!trimmed) return;

    const pending = session.pendingTurn;
    const source: TurnSource = pending === null ? "canonical" : pending.kind === "canonical-follow-up" ? "canonical-follow-up" : "ai-follow-up";
    const activeQuestionId = pending?.kind === "canonical-follow-up" && pending.questionId ? pending.questionId : parentEntry.id;
    const activeEntryForRecord = activeEntry ?? parentEntry;

    const answerTurn: AdaptiveTurn = { role: "candidate", kind: "answer", text: trimmed, questionId: activeQuestionId, timestamp: Date.now() };
    const sessionWithAnswer: AdaptiveInterviewSession = { ...session, turns: [...session.turns, answerTurn] };

    if (session.aiUnavailable) {
      setStatus("fallback-reveal");
      persistAndSet(sessionWithAnswer);
      return;
    }

    const kinds = eligibleFollowUpKinds({
      followUpsUsedForThisQuestion: session.currentFollowUpsUsed,
      lastVerdict: null,
      isValidatingClaim,
      questionTypes: activeEntryForRecord.question_type,
    });

    if (isAnswerTooShort(trimmed)) {
      const evaluation = shortAnswerFallbackEvaluation();
      const eligible = eligibleFollowUpKinds({
        followUpsUsedForThisQuestion: session.currentFollowUpsUsed,
        lastVerdict: evaluation.verdict,
        isValidatingClaim,
        questionTypes: activeEntryForRecord.question_type,
      });
      const chosen = eligible[0]!;
      advanceAfterEvaluation({
        session: sessionWithAnswer,
        activeQuestionId,
        source,
        evaluation,
        nextAction: { kind: chosen, questionText: chosen === "move-on" ? undefined : "Can you go into more detail?" },
        claimAssessment: isValidatingClaim ? "uncertain" : undefined,
        activeEntryForRecord,
        parentId: parentEntry.id,
      });
      return;
    }

    setStatus("evaluating");
    const canonicalLink = findCanonicalFollowUp(activeQuestionId, followUpLinks);
    const requirementContext = assessment
      ? { label: assessment.label, evidenceTier: assessment.evidence, matchRuleLabel: MATCH_RULE_LABEL[assessment.matchRule], matchedSentence: assessment.matchedSentence }
      : { label: activeEntryForRecord.category, evidenceTier: "absent" as const, matchRuleLabel: MATCH_RULE_LABEL.none };
    const request = buildTurnRequest({
      question: activeEntryForRecord,
      requirementContext,
      claimPhrase: claimSkill?.claimPhrase,
      candidateAnswer: trimmed,
      priorTurns: priorTurnsFor(parentEntry.id, sessionWithAnswer),
      eligibleFollowUpKinds: kinds,
      canonicalFollowUpText: canonicalLink?.follow_up,
    });

    let response;
    try {
      response = await interviewerClient.sendTurn(request);
      if (!isValidTurnResponse(response, kinds)) {
        response = await interviewerClient.sendTurn(request);
        if (!isValidTurnResponse(response, kinds)) throw new Error("malformed AI response");
      }
    } catch {
      const unavailable: AdaptiveInterviewSession = { ...sessionWithAnswer, aiUnavailable: true };
      persistAndSet(unavailable);
      setStatus("fallback-reveal");
      return;
    }

    const sessionAfterCall: AdaptiveInterviewSession = { ...sessionWithAnswer, aiCallCount: sessionWithAnswer.aiCallCount + 1 };
    advanceAfterEvaluation({
      session: sessionAfterCall,
      activeQuestionId,
      source,
      evaluation: response.evaluation,
      nextAction: response.nextAction,
      claimAssessment: response.claimAssessment,
      activeEntryForRecord,
      parentId: parentEntry.id,
    });
  }

  function submitSelfAssessment(value: SelfAssessment) {
    if (!session || !parentEntry) return;
    const record: AdaptiveEvaluation = {
      parentQuestionId: parentEntry.id,
      questionId: parentEntry.id,
      source: "canonical",
      countsTowardReadiness: true,
      difficulty: parentEntry.difficulty,
      questionType: parentEntry.question_type,
      interviewLevel: parentEntry.interview_level,
      verdict: value,
      depth: "moderate",
      ownershipSignal: "weak",
      feedback: "Self-assessed — the AI evaluator was unavailable for this question.",
      claimAssessment: isValidatingClaim ? "uncertain" : undefined,
      fallback: true,
    };
    const nextIndex = session.currentCanonicalIndex + 1;
    const nextEntry = pool.find((q) => q.id === session.questionIds[nextIndex]);
    const turns = [...session.turns];
    if (nextEntry) turns.push({ role: "interviewer", kind: "canonical-question", text: nextEntry.question, questionId: nextEntry.id, timestamp: Date.now() });
    const working: AdaptiveInterviewSession = {
      ...session,
      evaluations: [...session.evaluations, record],
      turns,
      currentCanonicalIndex: nextIndex,
      currentFollowUpsUsed: 0,
      pendingTurn: null,
    };
    if (nextIndex >= working.questionIds.length) {
      completeSession(working);
    } else {
      persistAndSet(working);
      setAnnouncement(`Moving to question ${nextIndex + 1} of ${working.questionIds.length}.`);
    }
    setStatus("answering");
    setAnswerText("");
  }

  function commitAdvance() {
    if (!session || !parentEntry) return;
    const nextIndex = session.currentCanonicalIndex + 1;
    const nextEntry = pool.find((q) => q.id === session.questionIds[nextIndex]);
    const turns = [...session.turns];
    if (nextEntry) turns.push({ role: "interviewer", kind: "canonical-question", text: nextEntry.question, questionId: nextEntry.id, timestamp: Date.now() });
    const working: AdaptiveInterviewSession = { ...session, turns, currentCanonicalIndex: nextIndex, currentFollowUpsUsed: 0, pendingTurn: null };
    setAwaitingAdvance(false);
    setAnswerText("");
    if (nextIndex >= working.questionIds.length) {
      completeSession(working);
    } else {
      persistAndSet(working);
      setAnnouncement(`Moving to question ${nextIndex + 1} of ${working.questionIds.length}.`);
    }
  }

  function skipFollowUp() {
    if (!session || !parentEntry) return;
    const nextIndex = session.currentCanonicalIndex + 1;
    const nextEntry = pool.find((q) => q.id === session.questionIds[nextIndex]);
    const turns = [...session.turns];
    if (nextEntry) turns.push({ role: "interviewer", kind: "canonical-question", text: nextEntry.question, questionId: nextEntry.id, timestamp: Date.now() });
    const working: AdaptiveInterviewSession = { ...session, turns, currentCanonicalIndex: nextIndex, currentFollowUpsUsed: 0, pendingTurn: null };
    if (nextIndex >= working.questionIds.length) {
      completeSession(working);
    } else {
      persistAndSet(working);
    }
    setStatus("answering");
    setAnswerText("");
  }

  const records = useMemo(() => (session ? loadJobSessionRecordsForFingerprint(jdFingerprint) : []), [session, jdFingerprint, isComplete]);

  if (resumable) {
    return (
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950">
        <p className="text-sm text-indigo-900 dark:text-indigo-200">
          You have an Adaptive AI Interview in progress — question {resumable.currentCanonicalIndex + 1} of {resumable.questionIds.length}.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={resumeStoredSession} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            Resume Adaptive Interview
          </button>
          <button
            type="button"
            onClick={discardAndStartFresh}
            className="rounded-md border border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900"
          >
            Discard and Start Fresh
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
          Adaptive AI Interviewer <span className="font-normal">(Beta)</span>
        </span>
        <button type="button" onClick={onExit} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          Exit to Job-Specific Interview
        </button>
      </div>

      {!isComplete && parentEntry && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Question {session.currentCanonicalIndex + 1} of {session.questionIds.length}
            {session.pendingTurn && ` · follow-up ${session.currentFollowUpsUsed} of 2`}
          </p>

          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5">
              <SourceTag kind={session.pendingTurn ? turnSourceTagKind(session.pendingTurn.kind === "canonical-follow-up" ? "canonical-follow-up" : "ai-follow-up") : "kb-question"} />
              <DifficultyBadge difficulty={(activeEntry ?? parentEntry).difficulty} />
              {(activeEntry ?? parentEntry).question_type.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>

            <p className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">{session.pendingTurn ? session.pendingTurn.text : parentEntry.question}</p>

            {!session.pendingTurn && explanation && <p className="mt-2 text-sm text-indigo-700 dark:text-indigo-400">{explanation.reason}</p>}

            {awaitingAdvance ? (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button type="button" onClick={commitAdvance} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                  {session.currentCanonicalIndex + 1 >= session.questionIds.length ? "See Results" : "Next Question →"}
                </button>
              </div>
            ) : session.aiUnavailable && (status === "fallback-reveal" || status === "fallback-assess") ? (
              <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">The AI evaluator is unavailable for this question — falling back to self-assessment.</p>
                {status === "fallback-reveal" ? (
                  <>
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{parentEntry.shortAnswer}</p>
                    <button
                      type="button"
                      onClick={() => setStatus("fallback-assess")}
                      className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      Reveal Answer
                    </button>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {SELF_ASSESSMENTS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => submitSelfAssessment(a)}
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
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5">
                <label htmlFor="adaptive-answer" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Your answer
                </label>
                <textarea
                  id="adaptive-answer"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value.slice(0, ANSWER_MAX_LENGTH))}
                  maxLength={ANSWER_MAX_LENGTH}
                  rows={6}
                  disabled={status === "evaluating"}
                  placeholder="Type your answer here…"
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 text-base text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {ANSWER_MAX_LENGTH - answerText.length} characters remaining
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={answerText.trim().length === 0 || status === "evaluating"}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Submit Answer
                  </button>
                  {status === "evaluating" && (
                    <span role="status" aria-live="polite" className="text-sm text-slate-500 dark:text-slate-400">
                      Evaluating your answer…
                    </span>
                  )}
                  {session.pendingTurn && status === "answering" && (
                    <button type="button" onClick={skipFollowUp} className="text-sm text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 dark:decoration-slate-700 dark:hover:text-slate-300">
                      Skip this follow-up
                    </button>
                  )}
                </div>
              </div>
            )}

            {session.evaluations.filter((e) => e.parentQuestionId === parentEntry.id).length > 0 && (
              <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                {session.evaluations
                  .filter((e) => e.parentQuestionId === parentEntry.id)
                  .map((e, i) => (
                    <div key={i} className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950">
                      <SourceTag kind="ai-evaluation" />
                      <p className="mt-1 text-slate-700 dark:text-slate-300">{e.feedback}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isComplete && (
        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Adaptive interview complete</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {session.questionIds.length} canonical question{session.questionIds.length === 1 ? "" : "s"}, {session.evaluations.filter((e) => e.source !== "ai-follow-up").length} scored answer
              {session.evaluations.filter((e) => e.source !== "ai-follow-up").length === 1 ? "" : "s"} toward Job Readiness.
            </p>
          </div>

          <div className="mt-6">
            <JobReadinessPanel assessments={assessments} resumeSkills={resumeSkills} records={records} pool={pool} />
          </div>

          {session.evaluations.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Interview Notes</h2>
              <div className="mt-2 space-y-2">
                {session.evaluations.map((e, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceTag kind="ai-evaluation" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{SELF_ASSESSMENT_LABELS[e.verdict]}</span>
                    </div>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">{e.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <button type="button" onClick={onExit} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
              Back to Job-Specific Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
