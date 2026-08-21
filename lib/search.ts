export interface SearchableQuestion {
  id: string;
  title: string;
  slug: string;
  category: string;
  subcategory: string;
  technologies: string[];
  difficulty: string;
  question_type: string[];
  tags: string[];
  url: string;
}

export interface SearchFilters {
  difficulty?: string;
  technology?: string;
  question_type?: string;
  category?: string;
}

export function applyFilters<T extends SearchableQuestion>(questions: T[], filters: SearchFilters): T[] {
  let results = questions;
  if (filters.difficulty) results = results.filter((q) => q.difficulty === filters.difficulty);
  if (filters.category) results = results.filter((q) => q.category === filters.category);
  if (filters.technology) results = results.filter((q) => q.technologies.includes(filters.technology!));
  if (filters.question_type) results = results.filter((q) => q.question_type.includes(filters.question_type!));
  return results;
}

/**
 * Client-safe substring/token search across title, category, subcategory,
 * tags, and technologies. No external index needed at this corpus size —
 * scores and re-sorts an already filter-narrowed array.
 */
export function searchQuestions<T extends SearchableQuestion>(questions: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return questions;

  const queryWords = q.split(/\s+/).filter((w) => w.length > 1);

  const scored = questions
    .map((item) => {
      const title = item.title.toLowerCase();
      const haystack = [item.title, item.category, item.subcategory, ...item.tags, ...item.technologies]
        .join(" ")
        .toLowerCase();

      let score = 0;
      if (title.includes(q)) score += 5;
      if (haystack.includes(q)) score += 2;
      for (const word of queryWords) {
        if (haystack.includes(word)) score += 1;
      }
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((r) => r.item);
}
