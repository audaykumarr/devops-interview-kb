import type { RoadmapRecord } from "./validate-roadmaps";
import type { QuestionIndexEntry } from "./index-builder";

export interface RoadmapStageIndexEntry {
  id: string;
  title: string;
  categories: string[];
  technologies: string[];
  prerequisites: string[];
  related_guides: string[];
  recommended_questions: string[];
  /** Count of live questions matching this stage's `categories` — computed at generation time, never hand-maintained. */
  question_count: number;
}

export interface RoadmapIndexEntry {
  id: string;
  title: string;
  description: string;
  slug: string;
  target_role: string;
  estimated_duration_weeks?: number;
  status: string;
  last_reviewed: string;
  last_updated: string;
  content_path: string;
  url: string;
  stages: RoadmapStageIndexEntry[];
  /** Union of every stage's question pool, deduplicated by category — the roadmap's total scope. */
  question_count: number;
}

/** Builds the lean, website-facing roadmap index. Every count is derived from the live question index so none can drift out of sync. */
export function buildRoadmapIndex(records: RoadmapRecord[], questions: QuestionIndexEntry[]): RoadmapIndexEntry[] {
  return records
    .map((r) => {
      const stages: RoadmapStageIndexEntry[] = r.data.stages.map((stage) => {
        const categorySet = new Set(stage.categories);
        return {
          id: stage.id,
          title: stage.title,
          categories: stage.categories,
          technologies: stage.technologies ?? [],
          prerequisites: stage.prerequisites ?? [],
          related_guides: stage.related_guides ?? [],
          recommended_questions: stage.recommended_questions ?? [],
          question_count: questions.filter((q) => categorySet.has(q.category)).length,
        };
      });

      const allCategories = new Set(r.data.stages.flatMap((s) => s.categories));

      return {
        id: r.data.id,
        title: r.data.title,
        description: r.data.description,
        slug: r.slug,
        target_role: r.data.target_role,
        estimated_duration_weeks: r.data.estimated_duration_weeks,
        status: r.data.status,
        last_reviewed: r.data.last_reviewed,
        last_updated: r.data.last_updated,
        content_path: r.relFile,
        url: `/roadmaps/${r.slug}`,
        stages,
        question_count: questions.filter((q) => allCategories.has(q.category)).length,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
