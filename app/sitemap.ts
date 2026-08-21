import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getAllQuestions, getAllTechnologies, getCategoriesWithCounts } from "@/lib/questions";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

export default function sitemap(): MetadataRoute.Sitemap {
  const questions = getAllQuestions();
  const categories = getCategoriesWithCounts().filter((c) => c.count > 0);
  const technologies = getAllTechnologies();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

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
