import Link from "next/link";
import type { GuideIndexEntry } from "@/lib/guides";
import { labelize } from "@/lib/format";
import { Badge } from "./Badge";

export function GuideCard({ guide }: { guide: GuideIndexEntry }) {
  return (
    <Link
      href={guide.url}
      className="group block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="flex items-center gap-2">
        <Badge>{labelize(guide.guide_type)}</Badge>
        <span className="text-xs text-slate-500 dark:text-slate-400">{guide.estimated_reading_minutes} min read</span>
      </div>
      <h3 className="mt-2.5 text-base font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
        {guide.title}
      </h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{guide.description}</p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {guide.question_count} linked {guide.question_count === 1 ? "question" : "questions"}
      </p>
    </Link>
  );
}
