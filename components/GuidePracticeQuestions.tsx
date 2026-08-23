import Link from "next/link";
import type { GuideIndexEntry } from "@/lib/guides";
import type { QuestionIndexEntry } from "@/lib/questions";
import { INDEXABLE_QUESTION_TYPES } from "@/lib/question-types";
import { INTERVIEW_LEVELS, INTERVIEW_LEVEL_LABELS, type InterviewLevel } from "@/scripts/lib/interview-level";
import { pickRepresentativeQuestions } from "@/scripts/lib/guide-question-selection";
import { groupByCategory, groupQuestionsByDomain, type GuideDomain } from "@/scripts/lib/guide-domains";
import { labelize } from "@/lib/format";
import { DifficultyBadge } from "./Badge";

const INDEXABLE_TYPES = new Set<string>(INDEXABLE_QUESTION_TYPES);
const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced", "expert"];

const PILL =
  "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400";
const PILL_STATIC =
  "rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400";
const SUBHEADING = "text-sm font-semibold text-slate-900 dark:text-slate-100 scroll-mt-20";
const SUBDESCRIPTION = "mt-1 text-sm text-slate-500 dark:text-slate-400";

function countBy(items: QuestionIndexEntry[], keyFn: (item: QuestionIndexEntry) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const key of keyFn(item)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Orders subcategory groups by an explicit, guide-authored sequence when one
 * is given (so "By Subcategory" can mirror the Learning / Interview Path
 * above it), falling back to largest-group-first for any guide that doesn't
 * supply one. Anything not named in `order` sorts after everything that is.
 */
function orderSubcategories(
  entries: [string, QuestionIndexEntry[]][],
  order?: string[],
): [string, QuestionIndexEntry[]][] {
  if (!order || order.length === 0) {
    return [...entries].sort((a, b) => b[1].length - a[1].length);
  }
  const rank = new Map(order.map((slug, i) => [slug, i]));
  return [...entries].sort((a, b) => {
    const ra = rank.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
    return ra !== rb ? ra - rb : b[1].length - a[1].length;
  });
}

/**
 * Renders the guide's Practice Questions section entirely from the live
 * question index, filtered to the guide's own `categories` — never a
 * stored list, so a newly published question appears here automatically.
 *
 * Ordered as a quick-start-to-deep-practice progression: Must Practice
 * (fastest path for limited time) → By Subcategory (orientation — what
 * exists, where) → Prepare by Interview Level (target the actual role) →
 * By Difficulty / By Question Type (open-ended further exploration).
 */
export function GuidePracticeQuestions({
  guide,
  questions,
  featured,
  subcategoryOrder,
  domains,
}: {
  guide: GuideIndexEntry;
  questions: QuestionIndexEntry[];
  featured: QuestionIndexEntry[];
  /** Optional guide-authored subcategory sequence (e.g. matching its Learning / Interview Path). Falls back to largest-group-first when omitted. Ignored when `domains` is given. */
  subcategoryOrder?: string[];
  /**
   * Optional domain configuration for a multi-category umbrella guide (see
   * scripts/lib/guide-domains.ts). When given, renders "By Domain" in place
   * of "By Subcategory" — grouping by category into named domains instead of
   * by raw `subcategory` string, which isn't safe across categories (e.g.
   * "networking" exists as a subcategory under both `docker` and
   * `kubernetes`, meaning something unrelated).
   */
  domains?: GuideDomain[];
}) {
  const primaryCategory = guide.category;
  const primaryCategoryName = labelize(guide.categories[0] ?? "");
  const featuredIds = new Set(featured.map((q) => q.id));
  const byDifficulty = countBy(questions, (q) => [q.difficulty]);
  const byType = countBy(questions, (q) => q.question_type);
  const byLevel = countBy(questions, (q) => q.interview_level);

  const bySubcategory = new Map<string, QuestionIndexEntry[]>();
  for (const q of questions) {
    const list = bySubcategory.get(q.subcategory) ?? [];
    list.push(q);
    bySubcategory.set(q.subcategory, list);
  }
  const subcategoryEntries = orderSubcategories(Array.from(bySubcategory.entries()), subcategoryOrder);
  const domainGroups = domains && domains.length > 0 ? groupQuestionsByDomain(questions, domains) : null;

  return (
    <div className="space-y-10">
      {featured.length > 0 && (
        <div id="must-practice">
          <h3 className={SUBHEADING}>Must Practice</h3>
          <p className={SUBDESCRIPTION}>
            Short on time? This is a deliberately small, representative cross-section — work through these first.
          </p>
          <ul className="mt-3 space-y-2">
            {featured.map((q) => (
              <li key={q.id}>
                <Link
                  href={q.url}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <span className="text-slate-800 dark:text-slate-200">{q.title}</span>
                  <DifficultyBadge difficulty={q.difficulty} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {domainGroups ? (
        <div id="by-domain">
          <h3 className={SUBHEADING}>By Domain</h3>
          <p className={SUBDESCRIPTION}>
            The major DevOps preparation areas this bank covers, and the specific categories within each — jump
            straight to whichever is relevant to your target role.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {domainGroups.map(({ domain, questions: domainQuestions }) => {
              const categoryGroups = groupByCategory(domainQuestions);
              return (
                <div
                  key={domain.id}
                  className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{domain.name}</h4>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {domainQuestions.length}
                    </span>
                  </div>
                  {domain.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{domain.description}</p>}
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {categoryGroups.map(({ category, questions: categoryQuestions }) => (
                      <li key={category}>
                        <Link
                          href={`/${category}`}
                          className="-my-1 flex items-center justify-between gap-2 py-1 text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                        >
                          <span>{labelize(category)}</span>
                          <span className="shrink-0 text-slate-400 dark:text-slate-500">
                            {categoryQuestions.length} →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div id="by-subcategory">
          <h3 className={SUBHEADING}>By Subcategory</h3>
          <p className={SUBDESCRIPTION}>
            What each area of {primaryCategoryName} interview prep actually covers, and how much of it exists in the
            bank.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {subcategoryEntries.map(([subcategory, items]) => {
              const representative = pickRepresentativeQuestions(items, featuredIds, 3);
              const subcategoryHref = primaryCategory ? `/${primaryCategory}?subcategory=${subcategory}` : null;
              return (
                <div
                  key={subcategory}
                  className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {subcategoryHref ? (
                        <Link
                          href={subcategoryHref}
                          className="-my-1 py-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {labelize(subcategory)}
                        </Link>
                      ) : (
                        labelize(subcategory)
                      )}
                    </h4>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {items.length}
                    </span>
                  </div>
                  <ul className="mt-3 flex-1 space-y-2">
                    {representative.map((q) => (
                      <li key={q.id}>
                        <Link
                          href={q.url}
                          className="-my-1 block py-1 text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                        >
                          {q.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {subcategoryHref && (
                    <Link
                      href={subcategoryHref}
                      className="-my-2 mt-3 inline-block py-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      View all {items.length} {items.length === 1 ? "question" : "questions"} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div id="prepare-by-level">
        <h3 className={SUBHEADING}>Prepare by Interview Level</h3>
        <p className={SUBDESCRIPTION}>
          These aren&apos;t just counts — each one is a curated preparation path for that specific role. Pick the
          level you&apos;re actually interviewing for.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERVIEW_LEVELS.filter((level) => byLevel.has(level)).map((level) => (
            <Link
              key={level}
              href={primaryCategory ? `/level/${level}?category=${primaryCategory}` : `/level/${level}`}
              className={PILL}
            >
              {INTERVIEW_LEVEL_LABELS[level as InterviewLevel] ?? labelize(level)}{" "}
              <span className="text-slate-400 dark:text-slate-500">({byLevel.get(level)})</span>
            </Link>
          ))}
        </div>
      </div>

      <div id="by-difficulty">
        <h3 className={SUBHEADING}>By Difficulty</h3>
        <p className={SUBDESCRIPTION}>
          Work upward if you&apos;re building from fundamentals, or jump straight to the difficulty an interview at
          your level will actually probe.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DIFFICULTY_ORDER.filter((d) => byDifficulty.has(d)).map((d) => (
            <Link key={d} href={primaryCategory ? `/${primaryCategory}?difficulty=${d}` : `/difficulty/${d}`} className={PILL}>
              {labelize(d)} <span className="text-slate-400 dark:text-slate-500">({byDifficulty.get(d)})</span>
            </Link>
          ))}
        </div>
      </div>

      <div id="by-question-type">
        <h3 className={SUBHEADING}>By Question Type</h3>
        <p className={SUBDESCRIPTION}>
          Practice one specific skill at a time — troubleshooting, architecture trade-offs, head-to-head comparisons,
          and more.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from(byType.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const href = INDEXABLE_TYPES.has(type)
                ? primaryCategory
                  ? `/type/${type}?category=${primaryCategory}`
                  : `/type/${type}`
                : null;
              return href ? (
                <Link key={type} href={href} className={PILL}>
                  {labelize(type)} <span className="text-slate-400 dark:text-slate-500">({count})</span>
                </Link>
              ) : (
                <span key={type} className={PILL_STATIC}>
                  {labelize(type)} ({count})
                </span>
              );
            })}
        </div>
      </div>
    </div>
  );
}
