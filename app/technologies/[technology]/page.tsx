import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterBar } from "@/components/FilterBar";
import { JsonLd } from "@/components/JsonLd";
import { QuestionGrid } from "@/components/QuestionGrid";
import { getAllTechnologies, getQuestionsByTechnology } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { labelize } from "@/lib/format";

interface PageProps {
  params: Promise<{ technology: string }>;
  searchParams: Promise<{ difficulty?: string; category?: string; type?: string }>;
}

export function generateStaticParams() {
  return getAllTechnologies().map((t) => ({ technology: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { technology } = await params;
  const name = labelize(technology);
  const all = getQuestionsByTechnology(technology);
  if (all.length === 0) return {};
  return buildMetadata({
    title: `${name} Interview Questions`,
    description: `Practical ${name} interview questions and scenario-driven answers for DevOps and platform engineering interviews.`,
    path: `/technologies/${technology}`,
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

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name }])} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: name }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name} Interview Questions</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {all.length} {all.length === 1 ? "question" : "questions"}
      </p>

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
        <QuestionGrid questions={filtered} />
      </div>
    </div>
  );
}
