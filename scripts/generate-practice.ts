#!/usr/bin/env tsx
/** Builds generated/practice.json — the lean flashcard dataset for practice mode. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPracticeSet } from "./lib/practice-builder";
import { loadValidatedCorpusOrExit } from "./lib/load-validated";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const records = loadValidatedCorpusOrExit(ROOT);
  const practice = buildPracticeSet(records);

  const outDir = join(ROOT, "generated");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "practice.json"), `${JSON.stringify(practice, null, 2)}\n`);

  console.log(`✔ Wrote generated/practice.json — ${practice.length} card(s).`);
}

main();
