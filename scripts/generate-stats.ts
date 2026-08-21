#!/usr/bin/env tsx
/** Builds generated/statistics.json — corpus-wide counts for the website's stats/browse views. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadValidatedCorpusOrExit } from "./lib/load-validated";
import { computeStatistics } from "./lib/statistics";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const records = loadValidatedCorpusOrExit(ROOT);
  const stats = computeStatistics(records);

  const outDir = join(ROOT, "generated");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "statistics.json"), `${JSON.stringify(stats, null, 2)}\n`);

  console.log(`✔ Wrote generated/statistics.json — ${stats.total_questions} question(s).`);
}

main();
