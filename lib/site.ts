/**
 * Falls back to localhost for local dev/build. Deployments MUST set
 * NEXT_PUBLIC_SITE_URL to the real production origin (no trailing slash) —
 * canonical URLs, OpenGraph URLs, the sitemap, and robots.txt all derive
 * from this. See .env.example.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "DevOps Interview Knowledge Base";
