"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { labelize } from "@/lib/format";
import {
  DEFAULT_INTERVIEW_CONFIG,
  INTERVIEW_QUESTION_COUNTS,
  TIME_MODES,
  type InterviewQuestionCount,
  type InterviewQuestionEntry,
  type TimeMode,
} from "@/lib/interview-session";
import {
  buildJobSpecificSession,
  buildRequirementAssessments,
  extractJDRequirements,
  extractResumeSkills,
  resumeSkillEvidenceSource,
  MATCH_RULE_LABEL,
  type EvidenceSource,
  type JDRequirement,
  type JobSpecificBuildResult,
  type ResumeSkill,
} from "@/lib/job-match";
import { computeJdFingerprint } from "@/lib/job-readiness";
import { clearJobSessionHistory, loadJobSessionRecordsForFingerprint } from "@/lib/job-readiness-storage";
import { clearJobProfile, loadJobProfile, saveJobProfile } from "@/lib/job-session-storage";
import { extractTextFromFile, MAX_FILE_SIZE_BYTES } from "@/lib/resume-extraction";
import { CANONICAL_TAGS, isCanonicalTag, type TechTag } from "@/lib/tech-taxonomy";
import { JobReadinessPanel } from "./JobReadinessPanel";

const TIME_MODE_LABELS: Record<TimeMode, string> = { off: "Off", "per-question": "Per-question guideline", session: "Session budget" };
const IDENTITY_SHUFFLE = <T,>(items: T[]): T[] => items;

const CHIP_BASE = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm";
const CHIP_ON = "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300";
const CHIP_OFF = "border-slate-300 text-slate-600 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-400";

function SelectChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${CHIP_BASE} ${active ? CHIP_ON : CHIP_OFF}`}>
      {children}
    </button>
  );
}

function RemovableChip({ label, onRemove, removeLabel }: { label: string; onRemove: () => void; removeLabel: string }) {
  return (
    <span className={`${CHIP_BASE} ${CHIP_ON}`}>
      {label}
      <button type="button" onClick={onRemove} aria-label={removeLabel} className="rounded-full text-indigo-500 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-100">
        ×
      </button>
    </span>
  );
}

const EVIDENCE_SOURCE_LABEL: Record<EvidenceSource, string> = { direct: "Direct", inferred: "Inferred", weak: "Weak" };
const EVIDENCE_SOURCE_CLASS: Record<EvidenceSource, string> = {
  direct: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  inferred: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  weak: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

function EvidenceSourceTag({ source }: { source: EvidenceSource }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${EVIDENCE_SOURCE_CLASS[source]}`}>{EVIDENCE_SOURCE_LABEL[source]}</span>;
}

function skillChipLabel(skill: ResumeSkill): string {
  const via = skill.ambiguous && skill.ambiguousSource ? ` (via ${skill.ambiguousSource})` : "";
  return `${labelize(skill.tag)}${via}`;
}

