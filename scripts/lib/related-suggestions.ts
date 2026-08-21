import { jaccardSimilarity, tokenize } from "./similarity";
import type { QuestionRecord } from "./validate";

const MAX_SUGGESTIONS = 3;
const MIN_SUGGESTION_SCORE = 0.15;

export interface RelatedSuggestion {
  id: string;
  suggestions: { id: string; title: string; score: number }[];
}

/**
 * Suggests additional related_questions links a maintainer could add,
 * scoped to questions sharing a category/tag/technology and ranked by
 * title+tag+technology token overlap. Never written back to frontmatter
 * automatically — this is a report for a human to act on, and the website
 * also falls back to these suggestions when a question's manually-curated
 * related_questions list is short.
 */
export function suggestRelatedQuestions(records: QuestionRecord[]): RelatedSuggestion[] {
  return records.map((source) => {
    const alreadyLinked = new Set(source.data.related_questions ?? []);
    const sourceTokens = tokenize([source.data.title, ...source.data.tags, ...source.data.technologies].join(" "));

    const suggestions = records
      .filter((candidate) => candidate.data.id !== source.data.id && !alreadyLinked.has(candidate.data.id))
      .map((candidate) => {
        const tagOverlap = candidate.data.tags.some((t) => source.data.tags.includes(t));
        const techOverlap = candidate.data.technologies.some((t) => source.data.technologies.includes(t));
        const sameCategory = candidate.data.category === source.data.category;
        if (!tagOverlap && !techOverlap && !sameCategory) return null;

        const candidateTokens = tokenize(
          [candidate.data.title, ...candidate.data.tags, ...candidate.data.technologies].join(" "),
        );
        const score = Math.round(jaccardSimilarity(sourceTokens, candidateTokens) * 100) / 100;
        return { id: candidate.data.id, title: candidate.data.title, score };
      })
      .filter((x): x is { id: string; title: string; score: number } => x !== null && x.score >= MIN_SUGGESTION_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);

    return { id: source.data.id, suggestions };
  });
}
