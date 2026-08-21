import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { findMarkdownFiles, loadQuestionFile, type RawQuestionFile } from "./content";
import { validateCorpus, type QuestionRecord } from "./validate";

export function loadSchemaAndTaxonomy(rootDir: string): {
  validateSchema: ValidateFunction;
  validCategories: Set<string>;
} {
  const schema = JSON.parse(readFileSync(join(rootDir, "schemas", "question.schema.json"), "utf-8"));
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

export function loadRawCorpus(rootDir: string): RawQuestionFile[] {
  const contentDir = join(rootDir, "content");
  return findMarkdownFiles(contentDir).map((file) => loadQuestionFile(file, rootDir));
}

/** Loads and validates the corpus; prints an error and exits the process on any validation failure. */
export function loadValidatedCorpusOrExit(rootDir: string): QuestionRecord[] {
  const { validateSchema, validCategories } = loadSchemaAndTaxonomy(rootDir);
  const raw = loadRawCorpus(rootDir);
  const { errors, valid } = validateCorpus(raw, validateSchema, validCategories);
  if (errors.length > 0) {
    console.error(
      `✖ Cannot generate — content validation failed with ${errors.length} error(s). Run "npm run validate" for details.`,
    );
    process.exit(1);
  }
  return valid;
}
