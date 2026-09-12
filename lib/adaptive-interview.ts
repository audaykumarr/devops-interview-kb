import type { FollowUpLink } from "./questions";
import type { JobSessionRecord } from "./job-readiness";
import type { EvidenceTier } from "./job-match";
import type { AnsweredQuestion, InterviewConfig, InterviewQuestionEntry, JobMatchExplanation, SelfAssessment } from "./interview-session";

export const MAX_FOLLOW_UPS_PER_QUESTION = 2;
export const ANSWER_MAX_LENGTH = 2000;
export const MIN_ANSWER_LENGTH_FOR_EVALUATION = 15;

export type FollowUpKind = "clarify" | "scenario-probe" | "troubleshooting-probe" | "challenge" | "move-on";
export type EvaluationDepth = "surface" | "moderate" | "deep";
export type OwnershipSignal = "none" | "weak" | "strong";
export type ClaimAssessment = "supports" | "uncertain" | "contradicts";
export type TurnSource = "canonical" | "canonical-follow-up" | "ai-follow-up";

export interface EligibilityState {
  followUpsUsedForThisQuestion: number;
  lastVerdict: SelfAssessment | null;
  isValidatingClaim: boolean;
  questionTypes: string[];
}

export function eligibleFollowUpKinds(state: EligibilityState): FollowUpKind[] {
  if (state.followUpsUsedForThisQuestion >= MAX_FOLLOW_UPS_PER_QUESTION) return ["move-on"];
  if (state.lastVerdict === "nailed") return ["move-on"];

  const kinds: FollowUpKind[] = [];
  if (state.isValidatingClaim && state.lastVerdict === "needs-work") kinds.push("challenge");
  if (state.questionTypes.includes("troubleshooting")) kinds.push("troubleshooting-probe");
  if (state.questionTypes.includes("architecture") || state.questionTypes.includes("system-design")) kinds.push("scenario-probe");
  if (kinds.length === 0) kinds.push("clarify");
  kinds.push("move-on");
  return kinds;
}

export interface TurnRequestRubric {
  shortAnswer: string;
}

export interface TurnRequestRequirementContext {
  label: string;
  evidenceTier: EvidenceTier;
  matchRuleLabel: string;
  matchedSentence?: string;
}

export interface TurnRequestPriorTurn {
  askedText: string;
  answerText: string;
  verdict: SelfAssessment;
}

export interface TurnRequest {
  turnKind: "evaluate-and-follow-up";
  canonicalQuestion: { id: string; question: string; questionType: string[]; difficulty: string };
  rubric: TurnRequestRubric;
  requirementContext: TurnRequestRequirementContext;
  claimContext?: { claimPhrase: string };
  candidateAnswer: string;
  priorTurns: TurnRequestPriorTurn[];
  eligibleFollowUpKinds: FollowUpKind[];
  canonicalFollowUpText?: string;
}

export interface TurnResponseEvaluation {
  verdict: SelfAssessment;
  depth: EvaluationDepth;
  ownershipSignal: OwnershipSignal;
  feedback: string;
}

export interface TurnResponseNextAction {
  kind: FollowUpKind;
  questionText?: string;
}

export interface TurnResponse {
  evaluation: TurnResponseEvaluation;
  nextAction: TurnResponseNextAction;
  claimAssessment?: ClaimAssessment;
}

export interface InterviewerClient {
  sendTurn(request: TurnRequest): Promise<TurnResponse>;
}

const VERDICTS: readonly SelfAssessment[] = ["nailed", "partial", "needs-work"];
const DEPTHS: readonly EvaluationDepth[] = ["surface", "moderate", "deep"];
const OWNERSHIP_SIGNALS: readonly OwnershipSignal[] = ["none", "weak", "strong"];
const CLAIM_ASSESSMENTS: readonly ClaimAssessment[] = ["supports", "uncertain", "contradicts"];
const SCORE_PATTERN = /\d{1,3}\s*(%|\/\s*\d)/;
const MAX_FEEDBACK_LENGTH = 280;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Validates a candidate TurnResponse structurally and against the exact set of follow-up kinds
 * deterministic code offered this turn. `eligibleKinds` closes the loop the design calls for: the
 * response can only select a strategy the deterministic engine actually made available.
 */
export function isValidTurnResponse(value: unknown, eligibleKinds: readonly FollowUpKind[]): value is TurnResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TurnResponse>;

  const evaluation = candidate.evaluation;
  if (!evaluation || typeof evaluation !== "object") return false;
  if (!VERDICTS.includes(evaluation.verdict as SelfAssessment)) return false;
  if (!DEPTHS.includes(evaluation.depth as EvaluationDepth)) return false;
  if (!OWNERSHIP_SIGNALS.includes(evaluation.ownershipSignal as OwnershipSignal)) return false;
  if (!isNonEmptyString(evaluation.feedback)) return false;
  if (evaluation.feedback.length > MAX_FEEDBACK_LENGTH) return false;
  if (SCORE_PATTERN.test(evaluation.feedback)) return false;

  const nextAction = candidate.nextAction;
  if (!nextAction || typeof nextAction !== "object") return false;
  if (!eligibleKinds.includes(nextAction.kind as FollowUpKind)) return false;
  if (nextAction.kind !== "move-on" && !isNonEmptyString(nextAction.questionText)) return false;
  if (nextAction.questionText && SCORE_PATTERN.test(nextAction.questionText)) return false;

  if (candidate.claimAssessment !== undefined && !CLAIM_ASSESSMENTS.includes(candidate.claimAssessment)) return false;

  return true;
}

