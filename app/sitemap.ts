import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllQuestions, getAllTechnologies, getCategoriesWithCounts } from "@/lib/questions";
import { getAllGuides } from "@/lib/guides";
import { getAllRoadmaps } from "@/lib/roadmaps";
import { INDEXABLE_QUESTION_TYPES } from "@/lib/question-types";
import { INTERVIEW_LEVELS } from "@/scripts/lib/interview-level";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

export default function sitemap(): MetadataRoute.Sitemap {
  const questions = getAllQuestions();
  const categories = getCategoriesWithCounts().filter((c) => c.count > 0);
  const technologies = getAllTechnologies();
  const now = new Date();

  const guides = getAllGuides().filter((g) => g.status === "published" && g.question_count > 0);
  const roadmaps = getAllRoadmaps().filter((r) => r.status === "published" && r.question_count > 0);

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/roadmaps`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/practice`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  for (const g of guides) {
    entries.push({ url: `${SITE_URL}${g.url}`, lastModified: new Date(g.last_updated), changeFrequency: "monthly", priority: 0.8 });
  }
  for (const r of roadmaps) {
    entries.push({ url: `${SITE_URL}${r.url}`, lastModified: new Date(r.last_updated), changeFrequency: "monthly", priority: 0.8 });
  }
  for (const c of categories) {
    entries.push({ url: `${SITE_URL}/${c.slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 });
  }
  for (const t of technologies) {
    entries.push({
      url: `${SITE_URL}/technologies/${t.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }
  for (const d of DIFFICULTIES) {
    entries.push({ url: `${SITE_URL}/difficulty/${d}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const t of INDEXABLE_QUESTION_TYPES) {
    entries.push({ url: `${SITE_URL}/type/${t}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const l of INTERVIEW_LEVELS) {
    entries.push({ url: `${SITE_URL}/level/${l}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  }
  for (const q of questions) {
    entries.push({
      url: `${SITE_URL}${q.url}`,
      lastModified: new Date(q.last_updated),
      changeFrequency: "monthly",
      priority: 0.9,
    });
  }

  return entries;
}
