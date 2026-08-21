import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PracticeClient } from "@/components/PracticeClient";
import { getCategoriesWithCounts, getPracticeSet } from "@/lib/questions";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = buildMetadata({
  title: "Practice",
  description: "Flashcard-style practice: reveal each answer, filter by category or difficulty, and shuffle through the question bank.",
  path: "/practice",
});

export default function PracticePage() {
  const allCards = getPracticeSet();
  const categories = getCategoriesWithCounts().filter((c) => c.count > 0);

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Practice" }])} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Practice" }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Practice</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
        One question at a time. Think it through, reveal the answer, and move on.
      </p>

      <div className="mt-6">
        <Suspense fallback={null}>
          <PracticeClient allCards={allCards} categories={categories} />
        </Suspense>
      </div>
    </div>
  );
}
