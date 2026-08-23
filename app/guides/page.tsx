import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GuideCard } from "@/components/GuideCard";
import { JsonLd } from "@/components/JsonLd";
import { getAllGuides } from "@/lib/guides";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = buildMetadata({
  title: "DevOps Interview Guides",
  description: "Structured preparation guides that sequence and prioritize the question bank by topic and interview level — what to learn, in what order, and what to practice.",
  path: "/guides",
});

export default function GuidesIndexPage() {
  const guides = getAllGuides().filter((g) => g.status === "published");
  // A guide spanning more than one category has no single technology home — it's an
  // umbrella preparation map rather than a focused deep-dive, so it's surfaced first
  // and separately. This is derived from `categories.length`, not a hardcoded guide id,
  // so it stays correct if another umbrella guide is ever added.
  const umbrellaGuides = guides.filter((g) => g.categories.length > 1);
  const focusedGuides = guides.filter((g) => g.categories.length === 1);

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Guides" }])} />
      {guides.length > 0 && (
        <JsonLd
          data={itemListJsonLd({
            name: "DevOps Interview Guides",
            items: guides.map((g) => ({ title: g.title, url: g.url })),
          })}
        />
      )}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Guides" }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">DevOps Interview Guides</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        A guide doesn&apos;t answer interview questions for you — it tells you what to learn, in what order, and
        which questions in the bank actually matter for the role you&apos;re preparing for.
      </p>

      {guides.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No guides published yet.
        </p>
      ) : (
        <>
          {umbrellaGuides.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Start Here</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                A map across the entire question bank — prioritize which focused guide to go deep on next.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4">
                {umbrellaGuides.map((guide) => (
                  <GuideCard key={guide.id} guide={guide} />
                ))}
              </div>
            </div>
          )}

          {focusedGuides.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Focused Technology Guides</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Deep dives into a single technology&apos;s interview questions, sequenced by their own learning path.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {focusedGuides.map((guide) => (
                  <GuideCard key={guide.id} guide={guide} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
