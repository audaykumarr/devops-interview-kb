import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { findMarkdownFiles, loadQuestionFile, type RawQuestionFile } from "./content";
import { loadValidatedCorpusOrExit } from "./load-validated";
import { validateGuideCorpus, type GuideRecord } from "./validate-guides";

export function loadGuideSchemaAndTaxonomy(rootDir: string): {
  validateSchema: ValidateFunction;
  validCategories: Set<string>;
} {
  const schema = JSON.parse(readFileSync(join(rootDir, "schemas", "guide.schema.json"), "utf-8"));
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

export function loadRawGuides(rootDir: string): RawQuestionFile[] {
  const guidesDir = join(rootDir, "content", "guides");
  let files: string[];
  try {
    files = findMarkdownFiles(guidesDir);
  } catch (err) {
    // A missing content/guides directory is a legitimate "no guides yet" state.
    // Any other error (permissions, etc.) is a real problem and must not be swallowed.
    if (err instanceof Error && "code" in err && err.code === "ENOENT") return [];
    throw err;
  }
  // Outside the try/catch above: a malformed guide file's YAML/frontmatter error
  // must propagate and fail loudly, not be silently reported as "no guides found".
  return files.map((file) => loadQuestionFile(file, rootDir));
}

/** Loads and validates the guide corpus (and, transitively, the question corpus for featured_questions checks); prints an error and exits on any validation failure. */
export function loadValidatedGuidesOrExit(rootDir: string): GuideRecord[] {
  const { validateSchema, validCategories } = loadGuideSchemaAndTaxonomy(rootDir);
  const raw = loadRawGuides(rootDir);
  const validQuestionIds = new Set(loadValidatedCorpusOrExit(rootDir).map((r) => r.data.id));
  const { errors, valid } = validateGuideCorpus(raw, validateSchema, validCategories, validQuestionIds);
  if (errors.length > 0) {
    console.error(
      `✖ Cannot generate — guide validation failed with ${errors.length} error(s). Run "npm run validate:guides" for details.`,
    );
    process.exit(1);
  }
  return valid;
}
