import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { RawQuestionFile } from "../lib/content";
import { buildRoadmapIndex } from "../lib/roadmap-index-builder";
import { REQUIRED_ROADMAP_SECTIONS, REQUIRED_STAGE_SUBSECTIONS, validateRoadmapCorpus } from "../lib/validate-roadmaps";
import type { RoadmapRecord } from "../lib/validate-roadmaps";
import type { QuestionIndexEntry } from "../lib/index-builder";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const schema = JSON.parse(readFileSync(join(ROOT, "schemas", "roadmap.schema.json"), "utf-8"));
const taxonomy: { categories: { slug: string }[] } = JSON.parse(
  readFileSync(join(ROOT, "schemas", "taxonomy.json"), "utf-8"),
);
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema: ValidateFunction = ajv.compile(schema);
const validCategories = new Set(taxonomy.categories.map((c) => c.slug));
const questionCategoryById = new Map([
  ["kubernetes-troubleshooting-crashloopbackoff-001", "kubernetes"],
  ["kubernetes-networking-service-routing-001", "kubernetes"],
  ["aws-iam-least-privilege-001", "aws"],
]);
const validGuideIds = new Set(["kubernetes-interview-guide"]);

function stageSectionMap(stageTitles: string[]): Map<string, string> {
  const sections = new Map<string, string>();
  for (const heading of REQUIRED_ROADMAP_SECTIONS) sections.set(heading, `${heading} body.`);
  const stageSubBody = REQUIRED_STAGE_SUBSECTIONS.map((s) => `### ${s}\n\n${s} body.`).join("\n\n");
  for (const title of stageTitles) {
    sections.set(`Stage: ${title}`, `Description.\n\n${stageSubBody}`);
  }
  return sections;
}

function makeRoadmapFile(overrides: Record<string, unknown> = {}, sections?: Map<string, string>): RawQuestionFile {
  const stages = (overrides.stages as { title: string }[] | undefined) ?? [{ id: "foundations", title: "Foundations", categories: ["kubernetes"] }];
  return {
    file: "content/roadmaps/fixture.md",
    relFile: "content/roadmaps/fixture.md",
    slug: "fixture",
    body: "",
    sections: sections ?? stageSectionMap(stages.map((s) => s.title)),
    data: {
      id: "fixture-roadmap",
      title: "A sufficiently long fixture roadmap title",
      description: "A sufficiently long fixture roadmap description for schema validation purposes here.",
      target_role: "devops-engineer",
      stages: [{ id: "foundations", title: "Foundations", categories: ["kubernetes"] }],
      status: "published",
      last_reviewed: "2026-08-23",
      last_updated: "2026-08-23",
      ...overrides,
    },
  };
}

test("validateRoadmapCorpus accepts a well-formed roadmap with all required sections", () => {
  const { errors, valid } = validateRoadmapCorpus([makeRoadmapFile()], validateSchema, validCategories, questionCategoryById, validGuideIds);
  assert.deepEqual(errors, []);
  assert.equal(valid.length, 1);
});

test("validateRoadmapCorpus rejects an invalid target_role", () => {
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ target_role: "not-a-real-role" })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.startsWith("schema:")));
});

test("validateRoadmapCorpus rejects an unregistered stage category", () => {
  const stages = [{ id: "foundations", title: "Foundations", categories: ["not-a-real-category"] }];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes('category "not-a-real-category" is not registered')));
});

test("validateRoadmapCorpus rejects a duplicate stage id within the same roadmap", () => {
  const stages = [
    { id: "foundations", title: "Foundations", categories: ["kubernetes"] },
    { id: "foundations", title: "Foundations Again", categories: ["aws"] },
  ];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages }, stageSectionMap(["Foundations", "Foundations Again"]))],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes('duplicate stage id "foundations"')));
});

test("validateRoadmapCorpus rejects a prerequisites reference to an unknown stage id", () => {
  const stages = [{ id: "foundations", title: "Foundations", categories: ["kubernetes"], prerequisites: ["does-not-exist"] }];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes('prerequisites references unknown stage id "does-not-exist"')));
});

test("validateRoadmapCorpus detects a circular prerequisites chain", () => {
  const stages = [
    { id: "a", title: "A", categories: ["kubernetes"], prerequisites: ["b"] },
    { id: "b", title: "B", categories: ["aws"], prerequisites: ["a"] },
  ];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages }, stageSectionMap(["A", "B"]))],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes("circular prerequisites")));
});

