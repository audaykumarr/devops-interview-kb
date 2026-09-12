import { labelize } from "./format";
import { pickRepresentativeQuestions } from "@/scripts/lib/guide-question-selection";
import { shuffle, type AnsweredQuestion, type InterviewQuestionEntry, type JobMatchExplanation } from "./interview-session";
import {
  DEPTH_QUESTION_TYPES,
  adjacentTargetsFor,
  expandImpliedStrong,
  extractTagMentions,
  impliesStrongTargetsFor,
  isOwnershipClaim,
  type TechTag,
} from "./tech-taxonomy";

export type EvidenceTier = "strong" | "adjacent" | "absent";
export type RiskLevel = "low" | "high";

export interface JDRequirement {
  tag: TechTag;
  mustHave: boolean;
}

export interface ResumeSkill {
  tag: TechTag;
  isClaim: boolean;
  claimPhrase?: string;
}

export interface RequirementAssessment {
  tag: TechTag;
  label: string;
  mustHave: boolean;
  evidence: EvidenceTier;
  risk: RiskLevel;
  reason: string;
}

export type ExplanationKind = JobMatchExplanation["kind"];

export interface CoverageSummary {
  requestedCount: number;
  producedCount: number;
  uncoveredMustHave: string[];
  note: string | null;
}

export interface JobSpecificBuildResult {
  questionIds: string[];
  explanations: Record<string, JobMatchExplanation>;
  coverage: CoverageSummary;
}

const MUST_HAVE_HEADING = /^(requirements?|must[- ]?haves?|responsibilities|required( skills)?|qualifications|what you.?ll need)\s*:?\s*$/i;
const NICE_TO_HAVE_HEADING = /^(nice[- ]?to[- ]?have|bonus( points)?|preferred( qualifications)?|good to have|pluses?)\s*:?\s*$/i;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function extractJDRequirements(text: string): JDRequirement[] {
  const lines = text.split(/\n/);
  let inNiceSection = false;
  const mustTags: TechTag[] = [];
  const niceTags: TechTag[] = [];
  const seenMust = new Set<TechTag>();
  const seenNice = new Set<TechTag>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (NICE_TO_HAVE_HEADING.test(trimmed)) {
      inNiceSection = true;
      continue;
    }
    if (MUST_HAVE_HEADING.test(trimmed)) {
      inNiceSection = false;
      continue;
    }
    for (const mention of extractTagMentions(trimmed)) {
      if (inNiceSection) {
        if (!seenNice.has(mention.tag)) {
          seenNice.add(mention.tag);
          niceTags.push(mention.tag);
        }
      } else if (!seenMust.has(mention.tag)) {
        seenMust.add(mention.tag);
        mustTags.push(mention.tag);
      }
    }
  }

  const requirements: JDRequirement[] = mustTags.map((tag) => ({ tag, mustHave: true }));
  for (const tag of niceTags) {
    if (!seenMust.has(tag)) requirements.push({ tag, mustHave: false });
  }
  return requirements;
}

export function extractResumeSkills(text: string): ResumeSkill[] {
  return extractTagMentions(text).map((mention) => {
    const claim = isOwnershipClaim(mention.sentence);
    return {
      tag: mention.tag,
      isClaim: claim,
      claimPhrase: claim ? truncate(mention.sentence, 140) : undefined,
    };
  });
}

function classifyEvidence(
  tag: TechTag,
  directResumeTags: ReadonlySet<TechTag>,
  strongResumeTags: ReadonlySet<TechTag>,
): { evidence: EvidenceTier; reason: string } {
  const label = labelize(tag);

  if (directResumeTags.has(tag)) {
    return { evidence: "strong", reason: `Your resume mentions ${label} directly.` };
  }
  if (strongResumeTags.has(tag)) {
    const source = Array.from(directResumeTags).find((t) => impliesStrongTargetsFor(t).includes(tag));
    return {
      evidence: "strong",
      reason: source ? `Your resume mentions ${labelize(source)}, which counts as ${label}.` : `Your resume shows strong evidence of ${label}.`,
    };
  }
  const adjacentSource = Array.from(directResumeTags).find((t) => adjacentTargetsFor(t).includes(tag));
  if (adjacentSource) {
    return {
      evidence: "adjacent",
      reason: `Your resume mentions ${labelize(adjacentSource)} — a related but different tool from ${label}.`,
    };
  }
  return { evidence: "absent", reason: `No mention of ${label} found in your resume.` };
}

