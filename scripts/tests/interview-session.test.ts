import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appendSessionHistory,
  buildInterviewPool,
  computeDifficultyQuota,
  computeResults,
  filterInterviewPool,
  loadSessionHistory,
  mapAssessmentToPracticeStatus,
  parseActiveSession,
  parseSessionHistory,
  selectBalancedSession,
  type AnsweredQuestion,
  type CompletedInterviewSession,
  type InterviewConfig,
  type InterviewQuestionEntry,
} from "../../lib/interview-session";

function makeQuestion(overrides: Partial<InterviewQuestionEntry> = {}): InterviewQuestionEntry {
  return {
    id: "fixture-001",
    category: "kubernetes",
    subcategory: "troubleshooting",
    difficulty: "intermediate",
    question_type: ["troubleshooting"],
    interview_level: ["devops-engineer"],
    technologies: ["kubernetes"],
    question: "Question body",
    shortAnswer: "Short answer body",
    url: "/questions/kubernetes/troubleshooting/fixture",
    ...overrides,
  };
}

test("buildInterviewPool joins question-index metadata with practice-set body text by id", () => {
  const pool = buildInterviewPool(
    [
      {
        id: "q1",
        title: "t",
        slug: "q1",
        category: "aws",
        subcategory: "iam",
        technologies: ["aws"],
        difficulty: "advanced",
        question_type: ["security"],
        interview_level: ["senior-devops"],
        tags: [],
        estimated_time_minutes: 5,
        companies: [],
        related_questions: [],
        status: "published",
        last_reviewed: "2026-01-01",
        last_updated: "2026-01-01",
        technology_version: {},
        content_path: "content/aws/iam/q1.md",
        url: "/questions/aws/iam/q1",
      },
    ] as never,
    [{ id: "q1", title: "t", category: "aws", subcategory: "iam", difficulty: "advanced", technologies: ["aws"], question_type: ["security"], question: "Body?", shortAnswer: "Answer.", url: "/questions/aws/iam/q1" }],
  );
  assert.equal(pool.length, 1);
  assert.equal(pool[0]!.interview_level[0], "senior-devops");
  assert.equal(pool[0]!.question, "Body?");
  assert.equal(pool[0]!.shortAnswer, "Answer.");
});

test("buildInterviewPool skips a question-index entry with no matching practice entry", () => {
  const pool = buildInterviewPool(
    [{ id: "orphan", category: "aws", subcategory: "iam", difficulty: "advanced", question_type: [], interview_level: [] } as never],
    [],
  );
  assert.equal(pool.length, 0);
});

test("filterInterviewPool applies AND-across-dimensions, OR-within-a-dimension semantics", () => {
  const pool = [
    makeQuestion({ id: "a", category: "aws", difficulty: "advanced", interview_level: ["senior-devops"] }),
    makeQuestion({ id: "b", category: "gcp", difficulty: "advanced", interview_level: ["senior-devops"] }),
    makeQuestion({ id: "c", category: "aws", difficulty: "beginner", interview_level: ["senior-devops"] }),
    makeQuestion({ id: "d", category: "aws", difficulty: "advanced", interview_level: ["junior-devops"] }),
  ];
  const config: InterviewConfig = { levels: ["senior-devops"], types: [], difficulties: ["advanced", "expert"], categories: ["aws", "gcp"], count: 10, timeMode: "off" };
  const result = filterInterviewPool(pool, config).map((q) => q.id);
  assert.deepEqual(result.sort(), ["a", "b"]);
});

test("filterInterviewPool with no filters set returns the entire pool unchanged", () => {
  const pool = [makeQuestion({ id: "a" }), makeQuestion({ id: "b" })];
  const config: InterviewConfig = { levels: [], types: [], difficulties: [], categories: [], count: 10, timeMode: "off" };
  assert.equal(filterInterviewPool(pool, config).length, 2);
});

test("computeDifficultyQuota splits count evenly across available difficulties", () => {
  const quota = computeDifficultyQuota({ intermediate: 10, advanced: 10, expert: 10 }, 9);
  assert.deepEqual(quota, { intermediate: 3, advanced: 3, expert: 3 });
});

test("computeDifficultyQuota redistributes shortfall to difficulties with remaining room", () => {
  // 10 seats across 3 difficulties, but expert only has 1 available — the other 2 must go elsewhere.
  const quota = computeDifficultyQuota({ intermediate: 10, advanced: 10, expert: 1 }, 10);
  const total = Object.values(quota).reduce((a, b) => a + b, 0);
  assert.equal(total, 10);
  assert.equal(quota.expert, 1);
});

