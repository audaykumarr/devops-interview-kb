import type { QuestionRecord } from "./validate";
import { jaccardSimilarity, tokenize } from "./similarity";

export interface DuplicateWarning {
  a: string;
  b: string;
  score: number;
}

const DUPLICATE_TITLE_THRESHOLD = 0.6;

/**
 * Flags pairs of questions in the same category whose titles are near-identical
 * (token-overlap above threshold) as likely duplicates worth human review.
 * Non-fatal by design: title similarity alone can false-positive on two
 * legitimately distinct questions about the same narrow topic.
 */
export function detectNearDuplicateTitles(records: QuestionRecord[]): DuplicateWarning[] {
  const warnings: DuplicateWarning[] = [];
  const tokenized = records.map((r) => ({
    id: r.data.id,
    category: r.data.category,
    tokens: tokenize(r.data.title),
  }));

  for (let i = 0; i < tokenized.length; i++) {
    for (let j = i + 1; j < tokenized.length; j++) {
      const x = tokenized[i]!;
      const y = tokenized[j]!;
      if (x.category !== y.category) continue;
      const score = Math.round(jaccardSimilarity(x.tokens, y.tokens) * 100) / 100;
      if (score >= DUPLICATE_TITLE_THRESHOLD) {
        warnings.push({ a: x.id, b: y.id, score });
      }
    }
  }

  return warnings;
}
