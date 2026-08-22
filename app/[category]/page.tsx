import type { Metadata } from "next";
import Link from "next/link";
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
import { getQuestionsByCategory, getTaxonomy } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ difficulty?: string; technology?: string; type?: string; page?: string }>;
}

export function generateStaticParams() {
  return getTaxonomy().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const entry = getTaxonomy().find((c) => c.slug === category);
  if (!entry) return {};
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  return buildMetadata({
    title: page > 1 ? `${entry.name} Interview Questions – Page ${page}` : `${entry.name} Interview Questions`,
    description: `Original, scenario-driven ${entry.name} interview questions covering practical engineering judgment, not just definitions.`,
    path: page > 1 ? `/${category}?page=${page}` : `/${category}`,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const entry = getTaxonomy().find((c) => c.slug === category);
  if (!entry) notFound();
  const { name, description } = entry;

  const sp = await searchParams;
  const all = getQuestionsByCategory(category);
  const filtered = applyFilters(all, {
    difficulty: sp.difficulty,
    technology: sp.technology,
    question_type: sp.type,
  });

  const difficulties = Array.from(new Set(all.map((q) => q.difficulty))).sort();
  const technologies = Array.from(new Set(all.flatMap((q) => q.technologies))).sort();
  const questionTypes = Array.from(new Set(all.flatMap((q) => q.question_type))).sort();

  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { items: pageItems, currentPage, totalPages, startIndex } = paginate(filtered, requestedPage);

  const hrefFor = (page: number) => {
    const qsParams = new URLSearchParams();
    if (sp.difficulty) qsParams.set("difficulty", sp.difficulty);
    if (sp.technology) qsParams.set("technology", sp.technology);
    if (sp.type) qsParams.set("type", sp.type);
    if (page > 1) qsParams.set("page", String(page));
    const qs = qsParams.toString();
    return qs ? `/${category}?${qs}` : `/${category}`;
  };

  const breadcrumbs = [{ label: "Home", href: "/" }, { label: name }];

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
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name} Interview Questions</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {all.length} {all.length === 1 ? "question" : "questions"}
      </p>
      {description && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>}

      {technologies.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Related technologies:</span>
          {technologies.map((tech) => (
            <Link
              key={tech}
              href={`/technologies/${tech}`}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
            >
              {labelize(tech)}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Suspense fallback={null}>
          <FilterBar
            filters={[
              { key: "difficulty", label: "Difficulty", options: difficulties },
              { key: "technology", label: "Technology", options: technologies },
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
