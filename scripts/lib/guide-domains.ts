/**
 * Reusable domain-grouping abstraction: Guide → domain configuration → Domain
 * → categories → questions. A "domain" is a named, ordered grouping of one or
 * more existing question `category` values into a higher-level preparation
 * area — it carries no new per-question metadata and requires no schema
 * change; a question's category (already the schema's source of truth)
 * determines its domain purely by lookup at render/generation time.
 *
 * This shape is deliberately generic — not Guide-specific — so it can be
 * reused by future features (Roadmaps, Cheat Sheets, Interview Mode, or a
 * future umbrella Guide) that need the same "group existing categories into
 * named topic areas" concept without inventing their own version of it.
 */
export interface GuideDomain {
  /** Stable, kebab-case identifier for this domain (e.g. "cicd"). */
  id: string;
  /** Human-readable display name (e.g. "CI/CD"). */
  name: string;
  /** taxonomy.json category slugs that belong to this domain. A category belongs to exactly one domain in a given configuration. */
  categories: string[];
  /** Optional one-line description of what this domain covers, for card/section subtitles. */
  description?: string;
}

export interface DomainGroup<T> {
  domain: GuideDomain;
  questions: T[];
}

/**
 * Groups an arbitrary question-like array by domain, in the domain
 * configuration's own order. A question's domain is determined solely by
 * which domain's `categories` list contains its `category` — never by
 * technology tags, and never by more than one domain (each category should
 * appear in exactly one domain in a well-formed configuration, so a question
 * is counted exactly once). Domains with zero matching questions are
 * omitted, so a caller never has to special-case an empty group.
 */
export function groupQuestionsByDomain<T extends { category: string }>(
  questions: T[],
  domains: GuideDomain[],
): DomainGroup<T>[] {
  const categoryToDomain = new Map<string, GuideDomain>();
  for (const domain of domains) {
    for (const category of domain.categories) {
      categoryToDomain.set(category, domain);
    }
  }

  const byDomainId = new Map<string, T[]>();
  for (const question of questions) {
    const domain = categoryToDomain.get(question.category);
    if (!domain) continue;
    const list = byDomainId.get(domain.id) ?? [];
    list.push(question);
    byDomainId.set(domain.id, list);
  }

  return domains
    .map((domain) => ({ domain, questions: byDomainId.get(domain.id) ?? [] }))
    .filter((group) => group.questions.length > 0);
}

/** Groups a domain's own questions by their category, for rendering the constituent-category breakdown inside a domain card. */
export function groupByCategory<T extends { category: string }>(questions: T[]): { category: string; questions: T[] }[] {
  const byCategory = new Map<string, T[]>();
  for (const q of questions) {
    const list = byCategory.get(q.category) ?? [];
    list.push(q);
    byCategory.set(q.category, list);
  }
  return Array.from(byCategory.entries())
    .map(([category, items]) => ({ category, questions: items }))
    .sort((a, b) => b.questions.length - a.questions.length);
}
