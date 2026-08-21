import assert from "node:assert/strict";
import { test } from "node:test";
import { detectNearDuplicateTitles } from "../lib/duplicates";
import type { QuestionRecord } from "../lib/validate";

function record(id: string, title: string, category = "aws"): QuestionRecord {
  return {
    file: `${id}.md`,
    relFile: `${id}.md`,
    slug: id,
    body: "",
    sections: new Map(),
    data: {
      id,
      title,
      category,
      subcategory: "x",
      technologies: [],
      difficulty: "beginner",
      question_type: ["conceptual"],
      tags: [],
      estimated_time_minutes: 5,
      status: "draft",
      last_reviewed: "2026-01-01",
      last_updated: "2026-01-01",
    },
  };
}

test("flags near-identical titles in the same category", () => {
  const a = record("a-001", "How would you troubleshoot high memory usage in a production container");
  const b = record("a-002", "How would you troubleshoot high memory usage in a production container instance");
  const warnings = detectNearDuplicateTitles([a, b]);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]!.a, "a-001");
  assert.equal(warnings[0]!.b, "a-002");
});

test("does not flag identical titles across different categories", () => {
  const a = record("a-001", "How would you troubleshoot high memory usage in a production container", "aws");
  const b = record("k-001", "How would you troubleshoot high memory usage in a production container", "kubernetes");
  const warnings = detectNearDuplicateTitles([a, b]);
  assert.equal(warnings.length, 0);
});

test("does not flag unrelated titles in the same category", () => {
  const a = record("a-001", "How do you rotate IAM access keys safely without downtime");
  const b = record("a-002", "What causes a Terraform plan to force a resource replacement");
  const warnings = detectNearDuplicateTitles([a, b]);
  assert.equal(warnings.length, 0);
});
