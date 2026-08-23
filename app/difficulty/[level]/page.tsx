import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterBar } from "@/components/FilterBar";
import { JsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { QuestionGrid } from "@/components/QuestionGrid";
import { getQuestionsByDifficulty } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { buildMetadata } from "@/lib/seo";
import { paginate } from "@/lib/pagination";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";
import { labelize } from "@/lib/format";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

interface PageProps {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ category?: string; technology?: string; type?: string; interviewLevel?: string; page?: string }>;
}

export function generateStaticParams() {
  return DIFFICULTIES.map((level) => ({ level }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { level } = await params;
  if (!DIFFICULTIES.includes(level)) return {};
  const name = labelize(level);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  return buildMetadata({
    title: page > 1 ? `${name} DevOps Interview Questions – Page ${page}` : `${name} DevOps Interview Questions`,
    description: `${name}-level DevOps interview questions spanning cloud, containers, CI/CD, and troubleshooting scenarios.`,
    path: page > 1 ? `/difficulty/${level}?page=${page}` : `/difficulty/${level}`,
  });
}

export default async function DifficultyPage({ params, searchParams }: PageProps) {
  const { level } = await params;
  if (!DIFFICULTIES.includes(level)) notFound();

  const sp = await searchParams;
  const all = getQuestionsByDifficulty(level);
  const filtered = applyFilters(all, {
    category: sp.category,
    technology: sp.technology,
    question_type: sp.type,
    interview_level: sp.interviewLevel,
  });

  const categories = Array.from(new Set(all.map((q) => q.category))).sort();
  const technologies = Array.from(new Set(all.flatMap((q) => q.technologies))).sort();
  const questionTypes = Array.from(new Set(all.flatMap((q) => q.question_type))).sort();
  const levels = Array.from(new Set(all.flatMap((q) => q.interview_level))).sort();
  const name = labelize(level);

  const requestedPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { items: pageItems, currentPage, totalPages, startIndex } = paginate(filtered, requestedPage);

  const hrefFor = (page: number) => {
    const qsParams = new URLSearchParams();
    if (sp.category) qsParams.set("category", sp.category);
    if (sp.technology) qsParams.set("technology", sp.technology);
    if (sp.type) qsParams.set("type", sp.type);
    if (sp.interviewLevel) qsParams.set("interviewLevel", sp.interviewLevel);
    if (page > 1) qsParams.set("page", String(page));
    const qs = qsParams.toString();
    return qs ? `/difficulty/${level}?${qs}` : `/difficulty/${level}`;
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name} DevOps Interview Questions</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {all.length} {all.length === 1 ? "question" : "questions"}
      </p>

      <div className="mt-6">
        <Suspense fallback={null}>
          <FilterBar
            filters={[
              { key: "category", label: "Category", options: categories },
              { key: "technology", label: "Technology", options: technologies },
              { key: "type", label: "Type", options: questionTypes },
              { key: "interviewLevel", label: "Interview Level", options: levels },
            ]}
          />
        </Suspense>
        <QuestionGrid questions={pageItems} />
        <Pagination currentPage={currentPage} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
