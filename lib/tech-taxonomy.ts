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
  "amazon ecs": "ecs",
  "amazon eks": "eks",
  "amazon elastic kubernetes service": "eks",
  "elastic container service": "ecs",
  "azure kubernetes service": "aks",
  "google kubernetes engine": "gke",
  "azure devops": "azure-pipelines",
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

const CAPABILITY_CONCEPTS: Partial<Record<string, TechTag[]>> = {
  "container orchestration": ["kubernetes", "ecs", "eks", "aks", "gke"],
  "continuous delivery pipeline": ["github-actions", "gitlab-ci", "jenkins", "azure-pipelines", "cicd"],
  "distributed tracing": ["opentelemetry"],
  "aws container workloads": ["ecs", "eks"],
};

const AMBIGUOUS_PHRASES: Partial<Record<string, { certain?: TechTag[]; possible: TechTag[] }>> = {
  fargate: { certain: ["aws"], possible: ["ecs", "eks"] },
};

const OWNERSHIP_VERBS = [
  "architected", "re-architected", "rearchitected", "led", "spearheaded", "owned", "drove",
  "designed", "built and maintained", "established", "migrated", "redesigned", "engineered",
  "implemented from scratch", "managed the migration", "built from the ground up",
];

const WEAK_SIGNAL_PHRASES = [
  "familiar with", "familiarity with", "exposure to", "some exposure to", "some experience with",
  "basic knowledge of", "basic understanding of", "worked alongside", "assisted with",
  "helped with", "involved in", "supported the",
];

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\n])\s+/).map((s) => s.trim()).filter(Boolean);
}

function scanLongestFirst<T>(
  text: string,
  entries: { phrase: string; value: T }[],
  alreadyFound: (value: T) => boolean,
): { value: T; matchedPhrase: string; sentence: string }[] {
  const sorted = [...entries].sort((a, b) => b.phrase.length - a.phrase.length);
  const sentences = splitSentences(text);
  const results: { value: T; matchedPhrase: string; sentence: string }[] = [];

  for (const sentence of sentences) {
    let remainingHaystack = normalize(sentence);
    for (const { phrase, value } of sorted) {
      if (alreadyFound(value)) continue;
      const pluralPhrase = `${phrase.slice(0, -1)}s `;
      const matched = remainingHaystack.includes(phrase) ? phrase : remainingHaystack.includes(pluralPhrase) ? pluralPhrase : null;
      if (matched) {
        results.push({ value, matchedPhrase: phrase.trim(), sentence: sentence.trim() });
        remainingHaystack = remainingHaystack.split(matched).join(` ${" ".repeat(Math.max(0, matched.length - 2))} `);
      }
    }
  }

  return results;
}

const SEARCH_PHRASES_LONGEST_FIRST: { phrase: string; value: TechTag }[] = [
  ...CANONICAL_TAGS.map((tag) => ({ phrase: normalize(tag), value: tag })),
  ...Object.entries(SYNONYMS).map(([phrase, tag]) => ({ phrase: normalize(phrase), value: tag })),
];

export interface TagMention {
  tag: TechTag;
  matchedPhrase: string;
  sentence: string;
}

export function extractTagMentions(text: string): TagMention[] {
  const found = new Set<TechTag>();
  const results = scanLongestFirst(text, SEARCH_PHRASES_LONGEST_FIRST, (tag) => found.has(tag));
  const mentions: TagMention[] = [];
  for (const r of results) {
    if (found.has(r.value)) continue;
    found.add(r.value);
    mentions.push({ tag: r.value, matchedPhrase: r.matchedPhrase, sentence: r.sentence });
  }
  return mentions;
}

export interface CapabilityMention {
  sourcePhrase: string;
  equivalentTags: TechTag[];
  matchedPhrase: string;
  sentence: string;
}

const CAPABILITY_SEARCH_ENTRIES: { phrase: string; value: string }[] = Object.keys(CAPABILITY_CONCEPTS).map((phrase) => ({
  phrase: normalize(phrase),
  value: phrase,
}));

export function extractCapabilityMentions(text: string): CapabilityMention[] {
  const found = new Set<string>();
  const results = scanLongestFirst(text, CAPABILITY_SEARCH_ENTRIES, (phrase) => found.has(phrase));
  const mentions: CapabilityMention[] = [];
  for (const r of results) {
    if (found.has(r.value)) continue;
    found.add(r.value);
    mentions.push({
      sourcePhrase: r.value,
      equivalentTags: CAPABILITY_CONCEPTS[r.value] ?? [],
      matchedPhrase: r.matchedPhrase,
      sentence: r.sentence,
    });
  }
  return mentions;
}

export interface AmbiguousMention {
  sourcePhrase: string;
  certainTags: TechTag[];
  possibleTags: TechTag[];
  matchedPhrase: string;
  sentence: string;
}

const AMBIGUOUS_SEARCH_ENTRIES: { phrase: string; value: string }[] = Object.keys(AMBIGUOUS_PHRASES).map((phrase) => ({
  phrase: normalize(phrase),
  value: phrase,
}));

export function extractAmbiguousMentions(text: string): AmbiguousMention[] {
  const found = new Set<string>();
  const results = scanLongestFirst(text, AMBIGUOUS_SEARCH_ENTRIES, (phrase) => found.has(phrase));
  const mentions: AmbiguousMention[] = [];
  for (const r of results) {
    if (found.has(r.value)) continue;
    found.add(r.value);
    const entry = AMBIGUOUS_PHRASES[r.value];
    mentions.push({
      sourcePhrase: r.value,
      certainTags: entry?.certain ?? [],
      possibleTags: entry?.possible ?? [],
      matchedPhrase: r.matchedPhrase,
      sentence: r.sentence,
    });
  }
  return mentions;
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

export function isWeakSignal(sentence: string): boolean {
  const haystack = sentence.toLowerCase();
  return WEAK_SIGNAL_PHRASES.some((phrase) => haystack.includes(phrase));
}

export function capabilityConceptPhrases(): string[] {
  return Object.keys(CAPABILITY_CONCEPTS);
}

export const DEPTH_QUESTION_TYPES = ["architecture", "scenario", "troubleshooting"] as const;
