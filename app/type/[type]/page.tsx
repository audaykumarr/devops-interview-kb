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
import { getAllQuestions, getQuestionsByType } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";
import { INDEXABLE_QUESTION_TYPES } from "@/lib/question-types";

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ category?: string; technology?: string; difficulty?: string; level?: string; page?: string }>;
}

const INDEXABLE_TYPES = new Set<string>(INDEXABLE_QUESTION_TYPES);

const TYPE_INTROS: Record<string, string> = {
  troubleshooting:
    "Real production incidents, spanning Kubernetes, AWS, Docker, Terraform, CI/CD, networking, and databases — diagnosing a specific symptom back to its actual cause, not textbook definitions.",
  conceptual: "The underlying mechanisms and trade-offs interviewers expect you to actually understand, not just recite.",
  practical: "Hands-on, command-driven questions testing whether you can actually operate these tools, not just discuss them.",
  comparison: "Head-to-head trade-off questions — the kind that reveal whether a candidate has real judgment or just memorized facts.",
  architecture: "Designing systems under real constraints: requirements, trade-offs, and the reasoning behind a specific design choice.",
  scenario: "Open-ended, realistic situations that combine multiple technologies and force genuine engineering judgment.",
  security: "Security-focused questions spanning IAM, secrets management, supply chain, and access control across every technology in the corpus.",
};

function getDistinctTypes(): string[] {
  const all = getAllQuestions();
  const types = new Set<string>();
  for (const q of all) for (const t of q.question_type) types.add(t);
  return [...types];
}

export function generateStaticParams() {
  return getDistinctTypes().map((type) => ({ type }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { type } = await params;
  const all = getQuestionsByType(type);
  if (all.length === 0) return {};
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const name = labelize(type);
  return buildMetadata({
    title: page > 1 ? `${name} Interview Questions – All Categories – Page ${page}` : `${name} Interview Questions – All Categories`,
    description: `${name} DevOps interview questions spanning every technology in the corpus — real, scenario-driven practice, not definitions.`,
    path: page > 1 ? `/type/${type}?page=${page}` : `/type/${type}`,
    noindex: !INDEXABLE_TYPES.has(type),
  });
}

export default async function QuestionTypePage({ params, searchParams }: PageProps) {
  const { type } = await params;
  const all = getQuestionsByType(type);
  if (all.length === 0) notFound();

  const sp = await searchParams;
  const filtered = applyFilters(all, {
    category: sp.category,
    technology: sp.technology,
    difficulty: sp.difficulty,
    interview_level: sp.level,
  });

  const categories = Array.from(new Set(all.map((q) => q.category))).sort();
  const technologies = Array.from(new Set(all.flatMap((q) => q.technologies))).sort();
  const difficulties = Array.from(new Set(all.map((q) => q.difficulty))).sort();
  const levels = Array.from(new Set(all.flatMap((q) => q.interview_level))).sort();
  const name = labelize(type);

  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { items: pageItems, currentPage, totalPages, startIndex } = paginate(filtered, requestedPage);

  const hrefFor = (page: number) => {
    const qsParams = new URLSearchParams();
    if (sp.category) qsParams.set("category", sp.category);
    if (sp.technology) qsParams.set("technology", sp.technology);
    if (sp.difficulty) qsParams.set("difficulty", sp.difficulty);
    if (sp.level) qsParams.set("level", sp.level);
    if (page > 1) qsParams.set("page", String(page));
    const qs = qsParams.toString();
    return qs ? `/type/${type}?${qs}` : `/type/${type}`;
  };

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: `${name} Questions` }])} />
      {pageItems.length > 0 && (
        <JsonLd
          data={itemListJsonLd({
            name: `${name} DevOps Interview Questions`,
            items: pageItems.map((q) => ({ title: q.title, url: q.url })),
            startPosition: startIndex + 1,
          })}
        />
      )}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: `${name} Questions` }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name} Interview Questions — All Categories</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {all.length} {all.length === 1 ? "question" : "questions"} across {categories.length}{" "}
        {categories.length === 1 ? "category" : "categories"}
      </p>
      {TYPE_INTROS[type] && (
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{TYPE_INTROS[type]}</p>
      )}

      <div className="mt-6">
        <Suspense fallback={null}>
          <FilterBar
            filters={[
              { key: "category", label: "Category", options: categories },
              { key: "technology", label: "Technology", options: technologies },
              { key: "difficulty", label: "Difficulty", options: difficulties },
              { key: "level", label: "Interview Level", options: levels },
            ]}
          />
        </Suspense>
        <QuestionGrid questions={pageItems} />
        <Pagination currentPage={currentPage} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
