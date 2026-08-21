#!/usr/bin/env tsx
/**
 * Content validation CLI. Fails (exit 1) on schema violations, unregistered
 * categories, duplicate/dangling IDs, missing or empty required sections, and
 * placeholder content. Prints (non-fatal) near-duplicate-title warnings.
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findMarkdownFiles, loadQuestionFile } from "./lib/content";
import { detectNearDuplicateTitles } from "./lib/duplicates";
import { loadSchemaAndTaxonomy } from "./lib/load-validated";
import { validateCorpus } from "./lib/validate";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const contentDir = join(ROOT, "content");
  const { validateSchema, validCategories } = loadSchemaAndTaxonomy(ROOT);

  const files = findMarkdownFiles(contentDir).map((file) => loadQuestionFile(file, ROOT));
  if (files.length === 0) {
    console.error(`No content files found under ${contentDir}`);
    process.exit(1);
  }

  const { errors, valid } = validateCorpus(files, validateSchema, validCategories);

  if (errors.length > 0) {
    console.error(`\n✖ Content validation failed with ${errors.length} error(s):\n`);
    for (const err of errors) {
      console.error(`  ${err.file}\n    ${err.message}`);
    }
    console.error(`\n${files.length} file(s) checked, ${errors.length} error(s).\n`);
    process.exit(1);
  }

  const duplicates = detectNearDuplicateTitles(valid);
  if (duplicates.length > 0) {
    console.warn(
      `\n⚠ ${duplicates.length} possible near-duplicate question(s) (same category, similar titles) — review, not blocking:\n`,
    );
    for (const dup of duplicates) {
      console.warn(`  ${dup.a}  <->  ${dup.b}  (similarity ${dup.score})`);
    }
    console.warn("");
  }

  const suffix = duplicates.length > 0 ? `, ${duplicates.length} duplicate warning(s)` : "";
  console.log(`✔ Content validation passed — ${files.length} file(s) checked, 0 errors${suffix}.`);
}

main();
