/**
 * Question types with real cross-category spread — worth a full, indexed
 * /type/[type] landing page. Everything else still renders (never 404s)
 * but is noindexed and left out of the sitemap, since it's too thin or too
 * duplicative of an existing category page to be worth ranking on its own
 * (e.g. "behavioral" and "system-design" each live almost entirely in one
 * category already).
 */
export const INDEXABLE_QUESTION_TYPES = [
  "troubleshooting",
  "conceptual",
  "practical",
  "comparison",
  "architecture",
  "scenario",
  "security",
] as const;
