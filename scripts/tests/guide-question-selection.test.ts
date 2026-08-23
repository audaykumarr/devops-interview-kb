import assert from "node:assert/strict";
import { test } from "node:test";
import { pickRepresentativeQuestions } from "../lib/guide-question-selection";
import type { QuestionIndexEntry } from "../lib/index-builder";

function q(id: string, question_type: string[]): QuestionIndexEntry {
  return {
    id,
    title: `Title for ${id}`,
    slug: id,
    category: "kubernetes",
    subcategory: "networking",
    technologies: ["kubernetes"],
    difficulty: "intermediate",
    question_type,
    interview_level: [],
    tags: [],
    estimated_time_minutes: 5,
    companies: [],
    related_questions: [],
    status: "published",
    last_reviewed: "2026-01-01",
    last_updated: "2026-01-01",
    technology_version: {},
    content_path: `${id}.md`,
    url: `/questions/kubernetes/networking/${id}`,
  };
}

test("pickRepresentativeQuestions prefers featured questions first", () => {
  const items = [q("a", ["conceptual"]), q("b", ["troubleshooting"]), q("c", ["scenario"])];
  const picked = pickRepresentativeQuestions(items, new Set(["c"]), 3);
  assert.equal(picked[0]!.id, "c");
});

test("pickRepresentativeQuestions diversifies by question_type after featured picks", () => {
  const items = [q("a", ["conceptual"]), q("b", ["conceptual"]), q("c", ["troubleshooting"]), q("d", ["scenario"])];
  const picked = pickRepresentativeQuestions(items, new Set(), 3);
  const types = picked.map((p) => p.question_type[0]);
  assert.ok(types.includes("troubleshooting"), "expected a troubleshooting pick");
  assert.ok(types.includes("scenario"), "expected a scenario pick");
});

test("pickRepresentativeQuestions never returns more than the requested limit", () => {
  const items = [q("a", ["conceptual"]), q("b", ["troubleshooting"]), q("c", ["scenario"]), q("d", ["practical"])];
  const picked = pickRepresentativeQuestions(items, new Set(), 3);
  assert.equal(picked.length, 3);
});

test("pickRepresentativeQuestions never duplicates a question across featured and type-diversity passes", () => {
  const items = [q("a", ["troubleshooting"]), q("b", ["conceptual"])];
  const picked = pickRepresentativeQuestions(items, new Set(["a"]), 3);
  const ids = picked.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("pickRepresentativeQuestions is deterministic across repeated calls with the same input", () => {
  const items = [q("a", ["conceptual"]), q("b", ["comparison"]), q("c", ["conceptual"]), q("d", ["security"])];
  const first = pickRepresentativeQuestions(items, new Set(), 3).map((p) => p.id);
  const second = pickRepresentativeQuestions(items, new Set(), 3).map((p) => p.id);
  assert.deepEqual(first, second);
});

test("pickRepresentativeQuestions falls back to stable input order once type diversity and featured picks are exhausted", () => {
  const items = [q("a", ["conceptual"]), q("b", ["conceptual"]), q("c", ["conceptual"])];
  const picked = pickRepresentativeQuestions(items, new Set(), 2);
  assert.deepEqual(picked.map((p) => p.id), ["a", "b"]);
});

test("pickRepresentativeQuestions returns fewer than the limit when the group itself is smaller", () => {
  const items = [q("a", ["conceptual"])];
  const picked = pickRepresentativeQuestions(items, new Set(), 3);
  assert.equal(picked.length, 1);
});
