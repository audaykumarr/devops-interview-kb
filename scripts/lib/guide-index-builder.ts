import type { GuideRecord } from "./validate-guides";
import type { QuestionIndexEntry } from "./index-builder";

export interface GuideIndexEntry {
  id: string;
  title: string;
  description: string;
  slug: string;
  guide_type: string;
  category?: string;
  categories: string[];
  technologies: string[];
  interview_levels: string[];
  estimated_reading_minutes: number;
  featured_questions: string[];
  related_guides: string[];
  related_technologies: string[];
  status: string;
  last_reviewed: string;
  last_updated: string;
  content_path: string;
  url: string;
  /** Count of live questions matching this guide's `categories` — computed at generation time, never hand-maintained. */
  question_count: number;
}

/** Builds the lean, website-facing guide index. question_count is derived from the live question index so it can never drift out of sync. */
export function buildGuideIndex(records: GuideRecord[], questions: QuestionIndexEntry[]): GuideIndexEntry[] {
  return records
    .map((r) => {
      const categorySet = new Set(r.data.categories);
      const questionCount = questions.filter((q) => categorySet.has(q.category)).length;
      return {
        id: r.data.id,
        title: r.data.title,
        description: r.data.description,
        slug: r.slug,
        guide_type: r.data.guide_type,
        category: r.data.category,
        categories: r.data.categories,
        technologies: r.data.technologies ?? [],
        interview_levels: r.data.interview_levels,
        estimated_reading_minutes: r.data.estimated_reading_minutes,
        featured_questions: r.data.featured_questions ?? [],
        related_guides: r.data.related_guides ?? [],
        related_technologies: r.data.related_technologies ?? [],
        status: r.data.status,
        last_reviewed: r.data.last_reviewed,
        last_updated: r.data.last_updated,
        content_path: r.relFile,
        url: `/guides/${r.slug}`,
        question_count: questionCount,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
