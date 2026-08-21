import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIndex } from "../lib/index-builder";
import type { QuestionRecord } from "../lib/validate";

function record(id: string): QuestionRecord {
  return {
    file: `content/aws/iam/${id}.md`,
    relFile: `content/aws/iam/${id}.md`,
    slug: id,
    body: "",
    sections: new Map(),
    data: {
      id,
      title: "fixture",
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

test("buildIndex derives a url from category/subcategory/slug", () => {
  const [entry] = buildIndex([record("aws-iam-x-001")]);
  assert.equal(entry!.url, "/questions/aws/iam/aws-iam-x-001");
});

test("buildIndex defaults optional fields to empty arrays/objects", () => {
  const [entry] = buildIndex([record("aws-iam-x-001")]);
  assert.deepEqual(entry!.companies, []);
  assert.deepEqual(entry!.related_questions, []);
  assert.deepEqual(entry!.technology_version, {});
});

test("buildIndex sorts entries by id ascending", () => {
  const result = buildIndex([record("b-001"), record("a-001"), record("c-001")]);
  assert.deepEqual(result.map((r) => r.id), ["a-001", "b-001", "c-001"]);
});

test("buildIndex carries content_path through unchanged for later linking to the markdown source", () => {
  const [entry] = buildIndex([record("aws-iam-x-001")]);
  assert.equal(entry!.content_path, "content/aws/iam/aws-iam-x-001.md");
});
