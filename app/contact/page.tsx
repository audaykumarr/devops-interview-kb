import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: "Get in touch about DevOps Interview Knowledge Base, or contribute a question directly on GitHub.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Contact" }])} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contact</h1>
      <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
        Questions, corrections, or suggestions for new interview topics are all welcome.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href="mailto:contact@devopsinterviewkb.com"
          className="block rounded-lg border border-slate-200 p-5 hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-500"
        >
          <p className="font-semibold text-slate-900 dark:text-slate-100">Email</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">contact@devopsinterviewkb.com</p>
        </a>

        <a
          href="https://github.com/audaykumarr/devops-interview-kb/issues/new"
          className="block rounded-lg border border-slate-200 p-5 hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-500"
        >
          <p className="font-semibold text-slate-900 dark:text-slate-100">Open an issue</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Best for a specific correction, a broken link, or a new question topic.
          </p>
        </a>
      </div>

      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        For a direct content contribution, see{" "}
        <a
          href="https://github.com/audaykumarr/devops-interview-kb/blob/main/CONTRIBUTING.md"
          className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700 dark:decoration-slate-700 dark:hover:text-slate-200"
        >
          CONTRIBUTING.md
        </a>
        .
      </p>
    </div>
  );
}
