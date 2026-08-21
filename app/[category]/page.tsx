import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterBar } from "@/components/FilterBar";
import { JsonLd } from "@/components/JsonLd";
import { QuestionGrid } from "@/components/QuestionGrid";
import { buildMetadata } from "@/lib/seo";
import { getCategoryName, getQuestionsByCategory, getTaxonomy } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { breadcrumbJsonLd } from "@/lib/structured-data";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ difficulty?: string; technology?: string; type?: string }>;
}

export function generateStaticParams() {
  return getTaxonomy().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const name = getCategoryName(category);
  if (!name) return {};
  return buildMetadata({
    title: `${name} Interview Questions`,
    description: `Original, scenario-driven ${name} interview questions covering practical engineering judgment, not just definitions.`,
    path: `/${category}`,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { category } = await params;
  const name = getCategoryName(category);
  if (!name) notFound();

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

  const breadcrumbs = [{ label: "Home", href: "/" }, { label: name }];

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name }])} />
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name} Interview Questions</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {all.length} {all.length === 1 ? "question" : "questions"}
      </p>

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
        <QuestionGrid questions={filtered} />
      </div>
    </div>
  );
}
