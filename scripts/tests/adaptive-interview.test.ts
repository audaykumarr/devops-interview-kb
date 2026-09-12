import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildTurnRequest,
  eligibleFollowUpKinds,
  findCanonicalFollowUp,
  isAnswerTooShort,
  isValidTurnResponse,
  projectToJobSessionRecord,
  shortAnswerFallbackEvaluation,
  MAX_FOLLOW_UPS_PER_QUESTION,
  MIN_ANSWER_LENGTH_FOR_EVALUATION,
  type AdaptiveEvaluation,
  type AdaptiveInterviewSession,
  type FollowUpKind,
  type TurnResponse,
} from "../../lib/adaptive-interview";
import { FakeInterviewerClient, SIMULATE_EVALUATOR_UNAVAILABLE_SENTINEL } from "../../lib/ai/interviewer-client";
import type { InterviewConfig, InterviewQuestionEntry, JobMatchExplanation } from "../../lib/interview-session";
import type { FollowUpLink } from "../../lib/questions";

function q(overrides: Partial<InterviewQuestionEntry> = {}): InterviewQuestionEntry {
  return {
    id: "fixture-kubernetes-001",
    category: "kubernetes",
    subcategory: "architecture",
    difficulty: "advanced",
    question_type: ["architecture"],
    interview_level: ["senior-devops"],
    technologies: ["kubernetes"],
    question: "Walk me through the architecture.",
    shortAnswer: "A well-architected cluster separates control-plane and workload availability.",
    url: "/questions/kubernetes/architecture/fixture",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// eligibleFollowUpKinds
// ---------------------------------------------------------------------------

test("eligibleFollowUpKinds: caps at MAX_FOLLOW_UPS_PER_QUESTION with move-on only", () => {
  const kinds = eligibleFollowUpKinds({
    followUpsUsedForThisQuestion: MAX_FOLLOW_UPS_PER_QUESTION,
    lastVerdict: "needs-work",
    isValidatingClaim: false,
    questionTypes: ["troubleshooting"],
  });
  assert.deepEqual(kinds, ["move-on"]);
});

test("eligibleFollowUpKinds: a nailed verdict always moves on, regardless of question type or claim", () => {
  const kinds = eligibleFollowUpKinds({
    followUpsUsedForThisQuestion: 0,
    lastVerdict: "nailed",
    isValidatingClaim: true,
    questionTypes: ["troubleshooting", "architecture"],
  });
  assert.deepEqual(kinds, ["move-on"]);
});

test("eligibleFollowUpKinds: a claim-validating question with a needs-work verdict makes 'challenge' eligible", () => {
  const kinds = eligibleFollowUpKinds({
    followUpsUsedForThisQuestion: 0,
    lastVerdict: "needs-work",
    isValidatingClaim: true,
    questionTypes: ["conceptual"],
  });
  assert.ok(kinds.includes("challenge"));
});

test("eligibleFollowUpKinds: a claim-validating question with a partial verdict does NOT yet offer 'challenge'", () => {
  const kinds = eligibleFollowUpKinds({
    followUpsUsedForThisQuestion: 0,
    lastVerdict: "partial",
    isValidatingClaim: true,
    questionTypes: ["conceptual"],
  });
  assert.ok(!kinds.includes("challenge"));
});

test("eligibleFollowUpKinds: troubleshooting question types offer troubleshooting-probe", () => {
  const kinds = eligibleFollowUpKinds({
    followUpsUsedForThisQuestion: 0,
    lastVerdict: "partial",
    isValidatingClaim: false,
    questionTypes: ["troubleshooting"],
  });
  assert.ok(kinds.includes("troubleshooting-probe"));
});

test("eligibleFollowUpKinds: architecture and system-design question types offer scenario-probe", () => {
  for (const type of ["architecture", "system-design"]) {
    const kinds = eligibleFollowUpKinds({
      followUpsUsedForThisQuestion: 0,
      lastVerdict: "partial",
      isValidatingClaim: false,
      questionTypes: [type],
    });
    assert.ok(kinds.includes("scenario-probe"), `${type} should offer scenario-probe`);
  }
});

test("eligibleFollowUpKinds: a plain conceptual question with no special conditions falls back to clarify", () => {
  const kinds = eligibleFollowUpKinds({
    followUpsUsedForThisQuestion: 0,
    lastVerdict: "partial",
    isValidatingClaim: false,
    questionTypes: ["conceptual"],
  });
  assert.deepEqual(kinds, ["clarify", "move-on"]);
});

test("eligibleFollowUpKinds: move-on is always present whenever follow-ups remain eligible", () => {
  const cases: Parameters<typeof eligibleFollowUpKinds>[0][] = [
    { followUpsUsedForThisQuestion: 0, lastVerdict: "needs-work", isValidatingClaim: true, questionTypes: ["troubleshooting"] },
    { followUpsUsedForThisQuestion: 1, lastVerdict: "partial", isValidatingClaim: false, questionTypes: ["architecture"] },
  ];
  for (const c of cases) assert.ok(eligibleFollowUpKinds(c).includes("move-on"));
});

test("eligibleFollowUpKinds: a fresh question (no prior verdict) is treated as needing a follow-up strategy, not forced to move on", () => {
  const kinds = eligibleFollowUpKinds({ followUpsUsedForThisQuestion: 0, lastVerdict: null, isValidatingClaim: false, questionTypes: ["conceptual"] });
  assert.ok(!kinds.includes("move-on") || kinds.length > 1);
  assert.ok(kinds.includes("clarify"));
});

// ---------------------------------------------------------------------------
// Canonical follow-up lookup
// ---------------------------------------------------------------------------

const FOLLOW_UP_LINKS: FollowUpLink[] = [
  { source_id: "fixture-kubernetes-001", follow_up: "How would you handle a control-plane outage?", matched_id: "fixture-kubernetes-002", matched_title: "Control-plane outage", matched_url: "/questions/kubernetes/architecture/control-plane-outage" },
];

test("findCanonicalFollowUp returns the linked KB question when one exists", () => {
  const link = findCanonicalFollowUp("fixture-kubernetes-001", FOLLOW_UP_LINKS);
  assert.equal(link?.matched_id, "fixture-kubernetes-002");
});

test("findCanonicalFollowUp returns undefined when no link exists for this question", () => {
  assert.equal(findCanonicalFollowUp("some-other-question-001", FOLLOW_UP_LINKS), undefined);
});

// ---------------------------------------------------------------------------
// Response validation
// ---------------------------------------------------------------------------

const ELIGIBLE: FollowUpKind[] = ["clarify", "move-on"];

function validResponse(overrides: Partial<TurnResponse> = {}): TurnResponse {
  return {
    evaluation: { verdict: "partial", depth: "moderate", ownershipSignal: "weak", feedback: "Reasonable understanding, but stayed fairly general." },
    nextAction: { kind: "clarify", questionText: "Can you give a specific example?" },
    ...overrides,
  };
}

test("isValidTurnResponse accepts a well-formed response", () => {
  assert.equal(isValidTurnResponse(validResponse(), ELIGIBLE), true);
});

test("isValidTurnResponse rejects an invalid verdict", () => {
  const bad = validResponse({ evaluation: { ...validResponse().evaluation, verdict: "excellent" as never } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse rejects an invalid depth", () => {
  const bad = validResponse({ evaluation: { ...validResponse().evaluation, depth: "extremely-deep" as never } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse rejects an invalid ownership signal", () => {
  const bad = validResponse({ evaluation: { ...validResponse().evaluation, ownershipSignal: "total" as never } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse rejects a nextAction.kind outside the eligible set offered this turn", () => {
  const bad = validResponse({ nextAction: { kind: "challenge", questionText: "Tell me about a specific incident." } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false, "challenge was never offered as eligible, so it must be rejected");
});

test("isValidTurnResponse rejects a follow-up action with no question text", () => {
  const bad = validResponse({ nextAction: { kind: "clarify" } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse allows move-on with no question text", () => {
  const ok = validResponse({ nextAction: { kind: "move-on" } });
  assert.equal(isValidTurnResponse(ok, ["move-on"]), true);
});

test("isValidTurnResponse rejects feedback containing a percentage/score pattern", () => {
  const bad = validResponse({ evaluation: { ...validResponse().evaluation, feedback: "Technical score: 87%." } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse rejects a fraction-style score pattern (e.g. 7/10) anywhere in feedback", () => {
  const bad = validResponse({ evaluation: { ...validResponse().evaluation, feedback: "I'd rate this 7/10 overall." } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse rejects a score pattern in the follow-up question text too", () => {
  const bad = validResponse({ nextAction: { kind: "clarify", questionText: "Given your 90% confidence, can you elaborate?" } });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse rejects null, non-objects, and structurally incomplete responses", () => {
  assert.equal(isValidTurnResponse(null, ELIGIBLE), false);
  assert.equal(isValidTurnResponse("a string", ELIGIBLE), false);
  assert.equal(isValidTurnResponse({}, ELIGIBLE), false);
  assert.equal(isValidTurnResponse({ evaluation: validResponse().evaluation }, ELIGIBLE), false);
});

test("isValidTurnResponse rejects an invalid claimAssessment value", () => {
  const bad = validResponse({ claimAssessment: "definitely-lied" as never });
  assert.equal(isValidTurnResponse(bad, ELIGIBLE), false);
});

test("isValidTurnResponse accepts a valid claimAssessment value", () => {
  const ok = validResponse({ claimAssessment: "supports" });
  assert.equal(isValidTurnResponse(ok, ELIGIBLE), true);
});

// ---------------------------------------------------------------------------
// Short-answer handling
// ---------------------------------------------------------------------------

test("isAnswerTooShort flags answers below the minimum length", () => {
  assert.equal(isAnswerTooShort(""), true);
  assert.equal(isAnswerTooShort("idk"), true);
  assert.equal(isAnswerTooShort("a".repeat(MIN_ANSWER_LENGTH_FOR_EVALUATION - 1)), true);
});

test("isAnswerTooShort accepts answers at or above the minimum length", () => {
  assert.equal(isAnswerTooShort("a".repeat(MIN_ANSWER_LENGTH_FOR_EVALUATION)), false);
});

test("shortAnswerFallbackEvaluation never calls the network and never contains a score pattern", () => {
  const evaluation = shortAnswerFallbackEvaluation();
  assert.equal(evaluation.verdict, "needs-work");
  assert.doesNotMatch(evaluation.feedback, /\d{1,3}\s*(%|\/\s*\d)/);
});

// ---------------------------------------------------------------------------
// buildTurnRequest
// ---------------------------------------------------------------------------

test("buildTurnRequest never includes anything beyond the one question's own rubric and one requirement's context", () => {
  const request = buildTurnRequest({
    question: q(),
    requirementContext: { label: "Kubernetes", evidenceTier: "strong", matchRuleLabel: "Direct technology match" },
    candidateAnswer: "Managed production Kubernetes clusters across three availability zones.",
    priorTurns: [],
    eligibleFollowUpKinds: ["clarify", "move-on"],
  });
  const serialized = JSON.stringify(request);
  assert.doesNotMatch(serialized, /resume|résumé/i, "the request must never carry raw resume text");
  assert.equal(request.rubric.shortAnswer, q().shortAnswer);
  assert.equal(request.requirementContext.label, "Kubernetes");
});

// ---------------------------------------------------------------------------
// FakeInterviewerClient — no network, deterministic
// ---------------------------------------------------------------------------

test("FakeInterviewerClient resolves without any network dependency and is deterministic for the same input", async () => {
  const client = new FakeInterviewerClient();
  const request = buildTurnRequest({
    question: q(),
    requirementContext: { label: "Kubernetes", evidenceTier: "adjacent", matchRuleLabel: "Related technology" },
    candidateAnswer: "We ran multiple control-plane nodes across zones and used pod disruption budgets to keep workloads available during node drains.",
    priorTurns: [],
    eligibleFollowUpKinds: ["scenario-probe", "clarify", "move-on"],
  });
  const a = await client.sendTurn(request);
  const b = await client.sendTurn(request);
  assert.deepEqual(a, b);
  assert.ok(["nailed", "partial", "needs-work"].includes(a.evaluation.verdict));
});

test("FakeInterviewerClient escalates verdict with longer, more detailed answers", async () => {
  const client = new FakeInterviewerClient();
  const short = await client.sendTurn(
    buildTurnRequest({ question: q(), requirementContext: { label: "Kubernetes", evidenceTier: "strong", matchRuleLabel: "Direct technology match" }, candidateAnswer: "Not sure honestly.", priorTurns: [], eligibleFollowUpKinds: ["clarify", "move-on"] }),
  );
  const long = await client.sendTurn(
    buildTurnRequest({
      question: q(),
      requirementContext: { label: "Kubernetes", evidenceTier: "strong", matchRuleLabel: "Direct technology match" },
      candidateAnswer: "We ran a highly available control plane across three zones with etcd quorum spread accordingly, used pod disruption budgets and anti-affinity rules for workloads, and validated failover during a real zone outage.",
      priorTurns: [],
      eligibleFollowUpKinds: ["clarify", "move-on"],
    }),
  );
  assert.equal(short.evaluation.verdict, "needs-work");
  assert.equal(long.evaluation.verdict, "nailed");
});

test("FakeInterviewerClient rejects when the candidate answer contains the unavailable-simulation sentinel", async () => {
  const client = new FakeInterviewerClient();
  await assert.rejects(() =>
    client.sendTurn(
      buildTurnRequest({
        question: q(),
        requirementContext: { label: "Kubernetes", evidenceTier: "strong", matchRuleLabel: "Direct technology match" },
        candidateAnswer: SIMULATE_EVALUATOR_UNAVAILABLE_SENTINEL,
        priorTurns: [],
        eligibleFollowUpKinds: ["clarify", "move-on"],
      }),
    ),
  );
});

test("FakeInterviewerClient never proposes a nextAction.kind outside what was offered", async () => {
  const client = new FakeInterviewerClient();
  const eligible: FollowUpKind[] = ["move-on"];
  const response = await client.sendTurn(
    buildTurnRequest({ question: q(), requirementContext: { label: "Kubernetes", evidenceTier: "strong", matchRuleLabel: "Direct technology match" }, candidateAnswer: "Fully detailed, specific, hands-on answer about the whole architecture end to end.", priorTurns: [], eligibleFollowUpKinds: eligible }),
  );
  assert.ok(eligible.includes(response.nextAction.kind));
  assert.equal(isValidTurnResponse(response, eligible), true);
});

// ---------------------------------------------------------------------------
// Projection into the existing JobSessionRecord / AnsweredQuestion shape
// ---------------------------------------------------------------------------

const CONFIG: InterviewConfig = { levels: [], types: [], difficulties: [], categories: [], count: 5, timeMode: "off" };
const EXPLANATION: JobMatchExplanation = { kind: "core-requirement", tag: "kubernetes", label: "Kubernetes", reason: "Core JD requirement." };

function evaluation(overrides: Partial<AdaptiveEvaluation> = {}): AdaptiveEvaluation {
  return {
    parentQuestionId: "fixture-kubernetes-001",
    questionId: "fixture-kubernetes-001",
    source: "canonical",
    countsTowardReadiness: true,
    difficulty: "advanced",
    questionType: ["architecture"],
    interviewLevel: ["senior-devops"],
    verdict: "partial",
    depth: "moderate",
    ownershipSignal: "weak",
    feedback: "reasonable",
    fallback: false,
    ...overrides,
  };
}

function session(overrides: Partial<AdaptiveInterviewSession> = {}): AdaptiveInterviewSession {
  return {
    config: CONFIG,
    jdFingerprint: "fp1",
    questionIds: ["fixture-kubernetes-001"],
    explanations: { "fixture-kubernetes-001": EXPLANATION },
    turns: [],
    evaluations: [],
    currentCanonicalIndex: 1,
    currentFollowUpsUsed: 0,
    pendingTurn: null,
    startedAt: 1,
    aiCallCount: 0,
    aiUnavailable: false,
    ...overrides,
  };
}

test("projectToJobSessionRecord records exactly one answer for a canonical question with no follow-ups", () => {
  const s = session({ evaluations: [evaluation({ verdict: "nailed" })] });
  const record = projectToJobSessionRecord(s, 100);
  assert.equal(record.jdFingerprint, "fp1");
  assert.equal(record.completedAt, 100);
  assert.deepEqual(record.answers, [{ id: "fixture-kubernetes-001", difficulty: "advanced", question_type: ["architecture"], interview_level: ["senior-devops"], assessment: "nailed" }]);
  assert.deepEqual(record.explanations["fixture-kubernetes-001"], EXPLANATION);
});

test("projectToJobSessionRecord uses the LATEST verdict among the canonical question's own AI-follow-up chain", () => {
  const s = session({
    evaluations: [
      evaluation({ verdict: "needs-work", source: "canonical" }),
      evaluation({ verdict: "nailed", source: "ai-follow-up" }),
    ],
  });
  const record = projectToJobSessionRecord(s, 100);
  assert.equal(record.answers.length, 1, "an AI-generated follow-up must not create a separate answer entry");
  assert.equal(record.answers[0]!.assessment, "nailed");
});

test("projectToJobSessionRecord adds a SEPARATE answer entry for a canonical follow-up, with its own id", () => {
  const s = session({
    evaluations: [
      evaluation({ verdict: "needs-work", source: "canonical" }),
      evaluation({ verdict: "partial", source: "canonical-follow-up", questionId: "fixture-kubernetes-002", difficulty: "expert", questionType: ["scenario"], interviewLevel: ["staff-principal"] }),
    ],
  });
  const record = projectToJobSessionRecord(s, 100);
  assert.equal(record.answers.length, 2);
  const followUpAnswer = record.answers.find((a) => a.id === "fixture-kubernetes-002");
  assert.ok(followUpAnswer);
  assert.equal(followUpAnswer!.assessment, "partial");
  assert.ok(record.explanations["fixture-kubernetes-002"], "the canonical follow-up must get its own explanation for Job Readiness's by-tag lookup");
  assert.equal(record.explanations["fixture-kubernetes-002"]!.tag, "kubernetes");
});

test("projectToJobSessionRecord: an ai-follow-up evaluation alone (no canonical evaluation yet recorded) still contributes to the parent's own outcome", () => {
  const s = session({ evaluations: [evaluation({ verdict: "partial", source: "ai-follow-up" })] });
  const record = projectToJobSessionRecord(s, 100);
  assert.equal(record.answers.length, 1);
  assert.equal(record.answers[0]!.id, "fixture-kubernetes-001");
});

test("projectToJobSessionRecord produces no answers at all for a session with zero evaluations", () => {
  const record = projectToJobSessionRecord(session({ evaluations: [] }), 100);
  assert.deepEqual(record.answers, []);
  assert.deepEqual(record.explanations, {});
});
