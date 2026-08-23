"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RoadmapStageDetail } from "@/lib/roadmaps";
import {
  computeStageStatus,
  loadPracticeProgress,
  loadRoadmapProgress,
  saveRoadmapProgress,
  type StageStatus,
} from "@/lib/roadmap-progress";
import { InlineMarkdown } from "./InlineMarkdown";
import { labelize } from "@/lib/format";

const STATUS_CONFIG: Record<StageStatus, { icon: string; label: string; className: string }> = {
  completed:
    { icon: "✓", label: "Completed", className: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30" },
  "in-progress":
    { icon: "→", label: "In Progress", className: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-500/30" },
  "not-started":
    { icon: "○", label: "Not Started", className: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-600/10 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-500/20" },
};

const LINK_ROW = "-my-1 block py-1 text-sm text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400";

export function RoadmapStages({
  stages,
  questionCategoryById,
}: {
  stages: RoadmapStageDetail[];
  questionCategoryById: Record<string, string>;
}) {
  const [completedStageIds, setCompletedStageIds] = useState<Set<string>>(new Set());
  const [practiceProgress, setPracticeProgress] = useState<Record<string, string>>({});

  useEffect(() => {
    setCompletedStageIds(loadRoadmapProgress());
    setPracticeProgress(loadPracticeProgress());
  }, []);

  const categoryMap = useMemo(() => new Map(Object.entries(questionCategoryById)), [questionCategoryById]);
  const stageIdSet = useMemo(() => new Set(stages.map((s) => s.id)), [stages]);
  const titleById = useMemo(() => new Map(stages.map((s) => [s.id, s.title])), [stages]);

  // Stale ids (a stage removed since the browser last saved progress) simply never match here.
  const validCompletedCount = Array.from(completedStageIds).filter((id) => stageIdSet.has(id)).length;
  const percent = stages.length > 0 ? Math.round((validCompletedCount / stages.length) * 100) : 0;

  function toggleComplete(stageId: string) {
    const next = new Set(completedStageIds);
    if (next.has(stageId)) next.delete(stageId);
    else next.add(stageId);
    setCompletedStageIds(next);
    saveRoadmapProgress(next);
  }

  return (
    <div>
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">Progress</span>
          <span className="text-slate-500 dark:text-slate-400">
            {percent}% ({validCompletedCount} of {stages.length} stages)
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Roadmap completion progress"
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <nav aria-label="Jump to a stage" className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {stages.map((stage, i) => (
          <a key={stage.id} href={`#${stage.id}`} className="-my-1 py-1 text-indigo-600 hover:underline dark:text-indigo-400">
            {i + 1}. {stage.title}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {stages.map((stage, i) => {
          const status = computeStageStatus(stage.id, stage.categories, completedStageIds, practiceProgress, categoryMap);
          const config = STATUS_CONFIG[status];

          return (
            <div
              key={stage.id}
              id={stage.id}
              className="scroll-mt-20 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    Stage {i + 1} of {stages.length}
                  </span>
                  <h3 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">{stage.title}</h3>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
                  <span aria-hidden="true">{config.icon}</span> {config.label}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {stage.question_count} {stage.question_count === 1 ? "question" : "questions"} in this stage&apos;s category pool
              </p>

              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <InlineMarkdown content={stage.description} />
              </p>

              {stage.prerequisites.length > 0 && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Prerequisites: {stage.prerequisites.map((id) => titleById.get(id) ?? id).join(", ")}
                </p>
              )}

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Why It Matters</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  <InlineMarkdown content={stage.whyItMatters} />
                </p>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">What to Learn</h4>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                  {stage.learningObjectives.map((objective, idx) => (
                    <li key={idx}>
                      <InlineMarkdown content={objective} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resources</h4>
                <ul className="mt-1.5 space-y-1">
                  {stage.relatedGuidesResolved.map((guide) => (
                    <li key={guide.id}>
                      <Link href={guide.url} className={LINK_ROW}>
                        {guide.title} →
                      </Link>
                    </li>
                  ))}
                  {stage.categories.map((category) => (
                    <li key={category}>
                      <Link href={`/${category}`} className={LINK_ROW}>
                        {labelize(category)} questions →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {stage.checkpointQuestionsResolved.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Checkpoint Questions</h4>
                  <ul className="mt-1.5 space-y-1">
                    {stage.checkpointQuestionsResolved.map((q) => (
                      <li key={q.id}>
                        <Link href={q.url} className={LINK_ROW}>
                          {q.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stage.representativeQuestionsResolved.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Representative Practice</h4>
                  <ul className="mt-1.5 space-y-1">
                    {stage.representativeQuestionsResolved.map((q) => (
                      <li key={q.id}>
                        <Link href={q.url} className={LINK_ROW}>
                          {q.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Ready to Move On When...</h4>
                <ul className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {stage.completionCriteria.map((criterion, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-0.5 text-slate-400 dark:text-slate-500">
                        ☐
                      </span>
                      <span>
                        <InlineMarkdown content={criterion} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <label className="mt-5 flex w-fit items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={completedStageIds.has(stage.id)}
                  onChange={() => toggleComplete(stage.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
                />
                Mark this stage complete
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