test("validateRoadmapCorpus accepts a valid (acyclic) prerequisites chain", () => {
  const stages = [
    { id: "a", title: "A", categories: ["kubernetes"] },
    { id: "b", title: "B", categories: ["aws"], prerequisites: ["a"] },
  ];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages }, stageSectionMap(["A", "B"]))],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.deepEqual(errors, []);
});

test("validateRoadmapCorpus rejects a recommended_questions id that doesn't exist", () => {
  const stages = [{ id: "foundations", title: "Foundations", categories: ["kubernetes"], recommended_questions: ["kubernetes-fake-999"] }];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes('unknown question id "kubernetes-fake-999"')));
});

test("validateRoadmapCorpus rejects a recommended_questions id whose category is outside the stage's own categories", () => {
  const stages = [{ id: "foundations", title: "Foundations", categories: ["kubernetes"], recommended_questions: ["aws-iam-least-privilege-001"] }];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes("belongs to category \"aws\", which is outside this stage's categories")));
});

test("validateRoadmapCorpus accepts a recommended_questions id that belongs to the stage's own category", () => {
  const stages = [{ id: "foundations", title: "Foundations", categories: ["kubernetes"], recommended_questions: ["kubernetes-troubleshooting-crashloopbackoff-001"] }];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.deepEqual(errors, []);
});

test("validateRoadmapCorpus rejects a related_guides id that doesn't exist", () => {
  const stages = [{ id: "foundations", title: "Foundations", categories: ["kubernetes"], related_guides: ["not-a-real-guide"] }];
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ stages })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes('unknown guide id "not-a-real-guide"')));
});

test("validateRoadmapCorpus flags a missing stage section", () => {
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({}, new Map(REQUIRED_ROADMAP_SECTIONS.map((h) => [h, `${h} body.`])))],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes('missing required section "## Stage: Foundations"')));
});

test("validateRoadmapCorpus flags a stage missing a required sub-section", () => {
  const sections = stageSectionMap(["Foundations"]);
  sections.set("Stage: Foundations", "Description only, no sub-sections.");
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({}, sections)],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  for (const sub of REQUIRED_STAGE_SUBSECTIONS) {
    assert.ok(errors.some((e) => e.message.includes(`missing required sub-section "### ${sub}"`)), `expected missing sub-section error for ${sub}`);
  }
});

test("validateRoadmapCorpus flags placeholder text", () => {
  const sections = stageSectionMap(["Foundations"]);
  sections.set("Introduction", "TODO: write this section later.");
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({}, sections)],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes("placeholder text")));
});

test("validateRoadmapCorpus rejects a duplicate roadmap id", () => {
  const { errors } = validateRoadmapCorpus(
    [makeRoadmapFile({ id: "dup" }), makeRoadmapFile({ id: "dup" })],
    validateSchema,
    validCategories,
    questionCategoryById,
    validGuideIds,
  );
  assert.ok(errors.some((e) => e.message.includes('duplicate id "dup"')));
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

function roadmapRecord(overrides: Record<string, unknown> = {}, sections?: Map<string, string>): RoadmapRecord {
  const base = makeRoadmapFile(overrides, sections);
  return { file: base.file, relFile: base.relFile, slug: base.slug, data: base.data as never, body: base.body, sections: base.sections };
}

test("buildRoadmapIndex derives each stage's question_count from the live question index, never a stored count", () => {
  const questions = [questionEntry("k1", "kubernetes"), questionEntry("k2", "kubernetes"), questionEntry("a1", "aws")];
  const stages = [{ id: "foundations", title: "Foundations", categories: ["kubernetes"] }];
  const index = buildRoadmapIndex([roadmapRecord({ stages })], questions);
  assert.equal(index[0]!.stages[0]!.question_count, 2);
});

test("buildRoadmapIndex sums question_count across all stages' categories for the roadmap total", () => {
  const questions = [questionEntry("k1", "kubernetes"), questionEntry("a1", "aws"), questionEntry("t1", "terraform")];
  const stages = [
    { id: "a", title: "A", categories: ["kubernetes"] },
    { id: "b", title: "B", categories: ["aws"] },
  ];
  const index = buildRoadmapIndex([roadmapRecord({ stages }, stageSectionMap(["A", "B"]))], questions);
  assert.equal(index[0]!.question_count, 2);
});

test("buildRoadmapIndex builds the correct public URL from the file's slug", () => {
  const index = buildRoadmapIndex([roadmapRecord({ id: "my-roadmap" })], []);
  assert.equal(index[0]!.url, "/roadmaps/fixture");
});
