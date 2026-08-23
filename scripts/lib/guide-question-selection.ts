import type { QuestionIndexEntry } from "./index-builder";

/**
 * Types preferred, in order, when picking representative questions for a
 * subcategory preview — troubleshooting/scenario/practical first, since
 * those are what a "what does this area actually involve" preview should
 * lead with, ahead of purely conceptual/comparison questions.
 */
const TYPE_PRIORITY = [
  "troubleshooting",
  "scenario",
  "practical",
  "architecture",
  "security",
  "comparison",
  "configuration",
  "coding",
  "command-line",
  "hands-on",
  "system-design",
  "behavioral",
  "conceptual",
];

/**
 * Deterministically picks up to `limit` representative questions from an
 * already-stable-ordered list (getAllQuestions() sorts by id). Order of
 * preference: featured/curated questions first, then one question per
 * not-yet-covered type in TYPE_PRIORITY order (for type diversity), then
 * whatever's left in the original stable order. Never random, never
 * alphabetical-by-title — the same input always produces the same output.
 */
export function pickRepresentativeQuestions(
  questions: QuestionIndexEntry[],
  featuredIds: ReadonlySet<string>,
  limit = 3,
): QuestionIndexEntry[] {
  const featured = questions.filter((q) => featuredIds.has(q.id));
  const rest = questions.filter((q) => !featuredIds.has(q.id));

  const picked: QuestionIndexEntry[] = [...featured].slice(0, limit);
  const usedIds = new Set(picked.map((q) => q.id));
  const coveredTypes = new Set(picked.flatMap((q) => q.question_type));

  for (const type of TYPE_PRIORITY) {
    if (picked.length >= limit) break;
    if (coveredTypes.has(type)) continue;
    const match = rest.find((q) => !usedIds.has(q.id) && q.question_type.includes(type));
    if (match) {
      picked.push(match);
      usedIds.add(match.id);
      for (const t of match.question_type) coveredTypes.add(t);
    }
  }

  for (const q of rest) {
    if (picked.length >= limit) break;
    if (usedIds.has(q.id)) continue;
    picked.push(q);
    usedIds.add(q.id);
  }

  return picked.slice(0, limit);
}
