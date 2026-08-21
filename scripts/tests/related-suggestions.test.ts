import assert from "node:assert/strict";
import { test } from "node:test";
import { suggestRelatedQuestions } from "../lib/related-suggestions";
import type { QuestionFrontmatter, QuestionRecord } from "../lib/validate";

function record(overrides: Partial<QuestionFrontmatter> & { id: string }): QuestionRecord {
  return {
    file: `${overrides.id}.md`,
    relFile: `${overrides.id}.md`,
    slug: overrides.id,
    body: "",
    sections: new Map(),
    data: {
      title: "fixture title",
      category: "aws",
      subcategory: "iam",
      technologies: ["aws"],
      difficulty: "beginner",
      question_type: ["conceptual"],
      tags: ["iam"],
      estimated_time_minutes: 5,
      status: "draft",
      related_questions: [],
      last_reviewed: "2026-01-01",
      last_updated: "2026-01-01",
      ...overrides,
    },
  };
}

test("suggests an in-scope, textually-similar question not already linked", () => {
  const a = record({ id: "a-001", title: "How would you migrate an IAM user to a scoped role", tags: ["iam", "migration"] });
  const b = record({ id: "a-002", title: "How would you migrate an IAM role to a scoped policy", tags: ["iam", "migration"] });
  const [result] = suggestRelatedQuestions([a, b]);
  assert.equal(result!.id, "a-001");
  assert.equal(result!.suggestions.some((s) => s.id === "a-002"), true);
});

test("does not suggest a question that is already in related_questions", () => {
  const a = record({ id: "a-001", title: "How would you migrate an IAM user to a scoped role", tags: ["iam"], related_questions: ["a-002"] });
  const b = record({ id: "a-002", title: "How would you migrate an IAM role to a scoped policy", tags: ["iam"] });
  const [result] = suggestRelatedQuestions([a, b]);
  assert.equal(result!.suggestions.some((s) => s.id === "a-002"), false);
});

test("does not suggest an out-of-scope question with no shared category, tag, or technology", () => {
  const a = record({ id: "a-001", title: "How would you migrate an IAM user to a scoped role", tags: ["iam"], technologies: ["aws"] });
  const b = record({
    id: "b-001",
    title: "How would you migrate an IAM user to a scoped role",
    category: "docker",
    tags: ["docker"],
    technologies: ["docker"],
  });
  const [result] = suggestRelatedQuestions([a, b]);
  assert.deepEqual(result!.suggestions, []);
});

test("caps suggestions and ranks by score descending", () => {
  const source = record({ id: "src", title: "How do you rotate a leaked production database credential safely", tags: ["credentials"] });
  const candidates = [
    record({ id: "c1", title: "How do you rotate a leaked production database credential", tags: ["credentials"] }),
    record({ id: "c2", title: "How do you rotate a leaked staging database credential", tags: ["credentials"] }),
    record({ id: "c3", title: "How do you rotate a leaked cache credential", tags: ["credentials"] }),
    record({ id: "c4", title: "How do you rotate a leaked queue credential", tags: ["credentials"] }),
  ];
  const [result] = suggestRelatedQuestions([source, ...candidates]);
  assert.ok(result!.suggestions.length <= 3);
  const scores = result!.suggestions.map((s) => s.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});
