import { labelize } from "./format";
import { pickRepresentativeQuestions } from "@/scripts/lib/guide-question-selection";
import { questionMatchesTag, type RequirementAssessment, type ResumeSkill } from "./job-match";
import type { AnsweredQuestion, InterviewQuestionEntry, JobMatchExplanation, SelfAssessment } from "./interview-session";

export interface JobSessionRecord {
  jdFingerprint: string;
  completedAt: number;
  answers: AnsweredQuestion[];
  explanations: Record<string, JobMatchExplanation>;
}

export function computeJdFingerprint(jdText: string): string {
  const normalized = jdText.toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function explanationFor(record: JobSessionRecord, questionId: string): JobMatchExplanation | undefined {
  return record.explanations[questionId];
}

interface ExplainedAnswer {
  answer: AnsweredQuestion;
  explanation: JobMatchExplanation;
  completedAt: number;
}

function collectExplainedAnswers(records: JobSessionRecord[]): ExplainedAnswer[] {
  const explained: ExplainedAnswer[] = [];
  for (const record of records) {
    for (const answer of record.answers) {
      const explanation = explanationFor(record, answer.id);
      if (explanation) explained.push({ answer, explanation, completedAt: record.completedAt });
    }
  }
  return explained;
}

const ASSESSMENT_CREDIT: Record<SelfAssessment, number> = { nailed: 1, partial: 0.5, "needs-work": 0 };

export interface RequirementPerformance {
  tag: string;
  label: string;
  tested: boolean;
  nailed: number;
  partial: number;
  needsWork: number;
  total: number;
}

export function computeRequirementPerformance(assessments: RequirementAssessment[], records: JobSessionRecord[]): RequirementPerformance[] {
  const explained = collectExplainedAnswers(records);

  return assessments.map((assessment) => {
    const forTag = explained.filter((e) => e.explanation.tag === assessment.tag);
    const nailed = forTag.filter((e) => e.answer.assessment === "nailed").length;
    const partial = forTag.filter((e) => e.answer.assessment === "partial").length;
    const needsWork = forTag.filter((e) => e.answer.assessment === "needs-work").length;
    return {
      tag: assessment.tag,
      label: assessment.label,
      tested: forTag.length > 0,
      nailed,
      partial,
      needsWork,
      total: forTag.length,
    };
  });
}

export type ClaimValidationState = "not-yet-validated" | "interview-evidence";

export interface ClaimValidationStatus {
  tag: string;
  label: string;
  claimPhrase: string;
  status: ClaimValidationState;
  outcome?: SelfAssessment;
}

export function computeClaimValidationStatuses(resumeSkills: ResumeSkill[], records: JobSessionRecord[]): ClaimValidationStatus[] {
  const explained = collectExplainedAnswers(records);

  return resumeSkills
    .filter((skill) => skill.isClaim && skill.claimPhrase)
    .map((skill) => {
      const matches = explained
        .filter((e) => e.explanation.kind === "validating-claim" && e.explanation.tag === skill.tag)
        .sort((a, b) => b.completedAt - a.completedAt);
      const mostRecent = matches[0];
      return {
        tag: skill.tag,
        label: labelize(skill.tag),
        claimPhrase: skill.claimPhrase!,
        status: mostRecent ? "interview-evidence" : "not-yet-validated",
        outcome: mostRecent?.answer.assessment,
      };
    });
}

const MUST_HAVE_CREDIT_WEIGHT = 2;
const NICE_TO_HAVE_CREDIT_WEIGHT = 1;

export function computeCoveragePercent(assessments: RequirementAssessment[]): number {
  if (assessments.length === 0) return 0;
  let earned = 0;
  let possible = 0;
  for (const a of assessments) {
    const weight = a.mustHave ? MUST_HAVE_CREDIT_WEIGHT : NICE_TO_HAVE_CREDIT_WEIGHT;
    possible += weight;
    if (a.evidence === "strong") earned += weight;
  }
  return possible > 0 ? roundToNearest5((earned / possible) * 100) : 0;
}

function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

export type ReadinessBand = "low" | "developing" | "solid" | "strong";
const BAND_ORDER: ReadinessBand[] = ["low", "developing", "solid", "strong"];

function bandFromPercent(percent: number): ReadinessBand {
  if (percent < 35) return "low";
  if (percent < 60) return "developing";
  if (percent < 80) return "solid";
  return "strong";
}

function weakerBand(a: ReadinessBand, b: ReadinessBand): ReadinessBand {
  return BAND_ORDER.indexOf(a) <= BAND_ORDER.indexOf(b) ? a : b;
}

export interface JobReadiness {
  band: ReadinessBand;
  coveragePercent: number;
  performancePercent: number | null;
  combinedPercent: number;
  testedTagCount: number;
  totalTagCount: number;
}

export function computeJobReadiness(assessments: RequirementAssessment[], records: JobSessionRecord[]): JobReadiness {
  const coveragePercent = computeCoveragePercent(assessments);
  const requirementPerformance = computeRequirementPerformance(assessments, records);
  const testedTagCount = requirementPerformance.filter((r) => r.tested).length;
  const totalTagCount = assessments.length;

  const explained = collectExplainedAnswers(records).filter((e) => e.explanation.kind === "covering-gap" || e.explanation.kind === "validating-claim");

  if (explained.length === 0) {
    return {
      band: bandFromPercent(coveragePercent),
      coveragePercent,
      performancePercent: null,
      combinedPercent: coveragePercent,
      testedTagCount,
      totalTagCount,
    };
  }

  const totalCredit = explained.reduce((sum, e) => sum + ASSESSMENT_CREDIT[e.answer.assessment], 0);
  const performancePercent = roundToNearest5((totalCredit / explained.length) * 100);
  const combinedPercent = roundToNearest5((coveragePercent + performancePercent) / 2);
  const band = weakerBand(bandFromPercent(coveragePercent), bandFromPercent(performancePercent));

  return { band, coveragePercent, performancePercent, combinedPercent, testedTagCount, totalTagCount };
}

export interface PracticeRecommendation {
  tag: string;
  label: string;
  reason: string;
  questions: { id: string; url: string; question: string }[];
}

export function recommendNextPractice(
  assessments: RequirementAssessment[],
  requirementPerformance: RequirementPerformance[],
  pool: InterviewQuestionEntry[],
  answeredIds: ReadonlySet<string>,
  limit = 5,
  questionsPerTag = 2,
): PracticeRecommendation[] {
  const performanceByTag = new Map(requirementPerformance.map((r) => [r.tag, r]));

  const priorities = assessments
    .filter((a) => a.evidence !== "strong" || (performanceByTag.get(a.tag)?.needsWork ?? 0) > 0 || (performanceByTag.get(a.tag)?.partial ?? 0) > 0)
    .map((a) => {
      const perf = performanceByTag.get(a.tag);
      const untested = !perf || !perf.tested;
      const weak = !!perf && (perf.needsWork > 0 || perf.partial > 0) && perf.nailed === 0;
      const alreadyStrong = !!perf && perf.tested && perf.nailed === perf.total;
      return { assessment: a, untested, weak, alreadyStrong };
    })
    .filter((p) => !p.alreadyStrong)
    .sort((x, y) => {
      if (x.assessment.mustHave !== y.assessment.mustHave) return x.assessment.mustHave ? -1 : 1;
      if (x.untested !== y.untested) return x.untested ? -1 : 1;
      return 0;
    })
    .slice(0, limit);

  return priorities.map(({ assessment, untested }) => {
    const candidates = pool.filter((q) => questionMatchesTag(q, assessment.tag));
    const fresh = candidates.filter((q) => !answeredIds.has(q.id));
    const chosen = pickRepresentativeQuestions(fresh.length > 0 ? fresh : candidates, new Set(), questionsPerTag);
    return {
      tag: assessment.tag,
      label: assessment.label,
      reason: untested
        ? `${assessment.label} hasn't been tested yet in an interview session for this JD.`
        : `${assessment.label} was tested but didn't go well yet — worth another look.`,
      questions: chosen.map((q) => ({ id: q.id, url: q.url, question: q.question })),
    };
  });
}
