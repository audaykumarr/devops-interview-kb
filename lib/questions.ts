import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { extractHeadings } from "@/scripts/lib/content";
import type { Statistics } from "@/scripts/lib/statistics";

const ROOT = process.cwd();

export interface QuestionIndexEntry {
  id: string;
  title: string;
  slug: string;
  category: string;
  subcategory: string;
  technologies: string[];
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  question_type: string[];
  tags: string[];
  estimated_time_minutes: number;
  companies: string[];
  related_questions: string[];
  status: "draft" | "published" | "deprecated";
  last_reviewed: string;
  last_updated: string;
  technology_version: Record<string, string>;
  content_path: string;
  url: string;
}

export interface TaxonomyCategory {
  slug: string;
  name: string;
}

export interface RelatedSuggestionEntry {
  id: string;
  title: string;
  score: number;
}

export interface QuestionDetail extends QuestionIndexEntry {
  sections: Record<string, string>;
  relatedResolved: { entry: QuestionIndexEntry; suggested: boolean }[];
}

let cachedIndex: QuestionIndexEntry[] | null = null;
export function getAllQuestions(): QuestionIndexEntry[] {
  if (!cachedIndex) {
    const raw = readFileSync(join(ROOT, "generated", "questions.json"), "utf-8");
    cachedIndex = JSON.parse(raw) as QuestionIndexEntry[];
  }
  return cachedIndex;
}

let cachedStats: Statistics | null = null;
export function getStatistics(): Statistics {
  if (!cachedStats) {
    const raw = readFileSync(join(ROOT, "generated", "statistics.json"), "utf-8");
    cachedStats = JSON.parse(raw) as Statistics;
  }
  return cachedStats;
}

let cachedTaxonomy: TaxonomyCategory[] | null = null;
export function getTaxonomy(): TaxonomyCategory[] {
  if (!cachedTaxonomy) {
    const raw = readFileSync(join(ROOT, "schemas", "taxonomy.json"), "utf-8");
    const data = JSON.parse(raw) as { categories: TaxonomyCategory[] };
    cachedTaxonomy = data.categories;
  }
  return cachedTaxonomy;
}

export function getCategoryName(slug: string): string | undefined {
  return getTaxonomy().find((c) => c.slug === slug)?.name;
}

export function getQuestionsByCategory(category: string): QuestionIndexEntry[] {
  return getAllQuestions().filter((q) => q.category === category);
}

export function getQuestionsByTechnology(technology: string): QuestionIndexEntry[] {
  return getAllQuestions().filter((q) => q.technologies.includes(technology));
}

export function getQuestionsByDifficulty(difficulty: string): QuestionIndexEntry[] {
  return getAllQuestions().filter((q) => q.difficulty === difficulty);
}

export function getAllTechnologies(): { slug: string; count: number }[] {
  const stats = getStatistics();
  return Object.entries(stats.by_technology)
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
}

export function getCategoriesWithCounts(): { slug: string; name: string; count: number }[] {
  const stats = getStatistics();
  return getTaxonomy().map((c) => ({ ...c, count: stats.by_category[c.slug] ?? 0 }));
}

function findEntry(category: string, subcategory: string, slug: string): QuestionIndexEntry | undefined {
  return getAllQuestions().find((q) => q.category === category && q.subcategory === subcategory && q.slug === slug);
}

interface RelatedSuggestionsFile {
  suggestions: { id: string; suggestions: RelatedSuggestionEntry[] }[];
}

let cachedRelatedSuggestions: RelatedSuggestionsFile | null = null;
function loadRelatedSuggestions(): RelatedSuggestionsFile {
  if (!cachedRelatedSuggestions) {
    try {
      const raw = readFileSync(join(ROOT, "generated", "related-suggestions.json"), "utf-8");
      cachedRelatedSuggestions = JSON.parse(raw) as RelatedSuggestionsFile;
    } catch {
      cachedRelatedSuggestions = { suggestions: [] };
    }
  }
  return cachedRelatedSuggestions;
}

function getSuggestedRelated(id: string): RelatedSuggestionEntry[] {
  return loadRelatedSuggestions().suggestions.find((s) => s.id === id)?.suggestions ?? [];
}

/**
 * Loads a question's full detail for its page: resolves curated
 * related_questions to real entries, and — only if fewer than 3 are
 * curated — tops up with generated related-suggestions.json candidates
 * (clearly distinguished via `suggested: true` in the result).
 */
export function getQuestionDetail(category: string, subcategory: string, slug: string): QuestionDetail | undefined {
  const entry = findEntry(category, subcategory, slug);
  if (!entry) return undefined;

  // Reconstructed from the route params (not entry.content_path) so the "content"
  // segment is statically visible to Turbopack's file-tracing analysis, keeping
  // the server bundle scoped to content/ instead of the whole project.
  const raw = readFileSync(join(ROOT, "content", category, subcategory, `${slug}.md`), "utf-8");
  const { content } = matter(raw);
  const sectionsMap = extractHeadings(content);
  const sections: Record<string, string> = {};
  for (const [heading, body] of sectionsMap) sections[heading] = body;

  const byId = new Map(getAllQuestions().map((q) => [q.id, q]));
  const relatedResolved: { entry: QuestionIndexEntry; suggested: boolean }[] = [];
  const included = new Set<string>();

  for (const id of entry.related_questions) {
    const related = byId.get(id);
    if (related && !included.has(id)) {
      relatedResolved.push({ entry: related, suggested: false });
      included.add(id);
    }
  }

  if (relatedResolved.length < 3) {
    for (const suggestion of getSuggestedRelated(entry.id)) {
      if (relatedResolved.length >= 3) break;
      const related = byId.get(suggestion.id);
      if (related && !included.has(suggestion.id)) {
        relatedResolved.push({ entry: related, suggested: true });
        included.add(suggestion.id);
      }
    }
  }

  return { ...entry, sections, relatedResolved };
}
