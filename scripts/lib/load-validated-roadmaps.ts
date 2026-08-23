import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { findMarkdownFiles, loadQuestionFile, type RawQuestionFile } from "./content";
import { loadValidatedCorpusOrExit } from "./load-validated";
import { loadValidatedGuidesOrExit } from "./load-validated-guides";
import { validateRoadmapCorpus, type RoadmapRecord } from "./validate-roadmaps";

export function loadRoadmapSchemaAndTaxonomy(rootDir: string): {
  validateSchema: ValidateFunction;
  validCategories: Set<string>;
} {
  const schema = JSON.parse(readFileSync(join(rootDir, "schemas", "roadmap.schema.json"), "utf-8"));
  const taxonomy: { categories: { slug: string }[] } = JSON.parse(
    readFileSync(join(rootDir, "schemas", "taxonomy.json"), "utf-8"),
  );
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  return {
    validateSchema: ajv.compile(schema),
    validCategories: new Set(taxonomy.categories.map((c) => c.slug)),
  };
}

export function loadRawRoadmaps(rootDir: string): RawQuestionFile[] {
  const roadmapsDir = join(rootDir, "content", "roadmaps");
  try {
    return findMarkdownFiles(roadmapsDir).map((file) => loadQuestionFile(file, rootDir));
  } catch {
    return [];
  }
}

/** Loads and validates the roadmap corpus (and, transitively, the question and guide corpora for cross-reference checks); prints an error and exits on any validation failure. */
export function loadValidatedRoadmapsOrExit(rootDir: string): RoadmapRecord[] {
  const { validateSchema, validCategories } = loadRoadmapSchemaAndTaxonomy(rootDir);
  const raw = loadRawRoadmaps(rootDir);
  const questionCategoryById = new Map(loadValidatedCorpusOrExit(rootDir).map((r) => [r.data.id, r.data.category]));
  const validGuideIds = new Set(loadValidatedGuidesOrExit(rootDir).map((g) => g.data.id));

  const { errors, valid } = validateRoadmapCorpus(raw, validateSchema, validCategories, questionCategoryById, validGuideIds);
  if (errors.length > 0) {
    console.error(
      `✖ Cannot generate — roadmap validation failed with ${errors.length} error(s). Run "npm run validate:roadmaps" for details.`,
    );
    process.exit(1);
  }
  return valid;
}
