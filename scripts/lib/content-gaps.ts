import { extractBulletList } from "./content";
import { jaccardSimilarity, tokenize } from "./similarity";
import type { QuestionRecord } from "./validate";

export const GAP_MATCH_THRESHOLD = 0.35;

export interface FollowUpMatch {
  source_id: string;
  source_title: string;
  follow_up: string;
  best_match: { id: string; title: string; score: number } | null;
  status: "matched" | "gap";
}

function isInScope(source: QuestionRecord, candidate: QuestionRecord): boolean {
  if (candidate.data.id === source.data.id) return false;
  const sameCategory = candidate.data.category === source.data.category;
  const sharedTech = candidate.data.technologies.some((t) => source.data.technologies.includes(t));
  const sharedTag = candidate.data.tags.some((t) => source.data.tags.includes(t));
  return sameCategory || sharedTech || sharedTag;
}

/**
 * Scores each question's "Interview Follow-Up Questions" bullets against the
 * rest of the corpus (see ARCHITECTURE.md decision 8). A bullet whose text
 * closely matches an in-scope question's title/tags/technologies is a
 * candidate for an explicit related_questions link; one with no close match
 * is a genuine content gap worth writing up.
 */
export function analyzeFollowUpCoverage(records: QuestionRecord[]): FollowUpMatch[] {
  const results: FollowUpMatch[] = [];

  for (const source of records) {
    const followUpSection = source.sections.get("Interview Follow-Up Questions") ?? "";
    const bullets = extractBulletList(followUpSection);
    if (bullets.length === 0) continue;

    const candidates = records.filter((candidate) => isInScope(source, candidate));
    const candidateTokens = candidates.map((c) => ({
      id: c.data.id,
      title: c.data.title,
      tokens: tokenize([c.data.title, ...c.data.tags, ...c.data.technologies].join(" ")),
    }));

    for (const bullet of bullets) {
      const bulletTokens = tokenize(bullet);
      let best: { id: string; title: string; score: number } | null = null;

      for (const candidate of candidateTokens) {
        const score = Math.round(jaccardSimilarity(bulletTokens, candidate.tokens) * 100) / 100;
        if (score >= GAP_MATCH_THRESHOLD && (best === null || score > best.score)) {
          best = { id: candidate.id, title: candidate.title, score };
        }
      }

      results.push({
        source_id: source.data.id,
        source_title: source.data.title,
        follow_up: bullet,
        best_match: best,
        status: best ? "matched" : "gap",
      });
    }
  }

  return results;
}
