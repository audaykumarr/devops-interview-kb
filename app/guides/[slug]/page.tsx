import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Badge } from "@/components/Badge";
import { GuidePracticeQuestions } from "@/components/GuidePracticeQuestions";
import { JsonLd } from "@/components/JsonLd";
import { MarkdownSection } from "@/components/MarkdownSection";
import { ShareButton } from "@/components/ShareButton";
import { formatDate, labelize } from "@/lib/format";
import { getAllGuides, getGuideDetail, getGuideQuestions } from "@/lib/guides";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, techArticleJsonLd } from "@/lib/structured-data";
import type { GuideDomain } from "@/scripts/lib/guide-domains";

/**
 * Optional per-guide subcategory sequence for the "By Subcategory" cards, so
 * that ordering can mirror a guide's own Learning / Interview Path without
 * adding a schema field or hardcoding guide-specific knowledge into the
 * shared GuidePracticeQuestions component. Guides not listed here fall back
 * to largest-group-first.
 */
const SUBCATEGORY_ORDER: Record<string, string[]> = {
  "kubernetes-interview-guide": [
    "fundamentals",
    "workloads",
    "scheduling",
    "resource-management",
    "autoscaling",
    "networking",
    "storage",
    "configuration",
    "rbac-security",
    "cluster-security",
    "admission-control",
    "crds-operators",
    "architecture",
    "troubleshooting",
  ],
  "aws-devops-interview-guide": ["iam", "lambda", "s3"],
  "terraform-interview-guide": ["providers", "modules", "state"],
  "gcp-interview-guide": ["iam", "storage", "cloud-functions"],
};

/**
 * Domain configuration for multi-category umbrella guides (see
 * scripts/lib/guide-domains.ts for the reusable abstraction this is an
 * instance of). Only the DevOps Interview Guide uses this today; a
 * single-category guide leaves this undefined and keeps its existing "By
 * Subcategory" behavior entirely unchanged.
 */
const DOMAIN_CONFIGURATIONS: Record<string, GuideDomain[]> = {
  "devops-interview-guide": [
    {
      id: "foundations",
      name: "Foundations",
      categories: ["devops-fundamentals", "linux", "bash", "python", "yaml"],
      description: "Core concepts, Linux, scripting, and config formats every other domain assumes.",
    },
    {
      id: "source-control",
      name: "Source Control & Collaboration",
      categories: ["git", "github", "gitlab"],
      description: "Git internals, recovery, and platform-level repository governance.",
    },
    {
      id: "cicd",
      name: "CI/CD",
      categories: ["cicd", "github-actions", "gitlab-ci", "jenkins", "azure-pipelines"],
      description: "Pipeline design, deployment strategy, and platform-specific CI/CD mechanics.",
    },
    {
      id: "containers",
      name: "Containers",
      categories: ["docker", "containers"],
      description: "Container runtime internals, networking, and volume/storage behavior.",
    },
    {
      id: "orchestration",
      name: "Orchestration",
      categories: ["kubernetes", "helm"],
      description: "Kubernetes and its packaging ecosystem — the largest domain in this bank.",
    },
    {
      id: "iac",
      name: "Infrastructure as Code",
      categories: ["terraform", "infrastructure-as-code", "ansible"],
      description: "Terraform, tool-agnostic IaC practice, and configuration management.",
    },
    {
      id: "cloud",
      name: "Cloud",
      categories: ["aws", "azure", "gcp", "cloud-fundamentals", "cloud-architecture"],
      description: "Provider-specific depth across the major clouds, plus cross-cloud architecture.",
    },
    {
      id: "security",
      name: "Security",
      categories: ["security", "devsecops"],
      description: "Access control, secrets, supply chain, and shifting security into the pipeline.",
    },
    {
      id: "observability-sre",
      name: "Observability & SRE",
      categories: ["monitoring", "observability", "sre"],
      description: "Metrics, logs, traces, alerting design, and SRE practice.",
    },
    {
      id: "gitops",
      name: "GitOps",
      categories: ["gitops", "argocd"],
      description: "Git-as-source-of-truth deployment, and Argo CD mechanics specifically.",
    },
    {
      id: "platform-engineering",
      name: "Platform Engineering",
      categories: ["platform-engineering"],
      description: "Internal developer platforms, golden paths, and platform-as-product thinking.",
    },
    {
      id: "networking",
      name: "Networking",
      categories: ["networking"],
      description: "DNS, load balancing, and the networking failures that show up in production.",
    },
    {
      id: "databases",
      name: "Databases",
      categories: ["databases"],
      description: "Replication, availability, and the consistency trade-offs interviews probe.",
    },
    {
      id: "architecture",
      name: "Architecture & System Design",
      categories: ["system-design"],
      description: "Open-ended system design problems spanning multiple domains at once.",
    },
    {
      id: "scenarios",
      name: "Real-World Scenarios",
      categories: ["scenarios"],
      description: "Judgment calls with no single right answer — legacy systems and real trade-offs.",
    },
    {
      id: "troubleshooting-methodology",
      name: "Troubleshooting",
      categories: ["troubleshooting"],
      description: "General incident-investigation methodology, distinct from any one technology's own troubleshooting content.",
    },
  ],
};

