"use client";

import Link from "next/link";
import { SELF_ASSESSMENT_LABELS, type InterviewQuestionEntry } from "@/lib/interview-session";
import {
  computeClaimValidationStatuses,
  computeJobReadiness,
  computeRequirementPerformance,
  recommendNextPractice,
  type JobSessionRecord,
  type ReadinessBand,
} from "@/lib/job-readiness";
import type { RequirementAssessment, ResumeSkill } from "@/lib/job-match";

const BAND_LABEL: Record<ReadinessBand, string> = { low: "Low", developing: "Developing", solid: "Solid", strong: "Strong" };
const BAND_CLASS: Record<ReadinessBand, string> = {
  low: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  developing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  solid: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  strong: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

function BandBadge({ band }: { band: ReadinessBand }) {
  return <span className={`rounded-full px-3 py-1 text-sm font-semibold ${BAND_CLASS[band]}`}>{BAND_LABEL[band]} readiness</span>;
}

export function JobReadinessPanel({
  assessments,
  resumeSkills,
  records,
  pool,
}: {
  assessments: RequirementAssessment[];
  resumeSkills: ResumeSkill[];
  records: JobSessionRecord[];
  pool: InterviewQuestionEntry[];
}) {
  if (assessments.length === 0) return null;

  const readiness = computeJobReadiness(assessments, records);
  const performance = computeRequirementPerformance(assessments, records);
  const claims = computeClaimValidationStatuses(resumeSkills, records);
  const answeredIds = new Set(records.flatMap((r) => r.answers.map((a) => a.id)));
  const recommendations = recommendNextPractice(assessments, performance, pool, answeredIds);

  const performanceByTag = new Map(performance.map((p) => [p.tag, p]));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Job Readiness</h2>
          <BandBadge band={readiness.band} />
          <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{readiness.combinedPercent}%</span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Resume coverage {readiness.coveragePercent}%
          {readiness.performancePercent === null
            ? " · complete an interview session for this JD to add a performance-informed component"
            : ` · interview performance ${readiness.performancePercent}% (${readiness.testedTagCount} of ${readiness.totalTagCount} JD requirements tested so far)`}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          Based on your resume text and your own self-assessment during practice — not a graded or verified evaluation. Answering a question well here doesn&apos;t verify
          real-world experience, and a strong score in one area never cancels out a real gap in another.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">By Requirement</h3>
        <div className="mt-2 space-y-2">
          {assessments.map((a) => {
            const perf = performanceByTag.get(a.tag);
            return (
              <div key={a.tag} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{a.label}</span>
                  <span
                    className={
                      a.evidence === "strong"
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    }
                  >
                    {a.evidence === "strong" ? "Resume: strong evidence" : a.evidence === "adjacent" ? "Resume: adjacent evidence" : "Resume: no evidence"}
                  </span>
                </div>
                <span className="text-slate-500 dark:text-slate-400">
                  {!perf || !perf.tested
                    ? "Not tested yet"
                    : `${perf.nailed} nailed · ${perf.partial} partial · ${perf.needsWork} needs work${perf.total === 1 ? " (based on 1 question)" : ` (of ${perf.total})`}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {claims.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Resume Claim Validation</h3>
          <div className="mt-2 space-y-2">
            {claims.map((c) => (
              <div key={c.tag} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{c.label}</span> — resume evidence: &quot;{c.claimPhrase}&quot;
                </p>
                <p className="mt-1">
                  {c.status === "not-yet-validated" ? (
                    <span className="font-medium text-amber-700 dark:text-amber-400">Not yet validated — run a Job-Specific session to test this claim.</span>
                  ) : (
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Interview evidence: {SELF_ASSESSMENT_LABELS[c.outcome!]} (self-assessed, not verified)
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Practice Next</h3>
          <div className="mt-2 space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.tag} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="font-medium text-slate-900 dark:text-slate-100">{rec.label}</p>
                <p className="text-slate-500 dark:text-slate-400">{rec.reason}</p>
                <ul className="mt-2 space-y-1">
                  {rec.questions.map((question) => (
                    <li key={question.id}>
                      <Link href={question.url} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        {question.question.length > 100 ? `${question.question.slice(0, 100)}…` : question.question}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
