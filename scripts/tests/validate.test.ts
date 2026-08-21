import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { RawQuestionFile } from "../lib/content";
import { validateCorpus } from "../lib/validate";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const schema = JSON.parse(readFileSync(join(ROOT, "schemas", "question.schema.json"), "utf-8"));
const taxonomy: { categories: { slug: string }[] } = JSON.parse(
  readFileSync(join(ROOT, "schemas", "taxonomy.json"), "utf-8"),
);
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema: ValidateFunction = ajv.compile(schema);
const validCategories = new Set(taxonomy.categories.map((c) => c.slug));

const DEFAULT_SECTIONS = new Map<string, string>([
  ["Question", "Q."],
  ["Short Answer", "A."],
  ["Detailed Explanation", "D."],
  ["Key Takeaways", "K."],
]);

function makeFile(
  overrides: Record<string, unknown> = {},
  sections: Map<string, string> = DEFAULT_SECTIONS,
): RawQuestionFile {
  return {
    file: "content/aws/iam/fixture.md",
    relFile: "content/aws/iam/fixture.md",
    slug: "fixture",
    body: "",
    sections,
    data: {
      id: "aws-iam-test-fixture-001",
      title: "A sufficiently long fixture title used only for unit tests",
      category: "aws",
      subcategory: "iam",
      technologies: ["aws"],
      difficulty: "beginner",
      question_type: ["conceptual"],
      tags: ["test"],
      estimated_time_minutes: 5,
      companies: [],
      related_questions: [],
      status: "draft",
      last_reviewed: "2026-01-01",
      last_updated: "2026-01-01",
      ...overrides,
    },
  };
}

test("validateCorpus accepts a well-formed fixture", () => {
  const { errors, valid } = validateCorpus([makeFile()], validateSchema, validCategories);
  assert.deepEqual(errors, []);
  assert.equal(valid.length, 1);
});

test("validateCorpus rejects an unregistered category", () => {
  const { errors } = validateCorpus([makeFile({ category: "not-a-real-category" })], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes("not registered")));
});

test("validateCorpus flags duplicate ids across files", () => {
  const a = makeFile();
  const b = makeFile();
  b.relFile = "content/aws/iam/fixture-2.md";
  const { errors } = validateCorpus([a, b], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes("duplicate id")));
});

test("validateCorpus flags a self-referencing related_questions entry", () => {
  const file = makeFile({ related_questions: ["aws-iam-test-fixture-001"] });
  const { errors } = validateCorpus([file], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes("references its own id")));
});

test("validateCorpus flags a dangling related_questions reference", () => {
  const file = makeFile({ related_questions: ["does-not-exist-999"] });
  const { errors } = validateCorpus([file], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes("unknown id")));
});

test("validateCorpus resolves a related_questions reference that exists elsewhere in the corpus", () => {
  const a = makeFile({ id: "aws-iam-a-001", related_questions: ["aws-iam-b-001"] });
  const b = makeFile({ id: "aws-iam-b-001" });
  b.relFile = "content/aws/iam/fixture-b.md";
  const { errors } = validateCorpus([a, b], validateSchema, validCategories);
  assert.deepEqual(errors, []);
});

test("validateCorpus requires troubleshooting sections when question_type includes troubleshooting", () => {
  const file = makeFile({ question_type: ["troubleshooting"] });
  const { errors } = validateCorpus([file], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes('"## Symptoms"')));
  assert.ok(errors.some((e) => e.message.includes('"## Resolution"')));
});

test("validateCorpus requires architecture sections when question_type includes architecture", () => {
  const file = makeFile({ question_type: ["architecture"] });
  const { errors } = validateCorpus([file], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes('"## Requirements"')));
  assert.ok(errors.some((e) => e.message.includes('"## Trade-offs"')));
});

test("validateCorpus does not require troubleshooting sections for a purely conceptual question", () => {
  const file = makeFile({ question_type: ["conceptual"] });
  const { errors } = validateCorpus([file], validateSchema, validCategories);
  assert.deepEqual(errors, []);
});

test("validateCorpus flags an empty required section", () => {
  const sections = new Map(DEFAULT_SECTIONS);
  sections.set("Short Answer", "");
  const { errors } = validateCorpus([makeFile({}, sections)], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes('section "## Short Answer" is empty')));
});

test("validateCorpus flags placeholder text", () => {
  const sections = new Map(DEFAULT_SECTIONS);
  sections.set("Short Answer", "TODO: fill this in");
  const { errors } = validateCorpus([makeFile({}, sections)], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.includes("placeholder text")));
});

test("validateCorpus excludes schema-invalid files from the valid list and from cross-file checks", () => {
  const invalid = makeFile({ difficulty: "not-a-real-difficulty" });
  const { errors, valid } = validateCorpus([invalid], validateSchema, validCategories);
  assert.ok(errors.some((e) => e.message.startsWith("schema:")));
  assert.equal(valid.length, 0);
});
