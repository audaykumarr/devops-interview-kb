import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FilterBar } from "@/components/FilterBar";
import { JsonLd } from "@/components/JsonLd";
import { QuestionGrid } from "@/components/QuestionGrid";
import { getQuestionsByDifficulty } from "@/lib/questions";
import { applyFilters } from "@/lib/search";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { labelize } from "@/lib/format";

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"];

interface PageProps {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ category?: string; technology?: string; type?: string }>;
}

export function generateStaticParams() {
  return DIFFICULTIES.map((level) => ({ level }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { level } = await params;
  if (!DIFFICULTIES.includes(level)) return {};
  const name = labelize(level);
  return buildMetadata({
    title: `${name} DevOps Interview Questions`,
    description: `${name}-level DevOps interview questions spanning cloud, containers, CI/CD, and troubleshooting scenarios.`,
    path: `/difficulty/${level}`,
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
  });

  const categories = Array.from(new Set(all.map((q) => q.category))).sort();
  const technologies = Array.from(new Set(all.flatMap((q) => q.technologies))).sort();
  const questionTypes = Array.from(new Set(all.flatMap((q) => q.question_type))).sort();
  const name = labelize(level);

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: `${name} Questions` }])} />
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
            ]}
          />
        </Suspense>
        <QuestionGrid questions={filtered} />
      </div>
    </div>
  );
}
