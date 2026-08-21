import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { SearchClient } from "@/components/SearchClient";
import { getAllQuestions } from "@/lib/questions";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = buildMetadata({
  title: "Search",
  description: "Search DevOps interview questions by title, tag, technology, or question type.",
  path: "/search",
});

export default function SearchPage() {
  const questions = getAllQuestions();

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Search" }])} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Search Questions</h1>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>}>
          <SearchClient questions={questions} />
        </Suspense>
      </div>
    </div>
  );
}
