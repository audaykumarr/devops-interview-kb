#!/usr/bin/env tsx
/**
 * Roadmap validation CLI. Fails (exit 1) on schema violations, unregistered
 * categories, dangling recommended_questions/related_guides/prerequisites
 * references, circular prerequisites, missing or empty required sections
 * (roadmap-level and per-stage), and placeholder content.
 */
import { fileURLToPath } from "node:url";
import { loadValidatedCorpusOrExit } from "./lib/load-validated";
import { loadValidatedGuidesOrExit } from "./lib/load-validated-guides";
import { loadRawRoadmaps, loadRoadmapSchemaAndTaxonomy } from "./lib/load-validated-roadmaps";
import { validateRoadmapCorpus } from "./lib/validate-roadmaps";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const files = loadRawRoadmaps(ROOT);
  if (files.length === 0) {
    console.log("✔ Roadmap validation passed — no roadmap files found yet.");
    return;
  }

  const { validateSchema, validCategories } = loadRoadmapSchemaAndTaxonomy(ROOT);
  const questionCategoryById = new Map(loadValidatedCorpusOrExit(ROOT).map((r) => [r.data.id, r.data.category]));
  const validGuideIds = new Set(loadValidatedGuidesOrExit(ROOT).map((g) => g.data.id));

  const { errors } = validateRoadmapCorpus(files, validateSchema, validCategories, questionCategoryById, validGuideIds);

  if (errors.length > 0) {
    console.error(`\n✖ Roadmap validation failed with ${errors.length} error(s):\n`);
    for (const err of errors) {
      console.error(`  ${err.file}\n    ${err.message}`);
    }
    console.error(`\n${files.length} roadmap file(s) checked, ${errors.length} error(s).\n`);
    process.exit(1);
  }

  console.log(`✔ Roadmap validation passed — ${files.length} roadmap file(s) checked, 0 errors.`);
}

main();
