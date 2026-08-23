export const INTERVIEW_LEVELS = [
  "junior-devops",
  "devops-engineer",
  "senior-devops",
  "sre",
  "platform-engineer",
  "cloud-engineer",
  "devsecops",
  "staff-principal",
] as const;

export type InterviewLevel = (typeof INTERVIEW_LEVELS)[number];

export const INTERVIEW_LEVEL_LABELS: Record<InterviewLevel, string> = {
  "junior-devops": "Junior DevOps",
  "devops-engineer": "DevOps Engineer",
  "senior-devops": "Senior DevOps",
  sre: "SRE",
  "platform-engineer": "Platform Engineer",
  "cloud-engineer": "Cloud Engineer",
  devsecops: "DevSecOps",
  "staff-principal": "Staff / Principal",
};

const SENIORITY_BY_DIFFICULTY: Record<string, InterviewLevel[]> = {
  beginner: ["junior-devops", "devops-engineer"],
  intermediate: ["devops-engineer", "senior-devops"],
  advanced: ["senior-devops", "staff-principal"],
  expert: ["staff-principal"],
};

const SRE_CATEGORIES = new Set(["sre", "monitoring", "observability"]);
const PLATFORM_CATEGORIES = new Set(["platform-engineering", "gitops", "argocd"]);
const CLOUD_CATEGORIES = new Set(["aws", "azure", "gcp", "cloud-architecture", "cloud-fundamentals"]);
const DEVSECOPS_CATEGORIES = new Set(["devsecops", "security"]);

interface LevelInput {
  category: string;
  difficulty: string;
  question_type: string[];
}

/**
 * Deterministic, rule-based mapping from existing metadata (difficulty,
 * category, question_type) to Interview Level — never hand-authored per
 * question.
 */
export function computeInterviewLevels(entry: LevelInput): InterviewLevel[] {
  const levels = new Set<InterviewLevel>(SENIORITY_BY_DIFFICULTY[entry.difficulty] ?? []);

  if (SRE_CATEGORIES.has(entry.category)) levels.add("sre");
  if (PLATFORM_CATEGORIES.has(entry.category)) levels.add("platform-engineer");
  if (CLOUD_CATEGORIES.has(entry.category)) levels.add("cloud-engineer");
  if (DEVSECOPS_CATEGORIES.has(entry.category) || entry.question_type.includes("security")) {
    levels.add("devsecops");
  }
  if (entry.question_type.includes("system-design")) levels.add("staff-principal");

  return INTERVIEW_LEVELS.filter((l) => levels.has(l));
}
