import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeClaimValidationStatuses,
  computeCoveragePercent,
  computeJdFingerprint,
  computeJobReadiness,
  computeRequirementPerformance,
  recommendNextPractice,
  type JobSessionRecord,
} from "../../lib/job-readiness";
import type { RequirementAssessment, ResumeSkill } from "../../lib/job-match";
import type { AnsweredQuestion, InterviewQuestionEntry, JobMatchExplanation, SelfAssessment } from "../../lib/interview-session";
import type { TechTag } from "../../lib/tech-taxonomy";

function assessment(overrides: Partial<RequirementAssessment> = {}): RequirementAssessment {
  return { tag: "aws", label: "AWS", mustHave: true, evidence: "strong", risk: "low", reason: "reason", matchRule: "direct", ...overrides };
}

function answer(id: string, assess: SelfAssessment): AnsweredQuestion {
  return { id, difficulty: "intermediate", question_type: ["conceptual"], interview_level: ["devops-engineer"], assessment: assess };
}

function explanation(kind: JobMatchExplanation["kind"], tag: string): JobMatchExplanation {
  return { kind, tag, label: tag, reason: "reason" };
}

function record(overrides: Partial<JobSessionRecord> = {}): JobSessionRecord {
  return { jdFingerprint: "fp1", completedAt: Date.now(), answers: [], explanations: {}, ...overrides };
}

function q(overrides: Partial<InterviewQuestionEntry> = {}): InterviewQuestionEntry {
  return {
    id: "fixture-001",
    category: "kubernetes",
    subcategory: "troubleshooting",
    difficulty: "intermediate",
    question_type: ["conceptual"],
    interview_level: ["devops-engineer"],
    technologies: ["kubernetes"],
    question: "Question body",
    shortAnswer: "Short answer body",
    url: "/questions/kubernetes/troubleshooting/fixture",
    ...overrides,
  };
}

