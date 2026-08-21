import Link from "next/link";
import type { QuestionIndexEntry } from "@/lib/questions";
import { DifficultyBadge, TechnologyBadge } from "./Badge";
import { formatMinutes } from "@/lib/format";

export function QuestionCard({ question }: { question: QuestionIndexEntry }) {
  return (
    <Link
      href={question.url}
      className="group block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 sm:p-5"
    >
      <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
        {question.title}
      </h3>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <DifficultyBadge difficulty={question.difficulty} />
        {question.technologies.slice(0, 3).map((tech) => (
          <TechnologyBadge key={tech} technology={tech} />
        ))}
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          {formatMinutes(question.estimated_time_minutes)}
        </span>
      </div>
    </Link>
  );
}
