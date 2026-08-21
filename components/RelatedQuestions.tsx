import Link from "next/link";
import type { QuestionIndexEntry } from "@/lib/questions";
import { DifficultyBadge } from "./Badge";

export function RelatedQuestions({
  items,
}: {
  items: { entry: QuestionIndexEntry; suggested: boolean }[];
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="related-questions-heading" className="mt-10">
      <h2 id="related-questions-heading" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        Related Questions
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map(({ entry, suggested }) => (
          <li key={entry.id}>
            <Link
              href={entry.url}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <span className="text-slate-800 dark:text-slate-200">{entry.title}</span>
              <span className="flex shrink-0 items-center gap-2">
                {suggested && (
                  <span className="text-xs text-slate-400 dark:text-slate-500" title="Suggested by similarity, not manually curated">
                    Suggested
                  </span>
                )}
                <DifficultyBadge difficulty={entry.difficulty} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
