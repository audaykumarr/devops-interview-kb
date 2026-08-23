import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { extractBulletList, extractHeadings, extractPreamble } from "@/scripts/lib/content";
import { pickRepresentativeQuestions } from "@/scripts/lib/guide-question-selection";
import type { QuestionIndexEntry } from "@/scripts/lib/index-builder";
import { getAllGuides, type GuideIndexEntry } from "./guides";
import { getAllQuestions } from "./questions";

const ROOT = process.cwd();
const REPRESENTATIVE_LIMIT = 5;

export interface RoadmapStageIndexEntry {
  id: string;
  title: string;
  categories: string[];
  technologies: string[];
  prerequisites: string[];
  related_guides: string[];
  recommended_questions: string[];
  question_count: number;
}

export interface RoadmapIndexEntry {
  id: string;
  title: string;
  description: string;
  slug: string;
  target_role: string;
  estimated_duration_weeks?: number;
  status: "draft" | "published" | "deprecated";
  last_reviewed: string;
  last_updated: string;
  content_path: string;
  url: string;
  stages: RoadmapStageIndexEntry[];
  question_count: number;
}

export interface RoadmapStageDetail extends RoadmapStageIndexEntry {
  description: string;
  whyItMatters: string;
  learningObjectives: string[];
  completionCriteria: string[];
  checkpointQuestionsResolved: QuestionIndexEntry[];
  representativeQuestionsResolved: QuestionIndexEntry[];
  relatedGuidesResolved: GuideIndexEntry[];
}

export interface RoadmapDetail extends RoadmapIndexEntry {
  sections: Record<string, string>;
  stagesResolved: RoadmapStageDetail[];
}

let cachedRoadmaps: RoadmapIndexEntry[] | null = null;
export function getAllRoadmaps(): RoadmapIndexEntry[] {
  if (!cachedRoadmaps) {
    try {
      const raw = readFileSync(join(ROOT, "generated", "roadmaps.json"), "utf-8");
      cachedRoadmaps = JSON.parse(raw) as RoadmapIndexEntry[];
    } catch {
      cachedRoadmaps = [];
    }
  }
  return cachedRoadmaps;
}

export function getRoadmapBySlug(slug: string): RoadmapIndexEntry | undefined {
  return getAllRoadmaps().find((r) => r.slug === slug);
}

/** Live questions matching this stage's `categories` — never a stored list, so it can never go stale. */
export function getStageQuestions(stage: RoadmapStageIndexEntry): QuestionIndexEntry[] {
  const categorySet = new Set(stage.categories);
  return getAllQuestions().filter((q) => categorySet.has(q.category));
}

export function getRoadmapDetail(slug: string): RoadmapDetail | undefined {
  const entry = getRoadmapBySlug(slug);
  if (!entry) return undefined;

  const raw = readFileSync(join(ROOT, "content", "roadmaps", `${slug}.md`), "utf-8");
  const { content } = matter(raw);
  const topSections = extractHeadings(content);

  const sections: Record<string, string> = {};
  for (const [heading, body] of topSections) {
    if (!heading.startsWith("Stage: ")) sections[heading] = body;
  }

  const questionsById: Map<string, QuestionIndexEntry> = new Map(getAllQuestions().map((q) => [q.id, q]));
  const guidesById = new Map(getAllGuides().map((g) => [g.id, g]));

  const stagesResolved: RoadmapStageDetail[] = entry.stages.map((stage) => {
    const stageBody = topSections.get(`Stage: ${stage.title}`) ?? "";
    const subsections = extractHeadings(stageBody, 3);

    const checkpointIds = new Set(stage.recommended_questions);
    const checkpointQuestionsResolved = stage.recommended_questions
      .map((id) => questionsById.get(id))
      .filter((q): q is QuestionIndexEntry => q !== undefined);

    const nonCheckpointStageQuestions = getStageQuestions(stage).filter((q) => !checkpointIds.has(q.id));
    const representativeQuestionsResolved = pickRepresentativeQuestions(
      nonCheckpointStageQuestions,
      new Set(),
      REPRESENTATIVE_LIMIT,
    );

    const relatedGuidesResolved = stage.related_guides
      .map((id) => guidesById.get(id))
      .filter((g): g is GuideIndexEntry => g !== undefined);

    return {
      ...stage,
      description: extractPreamble(stageBody),
      whyItMatters: subsections.get("Why It Matters") ?? "",
      learningObjectives: extractBulletList(subsections.get("Learning Objectives") ?? ""),
      completionCriteria: extractBulletList(subsections.get("Completion Criteria") ?? ""),
      checkpointQuestionsResolved,
      representativeQuestionsResolved,
      relatedGuidesResolved,
    };
  });

  return { ...entry, sections, stagesResolved };
}
