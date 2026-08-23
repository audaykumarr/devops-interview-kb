import Link from "next/link";
import type { RoadmapIndexEntry } from "@/lib/roadmaps";
import { INTERVIEW_LEVEL_LABELS, type InterviewLevel } from "@/scripts/lib/interview-level";
import { Badge } from "./Badge";

export function RoadmapCard({ roadmap }: { roadmap: RoadmapIndexEntry }) {
  return (
    <Link
      href={roadmap.url}
      className="group block rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="flex items-center gap-2">
        <Badge>{INTERVIEW_LEVEL_LABELS[roadmap.target_role as InterviewLevel] ?? roadmap.target_role}</Badge>
        <span className="text-xs text-slate-500 dark:text-slate-400">{roadmap.stages.length} stages</span>
        {roadmap.estimated_duration_weeks && (
          <span className="text-xs text-slate-500 dark:text-slate-400">~{roadmap.estimated_duration_weeks} weeks</span>
        )}
      </div>
      <h3 className="mt-2.5 text-base font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
        {roadmap.title}
      </h3>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{roadmap.description}</p>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {roadmap.question_count} linked {roadmap.question_count === 1 ? "question" : "questions"}
      </p>
    </Link>
  );
}