function SkillChip({
  skill,
  isOpen,
  detailId,
  onToggleDetail,
  onRemove,
}: {
  skill: ResumeSkill;
  isOpen: boolean;
  detailId: string;
  onToggleDetail: () => void;
  onRemove: () => void;
}) {
  const source = resumeSkillEvidenceSource(skill);
  const label = skillChipLabel(skill);
  return (
    <span className={`${CHIP_BASE} ${CHIP_ON}`}>
      {label}
      {skill.isClaim ? " ★" : ""}
      <EvidenceSourceTag source={source} />
      {source !== "direct" && (
        <button
          type="button"
          onClick={onToggleDetail}
          aria-expanded={isOpen}
          aria-controls={detailId}
          aria-label={`${isOpen ? "Hide" : "Show"} why ${label} is marked ${EVIDENCE_SOURCE_LABEL[source]}`}
          className="rounded-full border border-indigo-300 px-1.5 text-[11px] leading-4 text-indigo-600 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900"
        >
          ⓘ
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${labelize(skill.tag)} from resume skills`}
        className="rounded-full text-indigo-500 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-100"
      >
        ×
      </button>
    </span>
  );
}

function RiskBadge({ risk }: { risk: "low" | "high" }) {
  return risk === "high" ? (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">High risk</span>
  ) : (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Low risk</span>
  );
}

function EvidenceBadge({ evidence }: { evidence: "strong" | "adjacent" | "absent" }) {
  const label = evidence === "strong" ? "Strong evidence" : evidence === "adjacent" ? "Adjacent evidence" : "Absent";
  return <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">{label}</span>;
}

function AddTagControl({ existingTags, onAdd, label }: { existingTags: ReadonlySet<string>; onAdd: (tag: TechTag) => void; label: string }) {
  const [value, setValue] = useState("");
  const options = CANONICAL_TAGS.filter((t) => !existingTags.has(t));
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <option value="">Add a skill…</option>
        {options.map((t) => (
          <option key={t} value={t}>
            {labelize(t)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!value}
        onClick={() => {
          if (value && isCanonicalTag(value)) {
            onAdd(value);
            setValue("");
          }
        }}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-600 hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400"
      >
        Add
      </button>
    </div>
  );
}

export function JobSpecificSetup({
  pool,
  recentlySeenIds,
  onBuild,
}: {
  pool: InterviewQuestionEntry[];
  recentlySeenIds: ReadonlySet<string>;
  onBuild: (result: JobSpecificBuildResult, count: InterviewQuestionCount, timeMode: TimeMode, jdFingerprint: string) => void;
}) {
  const savedProfile = useRef(loadJobProfile()).current;
  const [step, setStep] = useState<"input" | "review">(savedProfile ? "review" : "input");
  const [jdText, setJdText] = useState(savedProfile?.jdText ?? "");
  const [resumeText, setResumeText] = useState(savedProfile?.resumeText ?? "");
  const [requirements, setRequirements] = useState<JDRequirement[]>(savedProfile?.requirements ?? []);
  const [resumeSkills, setResumeSkills] = useState<ResumeSkill[]>(savedProfile?.resumeSkills ?? []);
  const [count, setCount] = useState<InterviewQuestionCount>(DEFAULT_INTERVIEW_CONFIG.count);
  const [timeMode, setTimeMode] = useState<TimeMode>(DEFAULT_INTERVIEW_CONFIG.timeMode);
  const [jdFileState, setJdFileState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [resumeFileState, setResumeFileState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [dataCleared, setDataCleared] = useState(false);
  const [openSkillTag, setOpenSkillTag] = useState<TechTag | null>(null);

  useEffect(() => {
    if (step === "review") saveJobProfile({ jdText, resumeText, requirements, resumeSkills });
  }, [step, jdText, resumeText, requirements, resumeSkills]);

  async function handleFile(file: File, target: "jd" | "resume") {
    const setState = target === "jd" ? setJdFileState : setResumeFileState;
    const setText = target === "jd" ? setJdText : setResumeText;
    setState({ busy: true, error: null });
    const result = await extractTextFromFile(file);
    if (result.ok) {
      setText((prev) => (prev.trim() ? `${prev}\n\n${result.text}` : result.text));
      setState({ busy: false, error: null });
    } else {
      setState({ busy: false, error: result.error });
    }
  }

  function proceedToReview() {
    setRequirements(extractJDRequirements(jdText));
    setResumeSkills(extractResumeSkills(resumeText));
    setDataCleared(false);
    setStep("review");
  }

  const assessments = useMemo(() => buildRequirementAssessments(requirements, resumeSkills), [requirements, resumeSkills]);
  const sortedAssessments = useMemo(
    () =>
      [...assessments].sort((a, b) => {
        if (a.risk !== b.risk) return a.risk === "high" ? -1 : 1;
        if (a.mustHave !== b.mustHave) return a.mustHave ? -1 : 1;
        return a.label.localeCompare(b.label);
      }),
    [assessments],
  );

  const preview = useMemo(
    () => buildJobSpecificSession(pool, assessments, resumeSkills, count, recentlySeenIds, IDENTITY_SHUFFLE),
    [pool, assessments, resumeSkills, count, recentlySeenIds],
  );

  const jdFingerprint = useMemo(() => computeJdFingerprint(jdText), [jdText]);
  const readinessRecords = useMemo(() => loadJobSessionRecordsForFingerprint(jdFingerprint), [jdFingerprint]);

  function handleClearData() {
    clearJobProfile();
    clearJobSessionHistory();
    setJdText("");
    setResumeText("");
    setRequirements([]);
    setResumeSkills([]);
    setStep("input");
    setDataCleared(true);
  }

  function buildInterview() {
    const result = buildJobSpecificSession(pool, assessments, resumeSkills, count, recentlySeenIds);
    onBuild(result, count, timeMode, jdFingerprint);
  }

  const requirementTags = new Set(requirements.map((r) => r.tag));
  const skillTags = new Set(resumeSkills.map((s) => s.tag));

  if (step === "input") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste (or upload) the job description and your resume. Everything here stays in your browser — nothing is uploaded to a server.
        </p>

        {dataCleared && <p className="text-sm text-emerald-700 dark:text-emerald-400">Your saved JD/resume data has been cleared.</p>}

        <div>
          <label htmlFor="jd-text" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Job description
          </label>
          <textarea
            id="jd-text"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={8}
            placeholder="Paste the job description here…"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-400">
              Upload a file (.txt, .pdf, .docx)
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "jd")}
              />
            </label>
            {jdFileState.busy && <span className="text-sm text-slate-500 dark:text-slate-400">Reading file…</span>}
          </div>
          {jdFileState.error && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{jdFileState.error}</p>}
        </div>

        <div>
          <label htmlFor="resume-text" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Your resume <span className="font-normal text-slate-500 dark:text-slate-400">(optional — leave blank to see the JD's requirements with no evidence assumed)</span>
          </label>
          <textarea
            id="resume-text"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={8}
            placeholder="Paste your resume here…"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-indigo-400 dark:border-slate-700 dark:text-slate-400">
              Upload a file (.txt, .pdf, .docx)
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "resume")}
              />
            </label>
            {resumeFileState.busy && <span className="text-sm text-slate-500 dark:text-slate-400">Reading file…</span>}
          </div>
          {resumeFileState.error && <p className="mt-1 text-sm text-rose-600 dark:text-rose-400">{resumeFileState.error}</p>}
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Files up to {(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)} MB.</p>
        </div>

        <button
          type="button"
          onClick={proceedToReview}
          disabled={!jdText.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review Extracted Skills
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Detected JD Requirements</h2>
        <button type="button" onClick={() => setStep("input")} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          Edit JD / resume text
        </button>
      </div>

      <JobReadinessPanel assessments={assessments} resumeSkills={resumeSkills} records={readinessRecords} pool={pool} />

      <div>
        <div className="flex flex-wrap gap-2">
          {requirements.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No skills detected — add some below.</p>}
          {requirements.map((r) => (
            <RemovableChip
              key={r.tag}
              label={`${labelize(r.tag)}${r.mustHave ? "" : " (nice to have)"}`}
              removeLabel={`Remove ${labelize(r.tag)} from JD requirements`}
              onRemove={() => setRequirements((prev) => prev.filter((x) => x.tag !== r.tag))}
            />
          ))}
        </div>
        <AddTagControl existingTags={requirementTags} label="Add a JD requirement" onAdd={(tag) => setRequirements((prev) => [...prev, { tag, mustHave: true }])} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Detected Resume Skills</h2>
        {resumeSkills.some((s) => s.isClaim) && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            ★ marks a resume claim — ownership or leadership language like "architected" or "led" — so expect a deeper question to check it holds up.
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {resumeSkills.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No skills detected in your resume.</p>}
          {resumeSkills.map((s) => (
            <SkillChip
              key={s.tag}
              skill={s}
              isOpen={openSkillTag === s.tag}
              detailId="resume-skill-detail-panel"
              onToggleDetail={() => setOpenSkillTag((prev) => (prev === s.tag ? null : s.tag))}
              onRemove={() => {
                setResumeSkills((prev) => prev.filter((x) => x.tag !== s.tag));
                setOpenSkillTag((prev) => (prev === s.tag ? null : prev));
              }}
            />
          ))}
        </div>
        {openSkillTag &&
          (() => {
            const skill = resumeSkills.find((s) => s.tag === openSkillTag);
            if (!skill) return null;
            const source = resumeSkillEvidenceSource(skill);
            return (
              <div
                id="resume-skill-detail-panel"
                role="region"
                aria-label={`Evidence detail for ${labelize(skill.tag)}`}
                className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              >
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {skillChipLabel(skill)} — {EVIDENCE_SOURCE_LABEL[source]}
                </p>
                <p className="mt-1">Your resume said: {skill.matchedSentence ? `"${skill.matchedSentence}"` : "no exact sentence was captured."}</p>
                <p className="mt-1">
                  {source === "inferred"
                    ? `${skill.ambiguousSource ?? "This mention"} doesn't confirm ${labelize(skill.tag)} specifically — it's an inferred, not a direct, match.`
                    : "The wording here limits how strong this evidence is — it isn't treated the same as a direct, unhedged mention."}
                </p>
              </div>
            );
          })()}
        <AddTagControl existingTags={skillTags} label="Add a resume skill" onAdd={(tag) => setResumeSkills((prev) => [...prev, { tag, isClaim: false }])} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Interview Risk / Focus Areas</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Why this interview will emphasize what it emphasizes.</p>
        <div className="mt-3 space-y-2">
          {sortedAssessments.map((a) => (
            <div key={a.tag} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.label}</span>
                {a.mustHave && <span className="text-xs text-slate-400 dark:text-slate-500">must-have</span>}
                <RiskBadge risk={a.risk} />
                <EvidenceBadge evidence={a.evidence} />
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-500">Match: {MATCH_RULE_LABEL[a.matchRule]}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{a.reason}</p>
            </div>
          ))}
          {sortedAssessments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Add at least one JD requirement to see a risk breakdown.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Number of Questions</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTERVIEW_QUESTION_COUNTS.map((c) => (
            <SelectChip key={c} active={count === c} onClick={() => setCount(c)}>
              {c}
            </SelectChip>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Time Limit</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIME_MODES.map((t) => (
            <SelectChip key={t} active={timeMode === t} onClick={() => setTimeMode(t)}>
              {TIME_MODE_LABELS[t]}
            </SelectChip>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {preview.questionIds.length === 0
            ? "No questions match these skills yet."
            : preview.coverage.producedCount < count
              ? `Only ${preview.coverage.producedCount} question${preview.coverage.producedCount === 1 ? "" : "s"} could be built for this mix — starting with ${preview.coverage.producedCount}.`
              : `This session will use ${preview.coverage.producedCount} questions, weighted toward your highest-risk areas.`}
        </p>
        {preview.coverage.note && <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{preview.coverage.note}</p>}
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={buildInterview}
            disabled={preview.questionIds.length === 0}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Build My Interview
          </button>
          <button type="button" onClick={handleClearData} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Clear My Data
          </button>
        </div>
      </div>
    </div>
  );
}