/** Sections rendered generically via MarkdownSection; "Practice Questions" and "Related Guides" get dedicated, data-driven rendering below. */
const PROSE_SECTIONS = [
  "Introduction",
  "Who This Guide Is For",
  "Prerequisites",
  "Learning / Interview Path",
  "Key Concepts",
  "Interview Focus",
  "Scenario & Troubleshooting Focus",
  "Common Mistakes",
  "Recommended Preparation Path",
  "References",
];

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllGuides().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = getGuideDetail(slug);
  if (!detail) return {};
  return buildMetadata({
    title: detail.title,
    description: detail.description,
    path: detail.url,
    type: "article",
    noindex: detail.question_count === 0 || detail.status !== "published",
  });
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const detail = getGuideDetail(slug);
  if (!detail) notFound();

  const questions = getGuideQuestions(detail);
  const domains = DOMAIN_CONFIGURATIONS[detail.id];

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }, { name: detail.title }])} />
      <JsonLd
        data={techArticleJsonLd({
          title: detail.title,
          description: detail.description,
          path: detail.url,
          dateModified: detail.last_updated,
        })}
      />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: detail.title }]} />

      <div className="flex items-start justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{detail.title}</h1>
        <ShareButton type="guide" title={detail.title} path={detail.url} />
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{detail.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Badge>{labelize(detail.guide_type)}</Badge>
        <span className="text-xs text-slate-500 dark:text-slate-400">{detail.estimated_reading_minutes} min read</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {questions.length} linked {questions.length === 1 ? "question" : "questions"}
        </span>
      </div>

      <div className="mt-8 space-y-8">
        {PROSE_SECTIONS.filter((heading) => detail.sections[heading]).map((heading) => (
          <section key={heading} aria-labelledby={`section-${heading}`}>
            <h2 id={`section-${heading}`} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {heading}
            </h2>
            <div className="mt-2">
              <MarkdownSection content={detail.sections[heading]!} />
            </div>
          </section>
        ))}

        {detail.sections["Practice Questions"] && (
          <section aria-labelledby="section-practice-questions">
            <h2 id="section-practice-questions" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Practice Questions
            </h2>
            <div className="mt-2">
              <MarkdownSection content={detail.sections["Practice Questions"]!} />
            </div>
            <nav aria-label="Jump to a practice section" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {detail.featuredQuestionsResolved.length > 0 && (
                <a href="#must-practice" className="text-indigo-600 hover:underline dark:text-indigo-400">
                  Must Practice
                </a>
              )}
              <a
                href={domains ? "#by-domain" : "#by-subcategory"}
                className="text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {domains ? "By Domain" : "By Subcategory"}
              </a>
              <a href="#prepare-by-level" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Prepare by Interview Level
              </a>
              <a href="#by-difficulty" className="text-indigo-600 hover:underline dark:text-indigo-400">
                By Difficulty
              </a>
              <a href="#by-question-type" className="text-indigo-600 hover:underline dark:text-indigo-400">
                By Question Type
              </a>
            </nav>
            <div className="mt-6">
              <GuidePracticeQuestions
                guide={detail}
                questions={questions}
                featured={detail.featuredQuestionsResolved}
                subcategoryOrder={SUBCATEGORY_ORDER[detail.id]}
                domains={domains}
              />
            </div>
          </section>
        )}

        {detail.sections["Related Guides"] && (
          <section aria-labelledby="section-related-guides">
            <h2 id="section-related-guides" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Related Guides
            </h2>
            <div className="mt-2">
              <MarkdownSection content={detail.sections["Related Guides"]!} />
            </div>
            {detail.relatedGuidesResolved.length > 0 && (
              <ul className="mt-4 space-y-2">
                {detail.relatedGuidesResolved.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={g.url}
                      className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                    >
                      <span className="text-slate-800 dark:text-slate-200">{g.title}</span>
                      <Badge>{labelize(g.guide_type)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
