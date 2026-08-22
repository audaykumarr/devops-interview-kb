import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterBar } from "@/components/FilterBar";
import { JsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { QuestionGrid } from "@/components/QuestionGrid";
import { getAllTechnologies, getCategoryName, getQuestionsByTechnology } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { buildMetadata } from "@/lib/seo";
import { paginate } from "@/lib/pagination";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";
import { labelize } from "@/lib/format";

interface PageProps {
  params: Promise<{ technology: string }>;
  searchParams: Promise<{ difficulty?: string; category?: string; type?: string; page?: string }>;
}

export function generateStaticParams() {
  return getAllTechnologies().map((t) => ({ technology: t.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { technology } = await params;
  const name = labelize(technology);
  const all = getQuestionsByTechnology(technology);
  if (all.length === 0) return {};
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  return buildMetadata({
    title: page > 1 ? `${name} Interview Questions – Page ${page}` : `${name} Interview Questions`,
    description: `Practical ${name} interview questions and scenario-driven answers for DevOps and platform engineering interviews.`,
    path: page > 1 ? `/technologies/${technology}?page=${page}` : `/technologies/${technology}`,
  });
}

export default async function TechnologyPage({ params, searchParams }: PageProps) {
  const { technology } = await params;
  const all = getQuestionsByTechnology(technology);
  if (all.length === 0) notFound();

  const sp = await searchParams;
  const filtered = applyFilters(all, {
    difficulty: sp.difficulty,
    category: sp.category,
    question_type: sp.type,
  });

  const difficulties = Array.from(new Set(all.map((q) => q.difficulty))).sort();
  const categories = Array.from(new Set(all.map((q) => q.category))).sort();
  const questionTypes = Array.from(new Set(all.flatMap((q) => q.question_type))).sort();
  const name = labelize(technology);

  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { items: pageItems, currentPage, totalPages, startIndex } = paginate(filtered, requestedPage);

  const hrefFor = (page: number) => {
    const qsParams = new URLSearchParams();
    if (sp.difficulty) qsParams.set("difficulty", sp.difficulty);
    if (sp.category) qsParams.set("category", sp.category);
    if (sp.type) qsParams.set("type", sp.type);
    if (page > 1) qsParams.set("page", String(page));
    const qs = qsParams.toString();
    return qs ? `/technologies/${technology}?${qs}` : `/technologies/${technology}`;
  };

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name }])} />
      {pageItems.length > 0 && (
        <JsonLd
          data={itemListJsonLd({
            name: `${name} Interview Questions`,
            items: pageItems.map((q) => ({ title: q.title, url: q.url })),
            startPosition: startIndex + 1,
          })}
        />
      )}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: name }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name} Interview Questions</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {all.length} {all.length === 1 ? "question" : "questions"}
      </p>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Related categories:</span>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/${cat}`}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
            >
              {getCategoryName(cat) ?? labelize(cat)}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Suspense fallback={null}>
          <FilterBar
            filters={[
              { key: "difficulty", label: "Difficulty", options: difficulties },
              { key: "category", label: "Category", options: categories },
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
