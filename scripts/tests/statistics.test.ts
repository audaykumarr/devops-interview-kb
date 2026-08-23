import assert from "node:assert/strict";
import { test } from "node:test";
import { computeStatistics } from "../lib/statistics";
import type { QuestionFrontmatter, QuestionRecord } from "../lib/validate";

function record(id: string, overrides: Partial<QuestionFrontmatter> = {}): QuestionRecord {
  return {
    file: `${id}.md`,
    relFile: `${id}.md`,
    slug: id,
    body: "",
    sections: new Map(),
    data: {
      id,
      title: "t",
      category: "aws",
      subcategory: "s",
      technologies: ["aws"],
      difficulty: "beginner",
      question_type: ["conceptual"],
      tags: [],
      estimated_time_minutes: 5,
      status: "published",
      last_reviewed: "2026-01-01",
      last_updated: "2026-01-01",
      ...overrides,
    },
  };
}

test("computeStatistics counts by category, difficulty, technology, question_type, and status", () => {
  const stats = computeStatistics([
    record("a", { category: "aws", difficulty: "beginner", technologies: ["aws", "iam"], question_type: ["conceptual"], status: "published" }),
    record("b", { category: "aws", difficulty: "advanced", technologies: ["aws"], question_type: ["scenario", "security"], status: "draft" }),
    record("c", { category: "docker", difficulty: "beginner", technologies: ["docker"], question_type: ["practical"], status: "published" }),
  ]);
  assert.equal(stats.total_questions, 3);
  assert.deepEqual(stats.by_category, { aws: 2, docker: 1 });
  assert.deepEqual(stats.by_difficulty, { beginner: 2, advanced: 1 });
  assert.deepEqual(stats.by_technology, { aws: 2, iam: 1, docker: 1 });
  assert.deepEqual(stats.by_question_type, { conceptual: 1, scenario: 1, security: 1, practical: 1 });
  assert.deepEqual(stats.by_status, { published: 2, draft: 1 });
});

test("computeStatistics also computes by_interview_level from the same difficulty/category/question_type rules", () => {
  const stats = computeStatistics([
    // beginner + aws -> junior-devops, devops-engineer, cloud-engineer
    record("a", { category: "aws", difficulty: "beginner", question_type: ["conceptual"] }),
    // advanced + aws + security type -> senior-devops, staff-principal, cloud-engineer, devsecops
    record("b", { category: "aws", difficulty: "advanced", question_type: ["scenario", "security"] }),
  ]);
  assert.deepEqual(stats.by_interview_level, {
    "junior-devops": 1,
    "devops-engineer": 1,
    "cloud-engineer": 2,
    "senior-devops": 1,
    "staff-principal": 1,
    devsecops: 1,
  });
});

test("computeStatistics orders recently_updated newest first and caps at 10", () => {
  const records = Array.from({ length: 12 }, (_, i) =>
    record(`q-${i}`, { last_updated: `2026-01-${String(i + 1).padStart(2, "0")}` }),
  );
  const stats = computeStatistics(records);
  assert.equal(stats.recently_updated.length, 10);
  assert.equal(stats.recently_updated[0]!.id, "q-11");
  assert.equal(stats.recently_updated[9]!.id, "q-2");
});

test("computeStatistics on an empty corpus produces zeroed-out stats, not a crash", () => {
  const stats = computeStatistics([]);
  assert.equal(stats.total_questions, 0);
  assert.deepEqual(stats.by_category, {});
  assert.deepEqual(stats.recently_updated, []);
});
