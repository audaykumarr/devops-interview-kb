import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterBar } from "@/components/FilterBar";
import { JsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { QuestionGrid } from "@/components/QuestionGrid";
import { labelize } from "@/lib/format";
import { paginate } from "@/lib/pagination";
import { buildMetadata } from "@/lib/seo";
import { getQuestionsByLevel } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";
import { INTERVIEW_LEVELS, INTERVIEW_LEVEL_LABELS, type InterviewLevel } from "@/scripts/lib/interview-level";

interface PageProps {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ category?: string; technology?: string; difficulty?: string; type?: string; page?: string }>;
}

const LEVEL_INTROS: Record<InterviewLevel, string> = {
  "junior-devops":
    "Foundational questions for a first DevOps role — core Linux, Git, containers, and CI/CD concepts, without assuming years of production experience.",
  "devops-engineer":
    "The bulk of a working DevOps engineer's day-to-day: hands-on tooling, common troubleshooting, and the practical judgment calls that come up once you're actually operating systems.",
  "senior-devops":
    "Deeper trade-off and design questions — why a specific approach was chosen, what breaks at scale, and how to reason about a system you didn't build.",
  sre: "Site Reliability Engineering questions on SLOs, error budgets, incident response, and the observability practices that define the discipline.",
  "platform-engineer": "Internal developer platforms, golden paths, and the self-service tooling that platform teams are actually measured on.",
  "cloud-engineer": "Cloud-provider-specific depth — AWS, Azure, GCP — architecture, cost, and the platform-specific judgment calls each provider demands.",
  devsecops: "Security integrated into the delivery pipeline — supply chain, secrets management, access control, and shifting security left.",
  "staff-principal":
    "Expert-level and system-design questions — the scope, trade-offs, and organizational reasoning expected at the most senior technical levels.",
};

export function generateStaticParams() {
  return INTERVIEW_LEVELS.map((level) => ({ level }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { level } = await params;
  if (!INTERVIEW_LEVELS.includes(level as InterviewLevel)) return {};
  const all = getQuestionsByLevel(level);
  if (all.length === 0) return {};
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const name = INTERVIEW_LEVEL_LABELS[level as InterviewLevel];
  return buildMetadata({
    title: page > 1 ? `${name} Interview Questions – Page ${page}` : `${name} Interview Questions`,
    description: `Interview questions curated for ${name} roles — matched by difficulty and specialty area, spanning every relevant technology in the corpus.`,
    path: page > 1 ? `/level/${level}?page=${page}` : `/level/${level}`,
  });
}

export default async function InterviewLevelPage({ params, searchParams }: PageProps) {
  const { level } = await params;
  if (!INTERVIEW_LEVELS.includes(level as InterviewLevel)) notFound();
  const all = getQuestionsByLevel(level);
  if (all.length === 0) notFound();

  const sp = await searchParams;
  const filtered = applyFilters(all, {
    category: sp.category,
    technology: sp.technology,
    difficulty: sp.difficulty,
    question_type: sp.type,
  });

  const categories = Array.from(new Set(all.map((q) => q.category))).sort();
  const technologies = Array.from(new Set(all.flatMap((q) => q.technologies))).sort();
  const difficulties = Array.from(new Set(all.map((q) => q.difficulty))).sort();
  const questionTypes = Array.from(new Set(all.flatMap((q) => q.question_type))).sort();
  const name = INTERVIEW_LEVEL_LABELS[level as InterviewLevel];

  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { items: pageItems, currentPage, totalPages, startIndex } = paginate(filtered, requestedPage);

  const hrefFor = (page: number) => {
    const qsParams = new URLSearchParams();
    if (sp.category) qsParams.set("category", sp.category);
    if (sp.technology) qsParams.set("technology", sp.technology);
    if (sp.difficulty) qsParams.set("difficulty", sp.difficulty);
    if (sp.type) qsParams.set("type", sp.type);
    if (page > 1) qsParams.set("page", String(page));
    const qs = qsParams.toString();
    return qs ? `/level/${level}?${qs}` : `/level/${level}`;
  };

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: `${name} Questions` }])} />
      {pageItems.length > 0 && (
        <JsonLd
          data={itemListJsonLd({
            name: `${name} Interview Questions`,
            items: pageItems.map((q) => ({ title: q.title, url: q.url })),
            startPosition: startIndex + 1,
          })}
        />
      )}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: `${name} Questions` }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name} Interview Questions</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {all.length} {all.length === 1 ? "question" : "questions"} across {categories.length}{" "}
        {categories.length === 1 ? "category" : "categories"}
      </p>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {LEVEL_INTROS[level as InterviewLevel]}
      </p>

      <div className="mt-6">
        <Suspense fallback={null}>
          <FilterBar
            filters={[
              { key: "category", label: "Category", options: categories },
              { key: "technology", label: "Technology", options: technologies },
              { key: "difficulty", label: "Difficulty", options: difficulties },
              { key: "type", label: "Type", options: questionTypes },
            ]}
          />
        </Suspense>
        <QuestionGrid questions={pageItems} />
        <Pagination currentPage={currentPage} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