function riskFor(evidence: EvidenceTier): RiskLevel {
  return evidence === "strong" ? "low" : "high";
}

export function buildRequirementAssessments(requirements: JDRequirement[], resumeSkills: ResumeSkill[]): RequirementAssessment[] {
  const directResumeTags = new Set(resumeSkills.map((s) => s.tag));
  const strongResumeTags = expandImpliedStrong(directResumeTags);

  return requirements.map((req) => {
    const { evidence, reason } = classifyEvidence(req.tag, directResumeTags, strongResumeTags);
    return {
      tag: req.tag,
      label: labelize(req.tag),
      mustHave: req.mustHave,
      evidence,
      risk: riskFor(evidence),
      reason,
    };
  });
}

const MUST_HAVE_WEIGHT = 2;
const NICE_TO_HAVE_WEIGHT = 1;
const GAP_MULTIPLIER: Record<EvidenceTier, number> = { absent: 1.5, adjacent: 1.2, strong: 0.8 };

function requirementWeight(a: RequirementAssessment): number {
  return (a.mustHave ? MUST_HAVE_WEIGHT : NICE_TO_HAVE_WEIGHT) * GAP_MULTIPLIER[a.evidence];
}

function questionMatchesTag(question: InterviewQuestionEntry, tag: string): boolean {
  return question.technologies.includes(tag) || question.category === tag || question.question_type.includes(tag);
}

function allocateSeats(
  assessments: RequirementAssessment[],
  availableByTag: Map<TechTag, number>,
  count: number,
): { seatsByTag: Map<TechTag, number>; uncoveredMustHave: TechTag[] } {
  const eligible = assessments.filter((a) => (availableByTag.get(a.tag) ?? 0) > 0);
  const byPriority = [...eligible].sort((a, b) => {
    if (a.mustHave !== b.mustHave) return a.mustHave ? -1 : 1;
    return requirementWeight(b) - requirementWeight(a);
  });

  const seatsByTag = new Map<TechTag, number>();
  let remaining = count;

  for (const a of byPriority) {
    if (remaining <= 0) break;
    seatsByTag.set(a.tag, 1);
    remaining -= 1;
  }

  const uncoveredMustHave = byPriority.filter((a) => a.mustHave && !seatsByTag.has(a.tag)).map((a) => a.tag);

  const maxSeatsPerRequirement = Math.max(2, Math.ceil(count * 0.4));
  let progress = true;
  while (remaining > 0 && progress) {
    progress = false;
    for (const a of byPriority) {
      if (remaining <= 0) break;
      const current = seatsByTag.get(a.tag) ?? 0;
      const available = availableByTag.get(a.tag) ?? 0;
      if (current < maxSeatsPerRequirement && current < available) {
        seatsByTag.set(a.tag, current + 1);
        remaining -= 1;
        progress = true;
      }
    }
  }

  return { seatsByTag, uncoveredMustHave };
}

