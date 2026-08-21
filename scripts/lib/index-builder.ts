import type { QuestionRecord } from "./validate";

export interface QuestionIndexEntry {
  id: string;
  title: string;
  slug: string;
  category: string;
  subcategory: string;
  technologies: string[];
  difficulty: string;
  question_type: string[];
  tags: string[];
  estimated_time_minutes: number;
  companies: string[];
  related_questions: string[];
  status: string;
  last_reviewed: string;
  last_updated: string;
  technology_version: Record<string, string>;
  content_path: string;
  url: string;
}

/** Builds the lean, website-facing index — no body content, just what's needed for search/filter/routing. */
export function buildIndex(records: QuestionRecord[]): QuestionIndexEntry[] {
  return records
    .map((r) => ({
      id: r.data.id,
      title: r.data.title,
      slug: r.slug,
      category: r.data.category,
      subcategory: r.data.subcategory,
      technologies: r.data.technologies,
      difficulty: r.data.difficulty,
      question_type: r.data.question_type,
      tags: r.data.tags,
      estimated_time_minutes: r.data.estimated_time_minutes,
      companies: r.data.companies ?? [],
      related_questions: r.data.related_questions ?? [],
      status: r.data.status,
      last_reviewed: r.data.last_reviewed,
      last_updated: r.data.last_updated,
      technology_version: r.data.technology_version ?? {},
      content_path: r.relFile,
      url: `/questions/${r.data.category}/${r.data.subcategory}/${r.slug}`,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
