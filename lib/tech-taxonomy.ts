export const CANONICAL_TAGS = [
  "aks", "ansible", "app-service", "argocd", "aws", "azure", "azure-functions", "azure-pipelines",
  "bash", "blob-storage", "ci-cd", "cicd", "cloud", "cloud-functions", "cloud-fundamentals",
  "cloud-run", "cloud-storage", "cloudwatch", "containers", "databases", "devops", "devsecops",
  "dns", "docker", "ec2", "ecs", "eks", "etcd", "falco", "gcp", "git", "github", "github-actions",
  "gitlab", "gitlab-ci", "gitops", "gke", "grafana", "helm", "iam", "infrastructure-as-code",
  "istio", "jenkins", "key-vault", "kubernetes", "kustomize", "kyverno", "lambda", "linux",
  "logging", "monitoring", "mysql", "networking", "nodejs", "observability", "oidc", "opa",
  "opentelemetry", "platform-engineering", "postgresql", "prometheus", "pubsub", "python", "s3",
  "security", "sre", "systemd", "terraform", "yaml",
] as const;

export type TechTag = (typeof CANONICAL_TAGS)[number];

const CANONICAL_SET: ReadonlySet<string> = new Set(CANONICAL_TAGS);

export function isCanonicalTag(tag: string): tag is TechTag {
  return CANONICAL_SET.has(tag);
}

const SYNONYMS: Record<string, TechTag> = {
  k8s: "kubernetes",
  kube: "kubernetes",
  "ci/cd": "cicd",
  "ci cd": "cicd",
  iac: "infrastructure-as-code",
  gha: "github-actions",
  "github action": "github-actions",
  "github workflow": "github-actions",
  postgres: "postgresql",
  "node.js": "nodejs",
  "node js": "nodejs",
  "cloud watch": "cloudwatch",
  "open telemetry": "opentelemetry",
  "identity and access management": "iam",
};

const IMPLIES_STRONG: Partial<Record<TechTag, TechTag[]>> = {
  eks: ["kubernetes", "aws"],
  aks: ["kubernetes", "azure"],
  gke: ["kubernetes", "gcp"],
  ec2: ["aws"],
  s3: ["aws"],
  lambda: ["aws"],
  cloudwatch: ["aws"],
  "app-service": ["azure"],
  "azure-functions": ["azure"],
  "blob-storage": ["azure"],
  "key-vault": ["azure"],
  "azure-pipelines": ["azure"],
  "cloud-functions": ["gcp"],
  "cloud-run": ["gcp"],
  "cloud-storage": ["gcp"],
  pubsub: ["gcp"],
  "gitlab-ci": ["gitlab"],
  helm: ["kubernetes"],
  kustomize: ["kubernetes"],
  istio: ["kubernetes"],
  "ci-cd": ["cicd"],
};

const ADJACENT_OF: Partial<Record<TechTag, TechTag[]>> = {
  ecs: ["kubernetes"],
  docker: ["kubernetes"],
  containers: ["kubernetes"],
  ansible: ["terraform"],
  "infrastructure-as-code": ["terraform"],
  jenkins: ["github-actions", "gitlab-ci", "azure-pipelines"],
  "github-actions": ["gitlab-ci", "jenkins", "azure-pipelines"],
  "gitlab-ci": ["github-actions", "jenkins", "azure-pipelines"],
  "azure-pipelines": ["github-actions", "gitlab-ci", "jenkins"],
  cicd: ["jenkins", "github-actions", "gitlab-ci", "azure-pipelines"],
  devsecops: ["security"],
  iam: ["security"],
  oidc: ["security"],
  aws: ["azure", "gcp", "cloud"],
  azure: ["aws", "gcp", "cloud"],
  gcp: ["aws", "azure", "cloud"],
  observability: ["monitoring", "logging", "prometheus", "grafana", "opentelemetry"],
  monitoring: ["observability", "logging", "prometheus", "grafana", "opentelemetry"],
  prometheus: ["monitoring", "observability"],
  grafana: ["monitoring", "observability"],
};

const OWNERSHIP_VERBS = [
  "architected", "re-architected", "rearchitected", "led", "spearheaded", "owned", "drove",
  "designed", "built and maintained", "established", "migrated", "redesigned", "engineered",
  "implemented from scratch", "managed the migration", "built from the ground up",
];

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

const SEARCH_PHRASES_LONGEST_FIRST: { phrase: string; tag: TechTag }[] = [
  ...CANONICAL_TAGS.map((tag) => ({ phrase: normalize(tag), tag })),
  ...Object.entries(SYNONYMS).map(([phrase, tag]) => ({ phrase: normalize(phrase), tag })),
].sort((a, b) => b.phrase.length - a.phrase.length);

export interface TagMention {
  tag: TechTag;
  matchedPhrase: string;
  sentence: string;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\n])\s+/).map((s) => s.trim()).filter(Boolean);
}

export function extractTagMentions(text: string): TagMention[] {
  const sentences = splitSentences(text);
  const found = new Map<TechTag, TagMention>();

  for (const sentence of sentences) {
    let remainingHaystack = normalize(sentence);
    for (const { phrase, tag } of SEARCH_PHRASES_LONGEST_FIRST) {
      if (found.has(tag)) continue;
      if (remainingHaystack.includes(phrase)) {
        found.set(tag, { tag, matchedPhrase: phrase.trim(), sentence: sentence.trim() });
        remainingHaystack = remainingHaystack.split(phrase).join(` ${" ".repeat(Math.max(0, phrase.length - 2))} `);
      }
    }
  }

  return Array.from(found.values());
}

export function expandImpliedStrong(directTags: ReadonlySet<TechTag>): Set<TechTag> {
  const expanded = new Set(directTags);
  for (const tag of directTags) {
    for (const implied of IMPLIES_STRONG[tag] ?? []) expanded.add(implied);
  }
  return expanded;
}

export function adjacentTargetsFor(tag: TechTag): TechTag[] {
  return ADJACENT_OF[tag] ?? [];
}

export function impliesStrongTargetsFor(tag: TechTag): TechTag[] {
  return IMPLIES_STRONG[tag] ?? [];
}

export function isOwnershipClaim(sentence: string): boolean {
  const haystack = sentence.toLowerCase();
  return OWNERSHIP_VERBS.some((verb) => haystack.includes(verb));
}

export const DEPTH_QUESTION_TYPES = ["architecture", "scenario", "troubleshooting"] as const;
