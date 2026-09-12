import type { JDRequirement, ResumeSkill } from "./job-match";

const JOB_PROFILE_KEY = "job-specific-profile";

export interface JobSpecificProfile {
  jdText: string;
  resumeText: string;
  requirements: JDRequirement[];
  resumeSkills: ResumeSkill[];
}

function isRequirementArray(value: unknown): value is JDRequirement[] {
  return Array.isArray(value) && value.every((v) => v && typeof v === "object" && typeof (v as JDRequirement).tag === "string");
}

function isResumeSkillArray(value: unknown): value is ResumeSkill[] {
  return Array.isArray(value) && value.every((v) => v && typeof v === "object" && typeof (v as ResumeSkill).tag === "string");
}

export function parseJobProfile(raw: string | null): JobSpecificProfile | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<JobSpecificProfile>;
    if (
      typeof candidate.jdText !== "string" ||
      typeof candidate.resumeText !== "string" ||
      !isRequirementArray(candidate.requirements) ||
      !isResumeSkillArray(candidate.resumeSkills)
    ) {
      return null;
    }
    return { jdText: candidate.jdText, resumeText: candidate.resumeText, requirements: candidate.requirements, resumeSkills: candidate.resumeSkills };
  } catch {
    return null;
  }
}

export function loadJobProfile(): JobSpecificProfile | null {
  try {
    return parseJobProfile(localStorage.getItem(JOB_PROFILE_KEY));
  } catch {
    return null;
  }
}

export function saveJobProfile(profile: JobSpecificProfile): void {
  try {
    localStorage.setItem(JOB_PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

export function clearJobProfile(): void {
  try {
    localStorage.removeItem(JOB_PROFILE_KEY);
  } catch {}
}