test("computeDifficultyQuota never exceeds total availability", () => {
  const quota = computeDifficultyQuota({ beginner: 1, intermediate: 1 }, 10);
  const total = Object.values(quota).reduce((a, b) => a + b, 0);
  assert.equal(total, 2);
});

test("computeDifficultyQuota returns an empty quota when nothing is available", () => {
  assert.deepEqual(computeDifficultyQuota({}, 10), {});
});

test("selectBalancedSession returns a balanced spread across difficulties, not clustered in one", () => {
  const pool: InterviewQuestionEntry[] = [];
  for (const difficulty of ["intermediate", "advanced", "expert"]) {
    for (let i = 0; i < 10; i++) {
      pool.push(makeQuestion({ id: `${difficulty}-${i}`, difficulty, question_type: [i % 2 === 0 ? "troubleshooting" : "architecture"] }));
    }
  }
  // An identity "shuffle" so the test is deterministic while still exercising the real selection logic.
  const selected = selectBalancedSession(pool, 9, (items) => items);
  assert.equal(selected.length, 9);
  const byDifficulty: Record<string, number> = {};
  for (const q of selected) byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1;
  assert.deepEqual(byDifficulty, { intermediate: 3, advanced: 3, expert: 3 });
});

test("selectBalancedSession never returns more questions than the pool actually has", () => {
  const pool = [makeQuestion({ id: "only-one" })];
  const selected = selectBalancedSession(pool, 10);
  assert.equal(selected.length, 1);
});

test("computeResults scores nailed=2/partial=1/needs-work=0 and reports percentage", () => {
  const answers: AnsweredQuestion[] = [
    { id: "a", difficulty: "advanced", question_type: ["troubleshooting"], interview_level: ["senior-devops"], assessment: "nailed" },
    { id: "b", difficulty: "advanced", question_type: ["architecture"], interview_level: ["senior-devops"], assessment: "partial" },
    { id: "c", difficulty: "advanced", question_type: ["troubleshooting"], interview_level: ["staff-principal"], assessment: "needs-work" },
  ];
  const results = computeResults(3, answers);
  assert.equal(results.score, 3);
  assert.equal(results.maxScore, 6);
  assert.equal(results.percentage, 50);
  assert.deepEqual(results.needsWorkIds, ["c"]);
  const troubleshooting = results.byType.find((t) => t.type === "troubleshooting");
  assert.equal(troubleshooting!.total, 2);
  assert.equal(troubleshooting!.nailed, 1);
  assert.equal(troubleshooting!.needsWork, 1);
});

test("computeResults on zero answers doesn't divide by zero", () => {
  const results = computeResults(5, []);
  assert.equal(results.percentage, 0);
  assert.equal(results.maxScore, 0);
});

test("mapAssessmentToPracticeStatus maps nailed to known and everything else to review", () => {
  assert.equal(mapAssessmentToPracticeStatus("nailed"), "known");
  assert.equal(mapAssessmentToPracticeStatus("partial"), "review");
  assert.equal(mapAssessmentToPracticeStatus("needs-work"), "review");
});

test("parseActiveSession tolerates missing, malformed, and structurally-wrong data", () => {
  assert.equal(parseActiveSession(null), null);
  assert.equal(parseActiveSession("not json"), null);
  assert.equal(parseActiveSession(JSON.stringify({ foo: "bar" })), null);
  const valid = { config: { levels: [], types: [], difficulties: [], categories: [], count: 10, timeMode: "off" }, questionIds: ["a"], startedAt: 1, answers: [] };
  assert.deepEqual(parseActiveSession(JSON.stringify(valid)), valid);
});

test("parseSessionHistory tolerates missing, malformed, and non-array data", () => {
  assert.deepEqual(parseSessionHistory(null), []);
  assert.deepEqual(parseSessionHistory("not json"), []);
  assert.deepEqual(parseSessionHistory(JSON.stringify({ not: "an array" })), []);
  assert.equal(parseSessionHistory(JSON.stringify([{ a: 1 }])).length, 1);
});

test("appendSessionHistory and loadSessionHistory round-trip via a stubbed localStorage", () => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;

  const session: CompletedInterviewSession = {
    config: { levels: [], types: [], difficulties: [], categories: [], count: 5, timeMode: "off" },
    startedAt: 1,
    completedAt: 2,
    answers: [],
  };
  appendSessionHistory(session);
  const history = loadSessionHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0]!.completedAt, 2);

  delete (globalThis as { localStorage?: Storage }).localStorage;
});