export function isAnswerTooShort(answer: string): boolean {
  return answer.trim().length < MIN_ANSWER_LENGTH_FOR_EVALUATION;
}

export function shortAnswerFallbackEvaluation(): TurnResponseEvaluation {
  return {
    verdict: "needs-work",
    depth: "surface",
    ownershipSignal: "none",
    feedback: "That's too brief to evaluate — want to give it another try with more detail?",
  };
}

export function findCanonicalFollowUp(questionId: string, followUpLinks: readonly FollowUpLink[]): FollowUpLink | undefined {
  return followUpLinks.find((link) => link.source_id === questionId);
}

export interface AdaptiveTurn {
  role: "interviewer" | "candidate";
  kind: "canonical-question" | "canonical-follow-up" | "ai-follow-up" | "answer";
  text: string;
  questionId?: string;
  timestamp: number;
}

export interface AdaptiveEvaluation {
  parentQuestionId: string;
  questionId: string;
  source: TurnSource;
  countsTowardReadiness: boolean;
  difficulty: string;
  questionType: string[];
  interviewLevel: string[];
  verdict: SelfAssessment;
  depth: EvaluationDepth;
  ownershipSignal: OwnershipSignal;
  feedback: string;
  claimAssessment?: ClaimAssessment;
  fallback: boolean;
}

export interface PendingTurn {
  kind: "canonical-follow-up" | "ai-follow-up";
  text: string;
  questionId?: string;
}

export interface AdaptiveInterviewSession {
  config: InterviewConfig;
  jdFingerprint: string;
  questionIds: string[];
  explanations: Record<string, JobMatchExplanation>;
  turns: AdaptiveTurn[];
  evaluations: AdaptiveEvaluation[];
  currentCanonicalIndex: number;
  currentFollowUpsUsed: number;
  pendingTurn: PendingTurn | null;
  startedAt: number;
  aiCallCount: number;
  aiUnavailable: boolean;
}

export interface AdaptiveSessionRecord {
  session: AdaptiveInterviewSession;
  completedAt: number;
}

/**
 * Projects the canonical-question outcomes of a completed adaptive session into the exact shape
 * lib/job-readiness.ts already consumes, so computeJobReadiness/computeRequirementPerformance/
 * recommendNextPractice need zero changes. AI-only follow-up evaluations never produce their own
 * entry here — they can only refine the parent canonical question's final verdict. A canonical
 * follow-up (a real, separately-id'd KB question) gets its own additional entry.
 */
export function projectToJobSessionRecord(session: AdaptiveInterviewSession, completedAt: number): JobSessionRecord {
  const answers: AnsweredQuestion[] = [];
  const explanations: Record<string, JobMatchExplanation> = {};

  const byParent = new Map<string, AdaptiveEvaluation[]>();
  for (const evaluation of session.evaluations) {
    const list = byParent.get(evaluation.parentQuestionId) ?? [];
    list.push(evaluation);
    byParent.set(evaluation.parentQuestionId, list);
  }

  for (const [parentId, evaluations] of byParent) {
    const parentExplanation = session.explanations[parentId];
    const ownChain = evaluations.filter((e) => e.source !== "canonical-follow-up");
    const finalOwn = ownChain[ownChain.length - 1];
    if (finalOwn) {
      answers.push({ id: parentId, difficulty: finalOwn.difficulty, question_type: finalOwn.questionType, interview_level: finalOwn.interviewLevel, assessment: finalOwn.verdict });
      if (parentExplanation) explanations[parentId] = parentExplanation;
    }

    for (const cfEval of evaluations.filter((e) => e.source === "canonical-follow-up")) {
      answers.push({ id: cfEval.questionId, difficulty: cfEval.difficulty, question_type: cfEval.questionType, interview_level: cfEval.interviewLevel, assessment: cfEval.verdict });
      if (parentExplanation) explanations[cfEval.questionId] = { ...parentExplanation, reason: `${parentExplanation.reason} (via a canonical follow-up question)` };
    }
  }

  return { jdFingerprint: session.jdFingerprint, completedAt, answers, explanations };
}

export function buildTurnRequest(params: {
  question: InterviewQuestionEntry;
  requirementContext: TurnRequestRequirementContext;
  claimPhrase?: string;
  candidateAnswer: string;
  priorTurns: TurnRequestPriorTurn[];
  eligibleFollowUpKinds: FollowUpKind[];
  canonicalFollowUpText?: string;
}): TurnRequest {
  return {
    turnKind: "evaluate-and-follow-up",
    canonicalQuestion: { id: params.question.id, question: params.question.question, questionType: params.question.question_type, difficulty: params.question.difficulty },
    rubric: { shortAnswer: params.question.shortAnswer },
    requirementContext: params.requirementContext,
    claimContext: params.claimPhrase ? { claimPhrase: params.claimPhrase } : undefined,
    candidateAnswer: params.candidateAnswer,
    priorTurns: params.priorTurns,
    eligibleFollowUpKinds: params.eligibleFollowUpKinds,
    canonicalFollowUpText: params.canonicalFollowUpText,
  };
}
