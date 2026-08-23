import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Badge } from "@/components/Badge";
import { JsonLd } from "@/components/JsonLd";
import { MarkdownSection } from "@/components/MarkdownSection";
import { RoadmapStages } from "@/components/RoadmapStages";
import { formatDate } from "@/lib/format";
import { getAllQuestions } from "@/lib/questions";
import { getAllRoadmaps, getRoadmapDetail } from "@/lib/roadmaps";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, courseJsonLd } from "@/lib/structured-data";
import { INTERVIEW_LEVEL_LABELS, type InterviewLevel } from "@/scripts/lib/interview-level";

/** "Stages" and "Related Guides" get dedicated, data-driven rendering below. */
const PROSE_SECTIONS = ["Introduction", "Who This Roadmap Is For", "Deferred Areas"];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllRoadmaps().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = getRoadmapDetail(slug);
  if (!detail) return {};
  return buildMetadata({
    title: detail.title,
    description: detail.description,
    path: detail.url,
    type: "article",
    noindex: detail.question_count === 0 || detail.status !== "published",
  });
}

export default async function RoadmapPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = getRoadmapDetail(slug);
  if (!detail) notFound();

  const questionCategoryById = Object.fromEntries(getAllQuestions().map((q) => [q.id, q.category]));
  const roleLabel = INTERVIEW_LEVEL_LABELS[detail.target_role as InterviewLevel] ?? detail.target_role;

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Roadmaps", path: "/roadmaps" }, { name: detail.title }])}
      />
      <JsonLd
        data={courseJsonLd({
          title: detail.title,
          description: detail.description,
          path: detail.url,
          dateModified: detail.last_updated,
        })}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Roadmaps", href: "/roadmaps" }, { label: detail.title }]} />

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{detail.title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{detail.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge>{roleLabel}</Badge>
        <span className="text-xs text-slate-500 dark:text-slate-400">{detail.stages.length} stages</span>
        {detail.estimated_duration_weeks && (
          <span className="text-xs text-slate-500 dark:text-slate-400">~{detail.estimated_duration_weeks} weeks</span>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {detail.question_count} linked {detail.question_count === 1 ? "question" : "questions"}
        </span>
      </div>

      <div className="mt-8 space-y-8">
        {PROSE_SECTIONS.filter((heading) => detail.sections[heading])
          .map((heading) => (
            <section key={heading} aria-labelledby={`section-${heading}`}>
              <h2 id={`section-${heading}`} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {heading}
              </h2>
              <div className="mt-2">
                <MarkdownSection content={detail.sections[heading]!} />
              </div>
            </section>
          ))}

        <section aria-labelledby="section-stages">
          <h2 id="section-stages" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Stages
          </h2>
          <div className="mt-4">
            <RoadmapStages stages={detail.stagesResolved} questionCategoryById={questionCategoryById} />
          </div>
        </section>

        {detail.sections["Related Guides"] && (
          <section aria-labelledby="section-related-guides">
            <h2 id="section-related-guides" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Related Guides
            </h2>
            <div className="mt-2">
              <MarkdownSection content={detail.sections["Related Guides"]!} />
            </div>
          </section>
        )}
      </div>

      <div className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <p>
          Last updated {formatDate(detail.last_updated)} · Last reviewed {formatDate(detail.last_reviewed)}
        </p>
      </div>
    </div>
  );
}
