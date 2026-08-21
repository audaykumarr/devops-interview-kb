const ACRONYMS: Record<string, string> = {
  aws: "AWS", iam: "IAM", ec2: "EC2", vpc: "VPC", s3: "S3", ecs: "ECS", eks: "EKS",
  rds: "RDS", cli: "CLI", api: "API", ci: "CI", cd: "CD", "ci-cd": "CI/CD", cicd: "CI/CD",
  aks: "AKS", vm: "VM", vnet: "VNet", nsg: "NSG", oidc: "OIDC", sts: "STS",
  yaml: "YAML", sre: "SRE", gitops: "GitOps", argocd: "Argo CD", devsecops: "DevSecOps",
  k8s: "Kubernetes", sbom: "SBOM", slo: "SLO", sla: "SLA", sli: "SLI", iac: "IaC",
  crd: "CRD", hpa: "HPA", pvc: "PVC", dns: "DNS", cidr: "CIDR", github: "GitHub",
  gitlab: "GitLab", "github-actions": "GitHub Actions", "gitlab-ci": "GitLab CI/CD",
  "infrastructure-as-code": "Infrastructure as Code", "system-design": "System Design",
  "cloud-fundamentals": "Cloud Fundamentals", "cloud-architecture": "Cloud Architecture",
  "platform-engineering": "Platform Engineering", "devops-fundamentals": "DevOps Fundamentals",
  "azure-pipelines": "Azure Pipelines",
};

/** Turns a kebab-case slug into a human-readable label, honoring common DevOps acronyms. */
export function labelize(slug: string): string {
  if (ACRONYMS[slug]) return ACRONYMS[slug];
  return slug
    .split("-")
    .map((word) => ACRONYMS[word] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}

/** Strips common Markdown syntax down to plain text, for JSON-LD/meta description use. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
