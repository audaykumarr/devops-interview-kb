import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DifficultyBadge, TechnologyBadge, TypeBadge } from "@/components/Badge";
import { JsonLd } from "@/components/JsonLd";
import { MarkdownSection } from "@/components/MarkdownSection";
import { RelatedQuestions } from "@/components/RelatedQuestions";
import { formatDate, formatMinutes, labelize, stripMarkdown } from "@/lib/format";
import { getAllQuestions, getCategoryName, getQuestionDetail } from "@/lib/questions";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, qaPageJsonLd } from "@/lib/structured-data";

function metaDescription(shortAnswer: string, title: string): string {
  const plain = stripMarkdown(shortAnswer || title);
  if (plain.length <= 155) return plain;
  return `${plain.slice(0, 155).replace(/\s+\S*$/, "")}…`;
}

interface PageProps {
  params: Promise<{ category: string; subcategory: string; slug: string }>;
}

const SECTION_ORDER = [
  "Short Answer",
  "Detailed Explanation",
  "Symptoms",
  "Possible Causes",
  "Investigation Steps",
  "Commands",
  "Resolution",
  "Prevention",
  "Requirements",
  "Assumptions",
  "Architecture",
  "Components",
  "Trade-offs",
  "Failure Scenarios",
  "Security",
  "Scalability",
  "Cost Considerations",
  "Real-World Approach",
  "Example",
  "Common Mistakes",
  "Interview Follow-Up Questions",
  "Key Takeaways",
  "References",
];

export function generateStaticParams() {
  return getAllQuestions().map((q) => ({
    category: q.category,
    subcategory: q.subcategory,
    slug: q.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, subcategory, slug } = await params;
  const detail = getQuestionDetail(category, subcategory, slug);
  if (!detail) return {};
  return buildMetadata({
    title: detail.title,
    description: metaDescription(detail.sections["Short Answer"] ?? "", detail.title),
    path: detail.url,
    type: "article",
  });
}

export default async function QuestionPage({ params }: PageProps) {
  const { category, subcategory, slug } = await params;
  const detail = getQuestionDetail(category, subcategory, slug);
  if (!detail) notFound();

  const categoryName = getCategoryName(detail.category) ?? labelize(detail.category);

  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: categoryName, path: `/${detail.category}` },
          { name: detail.title },
        ])}
      />
      <JsonLd
        data={qaPageJsonLd({
          title: detail.title,
          answerText: stripMarkdown(detail.sections["Short Answer"] ?? detail.title),
          path: detail.url,
          dateModified: detail.last_updated,
        })}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: categoryName, href: `/${detail.category}` },
          { label: detail.title },
        ]}
      />

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{detail.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <DifficultyBadge difficulty={detail.difficulty} />
        {detail.question_type.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
        {detail.technologies.map((t) => (
          <TechnologyBadge key={t} technology={t} />
        ))}
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          {formatMinutes(detail.estimated_time_minutes)} read
        </span>
      </div>

      <div className="mt-8 space-y-8">
        {SECTION_ORDER.filter((heading) => detail.sections[heading]).map((heading) => (
          <section key={heading} aria-labelledby={`section-${heading}`}>
            <h2
              id={`section-${heading}`}
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {heading}
            </h2>
            <div className="mt-2">
              <MarkdownSection content={detail.sections[heading]!} />
            </div>
          </section>
        ))}
      </div>

      <RelatedQuestions items={detail.relatedResolved} />

      <div className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <p>
          Last updated {formatDate(detail.last_updated)} · Last reviewed {formatDate(detail.last_reviewed)}
        </p>
        {Object.keys(detail.technology_version).length > 0 && (
          <p className="mt-1">
            Versions referenced:{" "}
            {Object.entries(detail.technology_version)
              .map(([tech, version]) => `${labelize(tech)} ${version}`)
              .join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
