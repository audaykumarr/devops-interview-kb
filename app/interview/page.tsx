import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InterviewClient } from "@/components/InterviewClient";
import { JsonLd } from "@/components/JsonLd";
import { buildInterviewPool } from "@/lib/interview-session";
import { getAllFollowUpLinks, getAllQuestions, getCategoriesWithCounts, getPracticeSet } from "@/lib/questions";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { INTERVIEW_LEVELS, INTERVIEW_LEVEL_LABELS } from "@/scripts/lib/interview-level";
import { INDEXABLE_QUESTION_TYPES } from "@/lib/question-types";

export const metadata: Metadata = buildMetadata({
  title: "Interview Mode",
  description: "Timed, assessment-style mock interviews: configure a session by level, question type, and difficulty, then self-score and review a breakdown at the end.",
  path: "/interview",
});

export default function InterviewPage() {
  const pool = buildInterviewPool(getAllQuestions(), getPracticeSet());
  const categories = getCategoriesWithCounts().filter((c) => c.count > 0);
  const levels = INTERVIEW_LEVELS.map((level) => ({ slug: level, label: INTERVIEW_LEVEL_LABELS[level] }));
  const followUpLinks = getAllFollowUpLinks();

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Interview Mode" }])} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Interview Mode" }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Interview Mode</h1>

      <div className="mt-6">
        <Suspense fallback={null}>
          <InterviewClient pool={pool} categories={categories} levels={levels} types={[...INDEXABLE_QUESTION_TYPES]} followUpLinks={followUpLinks} />
        </Suspense>
      </div>
    </div>
  );
}