function buildCoverageNote(uncoveredMustHave: TechTag[], noQuestionsAvailable: TechTag[], requestedCount: number): string | null {
  const parts: string[] = [];
  if (uncoveredMustHave.length > 0) {
    const labels = uncoveredMustHave.map(labelize).join(", ");
    parts.push(
      `${uncoveredMustHave.length} JD requirement${uncoveredMustHave.length === 1 ? "" : "s"} — ${labels} — couldn't fit in a ${requestedCount}-question session. Increase the question count to cover more.`,
    );
  }
  if (noQuestionsAvailable.length > 0) {
    const labels = noQuestionsAvailable.map(labelize).join(", ");
    parts.push(`No matching questions were found in the corpus yet for: ${labels}.`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

export function buildJobSpecificSession(
  pool: InterviewQuestionEntry[],
  assessments: RequirementAssessment[],
  resumeSkills: ResumeSkill[],
  count: number,
  recentlySeenIds: ReadonlySet<string> = new Set(),
  shuffleFn: <T>(items: T[]) => T[] = shuffle,
): JobSpecificBuildResult {
  const claimTags = new Set(resumeSkills.filter((s) => s.isClaim).map((s) => s.tag));
  const claimPhraseByTag = new Map(resumeSkills.filter((s) => s.isClaim && s.claimPhrase).map((s) => [s.tag, s.claimPhrase!]));

  const availableByTag = new Map<TechTag, number>();
  for (const a of assessments) {
    availableByTag.set(a.tag, pool.filter((q) => questionMatchesTag(q, a.tag)).length);
  }
  const noQuestionsAvailable = assessments.filter((a) => (availableByTag.get(a.tag) ?? 0) === 0).map((a) => a.tag);

  const { seatsByTag, uncoveredMustHave } = allocateSeats(assessments, availableByTag, count);
  const byPriority = [...assessments].sort((a, b) => requirementWeight(b) - requirementWeight(a));

  const usedIds = new Set<string>();
  const questionIds: string[] = [];
  const explanations: Record<string, JobMatchExplanation> = {};

  for (const assessment of byPriority) {
    const seats = seatsByTag.get(assessment.tag) ?? 0;
    if (seats === 0) continue;

    const candidates = pool.filter((q) => questionMatchesTag(q, assessment.tag) && !usedIds.has(q.id));
    const fresh = candidates.filter((q) => !recentlySeenIds.has(q.id));
    const seen = candidates.filter((q) => recentlySeenIds.has(q.id));

    const isClaimTag = claimTags.has(assessment.tag);
    const pick = (from: InterviewQuestionEntry[], limit: number): InterviewQuestionEntry[] => {
      if (limit <= 0 || from.length === 0) return [];
      if (isClaimTag) {
        const depthFirst = from.filter((q) => q.question_type.some((t) => (DEPTH_QUESTION_TYPES as readonly string[]).includes(t)));
        const rest = from.filter((q) => !depthFirst.includes(q));
        const picked = pickRepresentativeQuestions(shuffleFn(depthFirst), new Set(), limit);
        if (picked.length < limit) picked.push(...pickRepresentativeQuestions(shuffleFn(rest), new Set(), limit - picked.length));
        return picked;
      }
      return pickRepresentativeQuestions(shuffleFn(from), new Set(), limit);
    };

    let selected = pick(fresh, seats);
    if (selected.length < seats) {
      const stillNeeded = seats - selected.length;
      const remainingSeen = seen.filter((q) => !selected.some((s) => s.id === q.id));
      selected = [...selected, ...pick(remainingSeen, stillNeeded)];
    }

    for (const q of selected) {
      usedIds.add(q.id);
      questionIds.push(q.id);
      const kind: ExplanationKind =
        isClaimTag && claimPhraseByTag.has(assessment.tag)
          ? "validating-claim"
          : assessment.risk === "high"
            ? "covering-gap"
            : "core-requirement";
      explanations[q.id] = {
        kind,
        tag: assessment.tag,
        label: assessment.label,
        reason:
          kind === "validating-claim"
            ? `Selected to validate your claim: "${claimPhraseByTag.get(assessment.tag)}"`
            : kind === "covering-gap"
              ? `Selected because ${assessment.label} is required by the JD and ${assessment.evidence === "absent" ? "your resume shows no evidence of it" : "your resume only shows a related but different tool"}.`
              : `Selected because ${assessment.label} is a core JD requirement your resume supports.`,
      };
    }
  }

  return {
    questionIds: shuffleFn(questionIds),
    explanations,
    coverage: {
      requestedCount: count,
      producedCount: questionIds.length,
      uncoveredMustHave,
      note: buildCoverageNote(uncoveredMustHave, noQuestionsAvailable, count),
    },
  };
}

export interface JobFitSummary {
  gapTotal: number;
  gapNailed: number;
  claimTotal: number;
  claimNailed: number;
}

export function computeJobFitSummary(explanations: Record<string, JobMatchExplanation>, answers: AnsweredQuestion[]): JobFitSummary {
  const summary: JobFitSummary = { gapTotal: 0, gapNailed: 0, claimTotal: 0, claimNailed: 0 };
  for (const answer of answers) {
    const explanation = explanations[answer.id];
    if (!explanation) continue;
    if (explanation.kind === "covering-gap") {
      summary.gapTotal += 1;
      if (answer.assessment === "nailed") summary.gapNailed += 1;
    } else if (explanation.kind === "validating-claim") {
      summary.claimTotal += 1;
      if (answer.assessment === "nailed") summary.claimNailed += 1;
    }
  }
  return summary;
}
