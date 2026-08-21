import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPracticeSet } from "../lib/practice-builder";
import type { QuestionRecord } from "../lib/validate";

function record(id: string, sections: Record<string, string> = {}): QuestionRecord {
  return {
    file: `content/aws/iam/${id}.md`,
    relFile: `content/aws/iam/${id}.md`,
    slug: id,
    body: "",
    sections: new Map(Object.entries(sections)),
    data: {
      id,
      title: "fixture title",
      category: "aws",
      subcategory: "iam",
      technologies: ["aws"],
      difficulty: "beginner",
      question_type: ["conceptual"],
      tags: ["iam"],
      estimated_time_minutes: 5,
      status: "published",
      last_reviewed: "2026-01-01",
      last_updated: "2026-01-01",
    },
  };
}

test("buildPracticeSet pulls Question and Short Answer sections", () => {
  const [entry] = buildPracticeSet([record("aws-iam-x-001", { Question: "What is X?", "Short Answer": "X is Y." })]);
  assert.equal(entry!.question, "What is X?");
  assert.equal(entry!.shortAnswer, "X is Y.");
});

test("buildPracticeSet falls back to the title when Question section is missing", () => {
  const [entry] = buildPracticeSet([record("aws-iam-x-001")]);
  assert.equal(entry!.question, "fixture title");
});

test("buildPracticeSet derives a url from category/subcategory/slug", () => {
  const [entry] = buildPracticeSet([record("aws-iam-x-001")]);
  assert.equal(entry!.url, "/questions/aws/iam/aws-iam-x-001");
});

test("buildPracticeSet sorts entries by id ascending", () => {
  const result = buildPracticeSet([record("b-001"), record("a-001"), record("c-001")]);
  assert.deepEqual(result.map((r) => r.id), ["a-001", "b-001", "c-001"]);
});
