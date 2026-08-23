#!/usr/bin/env tsx
/** Builds generated/guides.json — the lean, website-facing guide index. Runs after generate-index.ts, since question_count is derived from generated/questions.json. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGuideIndex } from "./lib/guide-index-builder";
import type { QuestionIndexEntry } from "./lib/index-builder";
import { loadValidatedGuidesOrExit } from "./lib/load-validated-guides";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const records = loadValidatedGuidesOrExit(ROOT);
  const questions = JSON.parse(
    readFileSync(join(ROOT, "generated", "questions.json"), "utf-8"),
  ) as QuestionIndexEntry[];
  const index = buildGuideIndex(records, questions);

  const outDir = join(ROOT, "generated");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "guides.json"), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`✔ Wrote generated/guides.json — ${index.length} guide(s).`);
}

main();
