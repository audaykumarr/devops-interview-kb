#!/usr/bin/env tsx
/**
 * Builds the related-question engine's output (see ARCHITECTURE.md decision 8):
 *  - generated/related-suggestions.json — candidate related_questions links for
 *    a human to review and add to frontmatter.
 *  - generated/content-gaps.json — Interview Follow-Up Questions bullets that
 *    don't closely match any existing question, i.e. real content gaps.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeFollowUpCoverage, GAP_MATCH_THRESHOLD } from "./lib/content-gaps";
import { loadValidatedCorpusOrExit } from "./lib/load-validated";
import { suggestRelatedQuestions } from "./lib/related-suggestions";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function main(): void {
  const records = loadValidatedCorpusOrExit(ROOT);
  const outDir = join(ROOT, "generated");
  mkdirSync(outDir, { recursive: true });

  const suggestions = suggestRelatedQuestions(records).filter((s) => s.suggestions.length > 0);
  writeFileSync(
    join(outDir, "related-suggestions.json"),
    `${JSON.stringify({ generated_at: new Date().toISOString(), suggestions }, null, 2)}\n`,
  );

  const followUps = analyzeFollowUpCoverage(records);
  const gaps = followUps.filter((f) => f.status === "gap");
  writeFileSync(
    join(outDir, "content-gaps.json"),
    `${JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        match_threshold: GAP_MATCH_THRESHOLD,
        summary: { total_follow_ups: followUps.length, matched: followUps.length - gaps.length, gaps: gaps.length },
        follow_ups: followUps,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `✔ Wrote generated/related-suggestions.json (${suggestions.length} question(s) with suggestions) ` +
      `and generated/content-gaps.json (${gaps.length}/${followUps.length} follow-ups are content gaps).`,
  );
}

main();
