#!/usr/bin/env tsx
/**
 * Guide validation CLI. Fails (exit 1) on schema violations, unregistered
 * categories, dangling featured_questions/related_guides references,
 * missing or empty required sections, and placeholder content.
 */
import { fileURLToPath } from "node:url";
import { loadValidatedCorpusOrExit } from "./lib/load-validated";
import { loadGuideSchemaAndTaxonomy, loadRawGuides } from "./lib/load-validated-guides";
import { validateGuideCorpus } from "./lib/validate-guides";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const files = loadRawGuides(ROOT);
  if (files.length === 0) {
    console.log("✔ Guide validation passed — no guide files found yet.");
    return;
  }

  const { validateSchema, validCategories } = loadGuideSchemaAndTaxonomy(ROOT);
  const validQuestionIds = new Set(loadValidatedCorpusOrExit(ROOT).map((r) => r.data.id));

  const { errors } = validateGuideCorpus(files, validateSchema, validCategories, validQuestionIds);

  if (errors.length > 0) {
    console.error(`\n✖ Guide validation failed with ${errors.length} error(s):\n`);
    for (const err of errors) {
      console.error(`  ${err.file}\n    ${err.message}`);
    }
    console.error(`\n${files.length} guide file(s) checked, ${errors.length} error(s).\n`);
    process.exit(1);
  }

  console.log(`✔ Guide validation passed — ${files.length} guide file(s) checked, 0 errors.`);
}

main();
