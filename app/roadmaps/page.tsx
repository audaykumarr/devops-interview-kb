import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RoadmapCard } from "@/components/RoadmapCard";
import { JsonLd } from "@/components/JsonLd";
import { getAllRoadmaps } from "@/lib/roadmaps";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = buildMetadata({
  title: "DevOps Roadmaps",
  description: "Sequenced learning paths that tell you what to learn, and in what order, to become job-ready for a specific DevOps role.",
  path: "/roadmaps",
});

export default function RoadmapsIndexPage() {
  const roadmaps = getAllRoadmaps().filter((r) => r.status === "published");

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Roadmaps" }])} />
      {roadmaps.length > 0 && (
        <JsonLd
          data={itemListJsonLd({
            name: "DevOps Roadmaps",
            items: roadmaps.map((r) => ({ title: r.title, url: r.url })),
          })}
        />
      )}
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Roadmaps" }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">DevOps Roadmaps</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        A roadmap doesn&apos;t answer interview questions for you — it sequences what to learn, and in what order, for
        a specific target role. Each stage links back to the existing category pages and Guides, so nothing here
        duplicates content that already exists.
      </p>

      {roadmaps.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No roadmaps published yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map((roadmap) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} />
          ))}
        </div>
      )}

      <div className="mt-10 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        More role-specific roadmaps — Cloud Engineer, DevSecOps, SRE, Platform Engineer, and Senior DevOps — are
        planned, built from the categories this first roadmap deliberately leaves out. Not published yet.
      </div>
    </div>
  );
}
