import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { extractHeadings } from "@/scripts/lib/content";
import { getAllQuestions, type QuestionIndexEntry } from "./questions";

const ROOT = process.cwd();

export interface GuideIndexEntry {
  id: string;
  title: string;
  description: string;
  slug: string;
  guide_type: "interview" | "learning" | "troubleshooting" | "preparation";
  category?: string;
  categories: string[];
  technologies: string[];
  interview_levels: string[];
  estimated_reading_minutes: number;
  featured_questions: string[];
  related_guides: string[];
  related_technologies: string[];
  status: "draft" | "published" | "deprecated";
  last_reviewed: string;
  last_updated: string;
  content_path: string;
  url: string;
  question_count: number;
}

export interface GuideDetail extends GuideIndexEntry {
  sections: Record<string, string>;
  featuredQuestionsResolved: QuestionIndexEntry[];
  relatedGuidesResolved: GuideIndexEntry[];
}

let cachedGuides: GuideIndexEntry[] | null = null;
export function getAllGuides(): GuideIndexEntry[] {
  if (!cachedGuides) {
    try {
      const raw = readFileSync(join(ROOT, "generated", "guides.json"), "utf-8");
      cachedGuides = JSON.parse(raw) as GuideIndexEntry[];
    } catch {
      cachedGuides = [];
    }
  }
  return cachedGuides;
}

export function getGuideBySlug(slug: string): GuideIndexEntry | undefined {
  return getAllGuides().find((g) => g.slug === slug);
}

/** Live questions matching this guide's `categories` — the dynamic pool the Practice Questions section groups and links from. Never a stored list, so it can never go stale. */
export function getGuideQuestions(guide: GuideIndexEntry): QuestionIndexEntry[] {
  const categorySet = new Set(guide.categories);
  return getAllQuestions().filter((q) => categorySet.has(q.category));
}

export function getGuideDetail(slug: string): GuideDetail | undefined {
  const entry = getGuideBySlug(slug);
  if (!entry) return undefined;

  const raw = readFileSync(join(ROOT, "content", "guides", `${slug}.md`), "utf-8");
  const { content } = matter(raw);
  const sectionsMap = extractHeadings(content);
  const sections: Record<string, string> = {};
  for (const [heading, body] of sectionsMap) sections[heading] = body;

  const questionsById = new Map(getAllQuestions().map((q) => [q.id, q]));
  const featuredQuestionsResolved = entry.featured_questions
    .map((id) => questionsById.get(id))
    .filter((q): q is QuestionIndexEntry => q !== undefined);

  const guidesById = new Map(getAllGuides().map((g) => [g.id, g]));
  const relatedGuidesResolved = entry.related_guides
    .map((id) => guidesById.get(id))
    .filter((g): g is GuideIndexEntry => g !== undefined);

  return { ...entry, sections, featuredQuestionsResolved, relatedGuidesResolved };
}