test("computeJdFingerprint is stable for identical text and differs for different text", () => {
  const a = computeJdFingerprint("AWS and Kubernetes required.");
  const b = computeJdFingerprint("AWS and Kubernetes required.");
  const c = computeJdFingerprint("AWS and Terraform required.");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("computeJdFingerprint normalizes whitespace and case", () => {
  const a = computeJdFingerprint("AWS and Kubernetes required.");
  const b = computeJdFingerprint("  aws   and   kubernetes required.  ");
  assert.equal(a, b);
});

test("computeCoveragePercent weights must-have requirements more than nice-to-have", () => {
  const percent = computeCoveragePercent([
    assessment({ tag: "aws", mustHave: true, evidence: "strong" }),
    assessment({ tag: "prometheus", mustHave: false, evidence: "absent" }),
  ]);
  assert.equal(percent, Math.round((2 / 3) * 100 / 5) * 5);
});

test("computeCoveragePercent gives zero credit for adjacent evidence, matching the High risk badge", () => {
  const percent = computeCoveragePercent([assessment({ evidence: "adjacent" })]);
  assert.equal(percent, 0);
});

test("Case 1 — strong resume coverage + strong interview performance yields a strong band", () => {
  const assessments = [
    assessment({ tag: "aws", evidence: "strong" }),
    assessment({ tag: "terraform", label: "Terraform", evidence: "strong" }),
    assessment({ tag: "kubernetes", label: "Kubernetes", evidence: "strong" }),
    assessment({ tag: "security", label: "Security", evidence: "strong" }),
  ];
  const records = [
    record({
      answers: [answer("q1", "nailed"), answer("q2", "nailed"), answer("q3", "nailed")],
      explanations: { q1: explanation("validating-claim", "aws"), q2: explanation("validating-claim", "aws"), q3: explanation("validating-claim", "terraform") },
    }),
  ];
  const readiness = computeJobReadiness(assessments, records);
  assert.equal(readiness.coveragePercent, 100);
  assert.equal(readiness.performancePercent, 100);
  assert.equal(readiness.band, "strong");
});

test("Case 2 — strong resume coverage + weak interview performance does NOT read as strong", () => {
  const assessments = [
    assessment({ tag: "aws", evidence: "strong" }),
    assessment({ tag: "terraform", evidence: "strong" }),
    assessment({ tag: "kubernetes", evidence: "strong" }),
    assessment({ tag: "security", evidence: "strong" }),
  ];
  const records = [
    record({
      answers: [answer("q1", "needs-work"), answer("q2", "needs-work"), answer("q3", "partial")],
      explanations: { q1: explanation("validating-claim", "aws"), q2: explanation("validating-claim", "aws"), q3: explanation("validating-claim", "terraform") },
    }),
  ];
  const readiness = computeJobReadiness(assessments, records);
  assert.equal(readiness.coveragePercent, 100);
  assert.ok(readiness.performancePercent !== null && readiness.performancePercent < 35);
  assert.equal(readiness.band, "low");
});

test("Case 3 — weak resume coverage is not hidden by a perfect interview performance", () => {
  const assessments = [
    assessment({ tag: "aws", evidence: "strong" }),
    assessment({ tag: "kubernetes", evidence: "absent" }),
    assessment({ tag: "terraform", evidence: "absent" }),
    assessment({ tag: "security", evidence: "absent" }),
    assessment({ tag: "docker", evidence: "absent" }),
  ];
  const records = [
    record({
      answers: [answer("q1", "nailed"), answer("q2", "nailed"), answer("q3", "nailed"), answer("q4", "nailed")],
      explanations: {
        q1: explanation("covering-gap", "kubernetes"),
        q2: explanation("covering-gap", "terraform"),
        q3: explanation("covering-gap", "security"),
        q4: explanation("covering-gap", "docker"),
      },
    }),
  ];
  const readiness = computeJobReadiness(assessments, records);
  assert.equal(readiness.coveragePercent, 20);
  assert.equal(readiness.performancePercent, 100);
  assert.equal(readiness.band, "low", "a perfect interview score must not erase a major resume gap");
});

test("Case 4 — weak resume coverage + weak interview performance is unambiguously low", () => {
  const assessments = [
    assessment({ tag: "aws", evidence: "strong" }),
    assessment({ tag: "kubernetes", evidence: "absent" }),
    assessment({ tag: "terraform", evidence: "absent" }),
    assessment({ tag: "security", evidence: "absent" }),
    assessment({ tag: "docker", evidence: "absent" }),
  ];
  const records = [
    record({
      answers: [answer("q1", "needs-work"), answer("q2", "needs-work")],
      explanations: { q1: explanation("covering-gap", "kubernetes"), q2: explanation("covering-gap", "terraform") },
    }),
  ];
  const readiness = computeJobReadiness(assessments, records);
  assert.equal(readiness.coveragePercent, 20);
  assert.equal(readiness.performancePercent, 0);
  assert.equal(readiness.band, "low");
});

test("Case 5 — no resume provided still reports a low band even after a completed, well-answered interview", () => {
  const assessments = [assessment({ tag: "aws", evidence: "absent" }), assessment({ tag: "kubernetes", evidence: "absent" }), assessment({ tag: "terraform", evidence: "absent" })];
  const records = [
    record({
      answers: [answer("q1", "nailed"), answer("q2", "nailed"), answer("q3", "nailed")],
      explanations: { q1: explanation("covering-gap", "aws"), q2: explanation("covering-gap", "kubernetes"), q3: explanation("covering-gap", "terraform") },
    }),
  ];
  const readiness = computeJobReadiness(assessments, records);
  assert.equal(readiness.coveragePercent, 0);
  assert.equal(readiness.performancePercent, 100);
  assert.equal(readiness.band, "low", "resume coverage alone being zero must not be masked by interview performance");
});

test("Case 6 — a strong resume claim with a needs-work interview result is not reported as validated", () => {
  const assessments = [assessment({ tag: "terraform", evidence: "strong" })];
  const resumeSkills: ResumeSkill[] = [{ tag: "terraform", isClaim: true, claimPhrase: "Architected the Terraform module structure." }];
  const records = [record({ answers: [answer("q1", "needs-work")], explanations: { q1: explanation("validating-claim", "terraform") } })];

  const claims = computeClaimValidationStatuses(resumeSkills, records);
  assert.equal(claims[0]!.status, "interview-evidence");
  assert.equal(claims[0]!.outcome, "needs-work");

  const readiness = computeJobReadiness(assessments, records);
  assert.equal(readiness.coveragePercent, 100);
  assert.equal(readiness.performancePercent, 0);
  assert.equal(readiness.band, "low", "a claim that failed validation must pull the band down, not get hidden behind resume coverage");
});

test("Case 7 — a requirement tested with only one question is reported distinctly from one tested several times", () => {
  const assessments = [assessment({ tag: "kubernetes", evidence: "absent" }), assessment({ tag: "security", evidence: "absent" })];
  const records = [
    record({
      answers: [answer("q1", "nailed"), answer("q2", "nailed"), answer("q3", "nailed"), answer("q4", "partial")],
      explanations: {
        q1: explanation("covering-gap", "kubernetes"),
        q2: explanation("covering-gap", "security"),
        q3: explanation("covering-gap", "security"),
        q4: explanation("covering-gap", "security"),
      },
    }),
  ];
  const performance = computeRequirementPerformance(assessments, records);
  const kubernetes = performance.find((p) => p.tag === "kubernetes")!;
  const security = performance.find((p) => p.tag === "security")!;
  assert.equal(kubernetes.total, 1, "N=1 must be visible in the data so the UI can qualify it");
  assert.equal(security.total, 3);
});

test("Case 8 — a JD with more must-have requirements than the session could seat reports partial testing honestly", () => {
  const tags: TechTag[] = ["aws", "kubernetes", "terraform", "security", "docker", "ansible", "prometheus", "jenkins"];
  const assessments = tags.map((tag) => assessment({ tag, evidence: "absent" }));
  const testedTags = tags.slice(0, 5);
  const answers = testedTags.map((_, i) => answer(`q${i}`, "nailed"));
  const explanations: Record<string, JobMatchExplanation> = {};
  testedTags.forEach((tag, i) => (explanations[`q${i}`] = explanation("covering-gap", tag)));
  const records = [record({ answers, explanations })];

  const readiness = computeJobReadiness(assessments, records);
  assert.equal(readiness.totalTagCount, 8);
  assert.equal(readiness.testedTagCount, 5);
  assert.equal(readiness.coveragePercent, 0, "coverage reflects the whole JD, not just the tested subset");
});

test("no completed sessions yet: performancePercent is null, never zero, and combinedPercent falls back to coverage alone", () => {
  const assessments = [assessment({ tag: "aws", evidence: "strong" }), assessment({ tag: "kubernetes", evidence: "absent" })];
  const readiness = computeJobReadiness(assessments, []);
  assert.equal(readiness.performancePercent, null);
  assert.equal(readiness.combinedPercent, readiness.coveragePercent);
  assert.equal(readiness.testedTagCount, 0);
});

test("a requirement never answered is tested:false, distinct from a requirement answered and needs-work", () => {
  const assessments = [assessment({ tag: "aws" }), assessment({ tag: "kubernetes" })];
  const records = [record({ answers: [answer("q1", "needs-work")], explanations: { q1: explanation("covering-gap", "kubernetes") } })];
  const performance = computeRequirementPerformance(assessments, records);
  const aws = performance.find((p) => p.tag === "aws")!;
  assert.equal(aws.tested, false);
  assert.equal(aws.total, 0);
});

test("claim validation status is not-yet-validated until a validating-claim question is actually answered", () => {
  const resumeSkills: ResumeSkill[] = [{ tag: "terraform", isClaim: true, claimPhrase: "Architected the Terraform module structure." }];
  const notYet = computeClaimValidationStatuses(resumeSkills, []);
  assert.equal(notYet[0]!.status, "not-yet-validated");
  assert.equal(notYet[0]!.outcome, undefined);
});

test("claim validation reflects the most recent outcome across multiple sessions, not the best one", () => {
  const resumeSkills: ResumeSkill[] = [{ tag: "terraform", isClaim: true, claimPhrase: "Architected the Terraform module structure." }];
  const records = [
    record({ completedAt: 1000, answers: [answer("q1", "nailed")], explanations: { q1: explanation("validating-claim", "terraform") } }),
    record({ completedAt: 2000, answers: [answer("q2", "needs-work")], explanations: { q2: explanation("validating-claim", "terraform") } }),
  ];
  const claims = computeClaimValidationStatuses(resumeSkills, records);
  assert.equal(claims[0]!.outcome, "needs-work");
});

test("readiness only counts records matching the given fingerprint's records — callers are expected to pre-filter by fingerprint", () => {
  const assessments = [assessment({ tag: "aws", evidence: "absent" })];
  const recordsForOtherJob = [record({ jdFingerprint: "different-fp", answers: [answer("q1", "nailed")], explanations: { q1: explanation("covering-gap", "aws") } })];
  const readiness = computeJobReadiness(assessments, recordsForOtherJob.filter((r) => r.jdFingerprint === "fp1"));
  assert.equal(readiness.performancePercent, null);
});

test("recommendNextPractice surfaces untested and poorly-performing gaps using only real corpus questions", () => {
  const assessments = [
    assessment({ tag: "kubernetes", label: "Kubernetes", evidence: "absent" }),
    assessment({ tag: "aws", label: "AWS", evidence: "strong" }),
  ];
  const performance = [
    { tag: "kubernetes", label: "Kubernetes", tested: false, nailed: 0, partial: 0, needsWork: 0, total: 0 },
    { tag: "aws", label: "AWS", tested: true, nailed: 2, partial: 0, needsWork: 0, total: 2 },
  ];
  const pool = [
    q({ id: "k8s-1", category: "kubernetes", technologies: ["kubernetes"] }),
    q({ id: "aws-1", category: "aws", technologies: ["aws"] }),
  ];
  const recs = recommendNextPractice(assessments, performance, pool, new Set());
  assert.equal(recs.length, 1);
  assert.equal(recs[0]!.tag, "kubernetes");
  assert.ok(recs[0]!.questions.every((rq) => pool.some((p) => p.id === rq.id)));
});

test("recommendNextPractice does not recommend a requirement that was already nailed every time it was tested", () => {
  const assessments = [assessment({ tag: "aws", evidence: "strong" })];
  const performance = [{ tag: "aws", label: "AWS", tested: true, nailed: 2, partial: 0, needsWork: 0, total: 2 }];
  const pool = [q({ id: "aws-1", category: "aws", technologies: ["aws"] })];
  const recs = recommendNextPractice(assessments, performance, pool, new Set());
  assert.equal(recs.length, 0);
});

test("recommendNextPractice draws from every tag in a capability requirement's equivalence set", () => {
  const assessments = [assessment({ tag: "kubernetes", label: "Container orchestration", evidence: "absent", equivalentTags: ["kubernetes", "ecs"] })];
  const performance = [{ tag: "kubernetes", label: "Container orchestration", tested: false, nailed: 0, partial: 0, needsWork: 0, total: 0 }];
  const pool = [
    q({ id: "ecs-1", category: "aws", technologies: ["ecs"] }),
    q({ id: "k8s-1", category: "kubernetes", technologies: ["kubernetes"] }),
  ];
  const recs = recommendNextPractice(assessments, performance, pool, new Set());
  assert.equal(recs.length, 1);
  const ids = recs[0]!.questions.map((r) => r.id).sort();
  assert.deepEqual(ids, ["ecs-1", "k8s-1"]);
});
