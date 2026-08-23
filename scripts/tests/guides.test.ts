import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { RawQuestionFile } from "../lib/content";
import { buildGuideIndex } from "../lib/guide-index-builder";
import { REQUIRED_GUIDE_SECTIONS, validateGuideCorpus } from "../lib/validate-guides";
import type { GuideRecord } from "../lib/validate-guides";
import type { QuestionIndexEntry } from "../lib/index-builder";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const schema = JSON.parse(readFileSync(join(ROOT, "schemas", "guide.schema.json"), "utf-8"));
const taxonomy: { categories: { slug: string }[] } = JSON.parse(
  readFileSync(join(ROOT, "schemas", "taxonomy.json"), "utf-8"),
);
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema: ValidateFunction = ajv.compile(schema);
const validCategories = new Set(taxonomy.categories.map((c) => c.slug));
const validQuestionIds = new Set(["kubernetes-troubleshooting-crashloopbackoff-001", "kubernetes-networking-service-routing-001"]);

const FULL_SECTIONS = new Map<string, string>(REQUIRED_GUIDE_SECTIONS.map((heading) => [heading, `${heading} body.`]));

function makeGuideFile(overrides: Record<string, unknown> = {}, sections: Map<string, string> = FULL_SECTIONS): RawQuestionFile {
  return {
    file: "content/guides/fixture.md",
    relFile: "content/guides/fixture.md",
    slug: "fixture",
    body: "",
    sections,
    data: {
      id: "fixture-guide",
      title: "A sufficiently long fixture guide title",
      description: "A sufficiently long fixture guide description for schema validation purposes here.",
      guide_type: "interview",
      category: "kubernetes",
      categories: ["kubernetes"],
      technologies: ["kubernetes"],
      interview_levels: ["devops-engineer"],
      estimated_reading_minutes: 10,
      featured_questions: [],
      related_guides: [],
      related_technologies: [],
      status: "published",
      last_reviewed: "2026-08-23",
      last_updated: "2026-08-23",
      ...overrides,
    },
  };
}

test("validateGuideCorpus accepts a well-formed guide with all required sections", () => {
  const { errors, valid } = validateGuideCorpus([makeGuideFile()], validateSchema, validCategories, validQuestionIds);
  assert.deepEqual(errors, []);
  assert.equal(valid.length, 1);
});

