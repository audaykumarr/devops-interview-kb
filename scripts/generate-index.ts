#!/usr/bin/env tsx
/** Builds generated/questions.json — the lean, website-facing content index. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex } from "./lib/index-builder";
import { loadValidatedCorpusOrExit } from "./lib/load-validated";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const records = loadValidatedCorpusOrExit(ROOT);
  const index = buildIndex(records);

  const outDir = join(ROOT, "generated");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "questions.json"), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`✔ Wrote generated/questions.json — ${index.length} question(s).`);
}

main();
