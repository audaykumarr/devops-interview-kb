#!/usr/bin/env tsx
/** Builds generated/roadmaps.json — the lean, website-facing roadmap index. Runs after generate-index.ts, since every stage's question_count is derived from generated/questions.json. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { QuestionIndexEntry } from "./lib/index-builder";
import { loadValidatedRoadmapsOrExit } from "./lib/load-validated-roadmaps";
import { buildRoadmapIndex } from "./lib/roadmap-index-builder";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const records = loadValidatedRoadmapsOrExit(ROOT);
  const questions = JSON.parse(
    readFileSync(join(ROOT, "generated", "questions.json"), "utf-8"),
  ) as QuestionIndexEntry[];
  const index = buildRoadmapIndex(records, questions);

  const outDir = join(ROOT, "generated");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "roadmaps.json"), `${JSON.stringify(index, null, 2)}\n`);

  console.log(`✔ Wrote generated/roadmaps.json — ${index.length} roadmap(s).`);
}

main();