test("validateGuideCorpus rejects an unregistered category", () => {
  const { errors } = validateGuideCorpus(
    [makeGuideFile({ category: "not-a-real-category", categories: ["not-a-real-category"] })],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  assert.ok(errors.some((e) => e.message.includes("not registered in schemas/taxonomy.json")));
});

test("validateGuideCorpus rejects a featured_questions id that doesn't exist in the question bank", () => {
  const { errors } = validateGuideCorpus(
    [makeGuideFile({ featured_questions: ["kubernetes-fake-question-999"] })],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  assert.ok(errors.some((e) => e.message.includes('unknown question id "kubernetes-fake-question-999"')));
});

test("validateGuideCorpus accepts a featured_questions id that does exist", () => {
  const { errors } = validateGuideCorpus(
    [makeGuideFile({ featured_questions: ["kubernetes-troubleshooting-crashloopbackoff-001"] })],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  assert.deepEqual(errors, []);
});

test("validateGuideCorpus rejects related_guides self-reference", () => {
  const { errors } = validateGuideCorpus(
    [makeGuideFile({ id: "self-guide", related_guides: ["self-guide"] })],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  assert.ok(errors.some((e) => e.message.includes('references its own id "self-guide"')));
});

test("validateGuideCorpus rejects related_guides pointing at a nonexistent guide", () => {
  const { errors } = validateGuideCorpus(
    [makeGuideFile({ related_guides: ["some-guide-that-does-not-exist"] })],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  assert.ok(errors.some((e) => e.message.includes('unknown guide id "some-guide-that-does-not-exist"')));
});

test("validateGuideCorpus accepts related_guides pointing at another guide in the same batch", () => {
  const a = makeGuideFile({ id: "guide-a", related_guides: ["guide-b"] });
  const b = makeGuideFile({ id: "guide-b" });
  const { errors } = validateGuideCorpus([a, b], validateSchema, validCategories, validQuestionIds);
  assert.deepEqual(errors, []);
});

test("validateGuideCorpus rejects a duplicate guide id", () => {
  const { errors } = validateGuideCorpus(
    [makeGuideFile({ id: "dup" }), makeGuideFile({ id: "dup" })],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  assert.ok(errors.some((e) => e.message.includes('duplicate id "dup"')));
});

test("validateGuideCorpus flags every missing required section", () => {
  const { errors } = validateGuideCorpus(
    [makeGuideFile({}, new Map([["Introduction", "Only this one."]]))],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  const missing = REQUIRED_GUIDE_SECTIONS.filter((s) => s !== "Introduction");
  for (const section of missing) {
    assert.ok(errors.some((e) => e.message.includes(`missing required section "## ${section}"`)), `expected missing-section error for ${section}`);
  }
});

test("validateGuideCorpus flags an empty required section", () => {
  const sections = new Map(FULL_SECTIONS);
  sections.set("Prerequisites", "");
  const { errors } = validateGuideCorpus([makeGuideFile({}, sections)], validateSchema, validCategories, validQuestionIds);
  assert.ok(errors.some((e) => e.message.includes('section "## Prerequisites" is empty')));
});

test("validateGuideCorpus flags placeholder text", () => {
  const sections = new Map(FULL_SECTIONS);
  sections.set("Introduction", "TODO: write this section later.");
  const { errors } = validateGuideCorpus([makeGuideFile({}, sections)], validateSchema, validCategories, validQuestionIds);
  assert.ok(errors.some((e) => e.message.includes("placeholder text")));
});

test("validateGuideCorpus rejects a schema violation (description too long) and excludes it from cross-file checks", () => {
  const { errors, valid } = validateGuideCorpus(
    [makeGuideFile({ description: "x".repeat(200) })],
    validateSchema,
    validCategories,
    validQuestionIds,
  );
  assert.ok(errors.some((e) => e.message.startsWith("schema:")));
  assert.equal(valid.length, 0);
});

function questionEntry(id: string, category: string): QuestionIndexEntry {
  return {
    id,
    title: "t",
    slug: id,
    category,
    subcategory: "s",
    technologies: [],
    difficulty: "beginner",
    question_type: ["conceptual"],
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
    url: `/questions/${category}/s/${id}`,
  };
}

function guideRecord(overrides: Record<string, unknown> = {}): GuideRecord {
  const base = makeGuideFile(overrides);
  return { file: base.file, relFile: base.relFile, slug: base.slug, data: base.data as never, body: base.body, sections: base.sections };
}

test("buildGuideIndex derives question_count from the live question index, never a stored count", () => {
  const questions = [
    questionEntry("k1", "kubernetes"),
    questionEntry("k2", "kubernetes"),
    questionEntry("a1", "aws"),
  ];
  const index = buildGuideIndex([guideRecord({ categories: ["kubernetes"] })], questions);
  assert.equal(index[0]!.question_count, 2);
});

test("buildGuideIndex sums question_count across multiple categories for a domain-spanning guide", () => {
  const questions = [questionEntry("k1", "kubernetes"), questionEntry("a1", "aws"), questionEntry("t1", "terraform")];
  const index = buildGuideIndex([guideRecord({ categories: ["kubernetes", "aws"] })], questions);
  assert.equal(index[0]!.question_count, 2);
});

test("buildGuideIndex builds the correct public URL from the file's slug", () => {
  const index = buildGuideIndex([guideRecord({ id: "my-guide" })], []);
  assert.equal(index[0]!.url, "/guides/fixture");
});
