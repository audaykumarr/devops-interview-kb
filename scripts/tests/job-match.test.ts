import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildJobSpecificSession,
  buildRequirementAssessments,
  extractJDRequirements,
  extractResumeSkills,
  type RequirementAssessment,
} from "../../lib/job-match";
import type { InterviewQuestionEntry } from "../../lib/interview-session";

function q(overrides: Partial<InterviewQuestionEntry> = {}): InterviewQuestionEntry {
  return {
    id: "fixture-001",
    category: "kubernetes",
    subcategory: "troubleshooting",
    difficulty: "intermediate",
    question_type: ["conceptual"],
    interview_level: ["devops-engineer"],
    technologies: ["kubernetes"],
    question: "Question body",
    shortAnswer: "Short answer body",
    url: "/questions/kubernetes/troubleshooting/fixture",
    ...overrides,
  };
}

test("extractJDRequirements treats an unstructured JD line as all must-have", () => {
  const reqs = extractJDRequirements("We need AWS, Kubernetes, Terraform, GitHub Actions, and Security experience.");
  const tags = reqs.map((r) => r.tag).sort();
  assert.deepEqual(tags, ["aws", "github-actions", "kubernetes", "security", "terraform"]);
  assert.ok(reqs.every((r) => r.mustHave));
});

test("extractJDRequirements separates Requirements from Nice to Have sections", () => {
  const jd = [
    "Requirements:",
    "- AWS",
    "- Terraform",
    "",
    "Nice to have:",
    "- Kubernetes",
    "- Security",
  ].join("\n");
  const reqs = extractJDRequirements(jd);
  const byTag = new Map(reqs.map((r) => [r.tag, r.mustHave]));
  assert.equal(byTag.get("aws"), true);
  assert.equal(byTag.get("terraform"), true);
  assert.equal(byTag.get("kubernetes"), false);
  assert.equal(byTag.get("security"), false);
});

test("extractJDRequirements: a tag mentioned both inside and outside a nice-to-have section stays must-have", () => {
  const jd = ["Must have AWS experience.", "Nice to have:", "- AWS certification"].join("\n");
  const reqs = extractJDRequirements(jd);
  assert.equal(reqs.find((r) => r.tag === "aws")?.mustHave, true);
});

test("extractResumeSkills flags ownership/architecture language as a claim", () => {
  const skills = extractResumeSkills("Architected the Terraform module structure used across all environments.");
  const terraform = skills.find((s) => s.tag === "terraform");
  assert.ok(terraform);
  assert.equal(terraform!.isClaim, true);
  assert.match(terraform!.claimPhrase ?? "", /Architected/);
});

test("extractResumeSkills does not flag a plain mention as a claim", () => {
  const skills = extractResumeSkills("Familiar with Terraform basics.");
  const terraform = skills.find((s) => s.tag === "terraform");
  assert.ok(terraform);
  assert.equal(terraform!.isClaim, false);
});

test("extractResumeSkills resolves a managed-service mention (EKS) to its parent tags at strong confidence", () => {
  const skills = extractResumeSkills("Ran production workloads on EKS.");
  assert.ok(skills.some((s) => s.tag === "eks"));
});

const GOLDEN_JD = "AWS, Kubernetes, Terraform, GitHub Actions, and Security experience required.";
const GOLDEN_RESUME =
  "Experience with AWS and ECS for container workloads. Built and maintained Terraform modules for three years. Automated deployments using GitHub Actions.";

function goldenAssessments(): RequirementAssessment[] {
  return buildRequirementAssessments(extractJDRequirements(GOLDEN_JD), extractResumeSkills(GOLDEN_RESUME));
}

test("golden example: evidence tiers and risk match the worked example exactly", () => {
  const byTag = new Map(goldenAssessments().map((a) => [a.tag, a]));

  assert.equal(byTag.get("aws")?.evidence, "strong");
  assert.equal(byTag.get("aws")?.risk, "low");

  assert.equal(byTag.get("terraform")?.evidence, "strong");
  assert.equal(byTag.get("terraform")?.risk, "low");

  assert.equal(byTag.get("github-actions")?.evidence, "strong");
  assert.equal(byTag.get("github-actions")?.risk, "low");

  assert.equal(byTag.get("kubernetes")?.evidence, "adjacent");
  assert.equal(byTag.get("kubernetes")?.risk, "high");
  assert.match(byTag.get("kubernetes")!.reason, /ECS/);

  assert.equal(byTag.get("security")?.evidence, "absent");
  assert.equal(byTag.get("security")?.risk, "high");
  assert.match(byTag.get("security")!.reason, /No mention/);
});

test("golden example: every assessment reason is traceable text, not a bare number", () => {
  for (const a of goldenAssessments()) {
    assert.equal(typeof a.reason, "string");
    assert.ok(a.reason.length > 10);
    assert.doesNotMatch(a.reason, /\d\.\d/);
  }
});

function goldenPool(): InterviewQuestionEntry[] {
  return [
    q({ id: "aws-1", category: "aws", technologies: ["aws"], question_type: ["conceptual"] }),
    q({ id: "aws-2", category: "aws", technologies: ["aws"], question_type: ["scenario"] }),
    q({ id: "k8s-1", category: "kubernetes", technologies: ["kubernetes"], question_type: ["conceptual"] }),
    q({ id: "k8s-2", category: "kubernetes", technologies: ["kubernetes"], question_type: ["troubleshooting"] }),
    q({ id: "tf-1", category: "terraform", technologies: ["terraform"], question_type: ["conceptual"] }),
    q({ id: "tf-2", category: "terraform", technologies: ["terraform"], question_type: ["architecture"] }),
    q({ id: "tf-3", category: "terraform", technologies: ["terraform"], question_type: ["scenario"] }),
    q({ id: "gha-1", category: "github-actions", technologies: ["github-actions"], question_type: ["conceptual"] }),
    q({ id: "gha-2", category: "github-actions", technologies: ["github-actions"], question_type: ["scenario"] }),
    q({ id: "sec-1", category: "security", technologies: ["security"], question_type: ["conceptual"] }),
    q({ id: "sec-2", category: "security", technologies: ["security"], question_type: ["scenario"] }),
  ];
}

test("golden example, count=5: every must-have gets exactly one seat when the budget is tight", () => {
  const result = buildJobSpecificSession(goldenPool(), goldenAssessments(), extractResumeSkills(GOLDEN_RESUME), 5, new Set(), (x) => x);
  assert.equal(result.questionIds.length, 5);
  assert.equal(result.coverage.uncoveredMustHave.length, 0);
  const tagsUsed = new Set(Object.values(result.explanations).map((e) => e.tag));
  assert.deepEqual([...tagsUsed].sort(), ["aws", "github-actions", "kubernetes", "security", "terraform"]);
});

test("golden example, count=10: higher-risk requirements (Kubernetes, Security) receive more total seats than well-evidenced ones, but no single tag dominates", () => {
  const result = buildJobSpecificSession(goldenPool(), goldenAssessments(), extractResumeSkills(GOLDEN_RESUME), 10, new Set(), (x) => x);
  const seatsByTag = new Map<string, number>();
  for (const e of Object.values(result.explanations)) seatsByTag.set(e.tag, (seatsByTag.get(e.tag) ?? 0) + 1);

  const highRiskSeats = (seatsByTag.get("kubernetes") ?? 0) + (seatsByTag.get("security") ?? 0);
  const lowRiskSeats = (seatsByTag.get("aws") ?? 0) + (seatsByTag.get("terraform") ?? 0) + (seatsByTag.get("github-actions") ?? 0);
  assert.ok(highRiskSeats > 0);
  assert.ok(highRiskSeats >= lowRiskSeats * (2 / 3) - 1);

  const cap = Math.max(2, Math.ceil(10 * 0.4));
  for (const seats of seatsByTag.values()) assert.ok(seats <= cap, `no tag may exceed the domination cap of ${cap}`);

  for (const e of Object.values(result.explanations)) {
    assert.ok(["core-requirement", "covering-gap", "validating-claim"].includes(e.kind));
  }
  const gapExplanations = Object.values(result.explanations).filter((e) => e.tag === "kubernetes" || e.tag === "security");
  assert.ok(gapExplanations.length > 0);
  assert.ok(gapExplanations.every((e) => e.kind === "covering-gap"));
});

test("golden example: the Terraform claim is validated with an architecture/scenario question, not a conceptual one, when both are available", () => {
  const result = buildJobSpecificSession(goldenPool(), goldenAssessments(), extractResumeSkills(GOLDEN_RESUME), 5, new Set(), (x) => x);
  const terraformQuestionId = Object.entries(result.explanations).find(([, e]) => e.tag === "terraform")?.[0];
  assert.ok(terraformQuestionId);
  assert.notEqual(terraformQuestionId, "tf-1");
  assert.equal(result.explanations[terraformQuestionId!]!.kind, "validating-claim");
});

test("coverage note explains when there are more must-haves than the session can fit", () => {
  const manyRequirements = extractJDRequirements(
    "Must have: AWS, Kubernetes, Terraform, GitHub Actions, Security, Docker, Ansible, Prometheus.",
  );
  const assessments = buildRequirementAssessments(manyRequirements, extractResumeSkills(""));
  const pool = [
    ...goldenPool(),
    q({ id: "docker-1", category: "docker", technologies: ["docker"], question_type: ["conceptual"] }),
    q({ id: "ansible-1", category: "ansible", technologies: ["ansible"], question_type: ["conceptual"] }),
    q({ id: "prom-1", category: "monitoring", technologies: ["prometheus"], question_type: ["conceptual"] }),
  ];
  const result = buildJobSpecificSession(pool, assessments, [], 5, new Set(), (x) => x);

  assert.equal(result.coverage.requestedCount, 5);
  assert.ok(result.coverage.uncoveredMustHave.length > 0);
  assert.ok(result.coverage.note && result.coverage.note.length > 0);
  assert.equal(result.questionIds.length, 5);
});

test("an empty resume makes every JD requirement absent and every risk high", () => {
  const assessments = buildRequirementAssessments(extractJDRequirements(GOLDEN_JD), extractResumeSkills(""));
  assert.ok(assessments.every((a) => a.evidence === "absent"));
  assert.ok(assessments.every((a) => a.risk === "high"));
});

test("a JD requirement with zero matching questions in the corpus is reported, not silently dropped", () => {
  const assessments = buildRequirementAssessments(extractJDRequirements("We need Kyverno experience."), []);
  const result = buildJobSpecificSession(goldenPool(), assessments, [], 5, new Set(), (x) => x);
  assert.equal(result.questionIds.length, 0);
  assert.match(result.coverage.note ?? "", /Kyverno/);
});

test("recently-seen questions are avoided when a fresh alternative exists in the same bucket", () => {
  const assessments = buildRequirementAssessments(extractJDRequirements("Kubernetes required."), []);
  const result = buildJobSpecificSession(goldenPool(), assessments, [], 1, new Set(["k8s-1"]), (x) => x);
  assert.deepEqual(result.questionIds, ["k8s-2"]);
});

test("recently-seen questions are still used rather than starving a bucket with no fresh alternative", () => {
  const assessments = buildRequirementAssessments(extractJDRequirements("Kubernetes required."), []);
  const result = buildJobSpecificSession(goldenPool(), assessments, [], 2, new Set(["k8s-1", "k8s-2"]), (x) => x);
  assert.equal(result.questionIds.length, 2);
});

test("buildJobSpecificSession is deterministic given the same inputs and shuffle function", () => {
  const assessments = goldenAssessments();
  const skills = extractResumeSkills(GOLDEN_RESUME);
  const a = buildJobSpecificSession(goldenPool(), assessments, skills, 10, new Set(), (x) => x);
  const b = buildJobSpecificSession(goldenPool(), assessments, skills, 10, new Set(), (x) => x);
  assert.deepEqual(a.questionIds, b.questionIds);
  assert.deepEqual(Object.keys(a.explanations).sort(), Object.keys(b.explanations).sort());
});

test("a requirement matches a question through category or question_type, not only the technologies array", () => {
  const assessments = buildRequirementAssessments(extractJDRequirements("Security required."), []);
  const pool = [q({ id: "sec-by-category", category: "security", technologies: [], question_type: ["conceptual"] })];
  const result = buildJobSpecificSession(pool, assessments, [], 1, new Set(), (x) => x);
  assert.deepEqual(result.questionIds, ["sec-by-category"]);
});

test("REFINEMENT: an ambiguous resume mention never produces strong evidence for two separate specific-tool requirements at once", () => {
  const requirements = [
    ...extractJDRequirements("ECS required."),
    ...extractJDRequirements("EKS required."),
  ];
  const skills = extractResumeSkills("Built and operated container workloads using AWS Fargate.");
  const assessments = buildRequirementAssessments(requirements, skills);

  const ecs = assessments.find((a) => a.tag === "ecs")!;
  const eks = assessments.find((a) => a.tag === "eks")!;
  assert.notEqual(ecs.evidence, "strong", "ECS must not be strong from an ambiguous Fargate mention alone");
  assert.notEqual(eks.evidence, "strong", "EKS must not be strong from an ambiguous Fargate mention alone");
  assert.equal(ecs.evidence, "adjacent");
  assert.equal(eks.evidence, "adjacent");
});

test("REFINEMENT: the same ambiguous mention DOES satisfy a capability-phrased requirement at strong", () => {
  const requirements = extractJDRequirements("Container orchestration experience required.");
  const skills = extractResumeSkills("Built and operated container workloads using AWS Fargate.");
  const assessments = buildRequirementAssessments(requirements, skills);

  assert.equal(assessments.length, 1);
  assert.equal(assessments[0]!.evidence, "strong");
  assert.match(assessments[0]!.reason, /Fargate/);
  assert.match(assessments[0]!.reason, /container orchestration/);
});

test("REFINEMENT: a tool-named requirement still requires the exact tool, even though a capability entry links it to an adjacent one", () => {
  const requirements = extractJDRequirements("Kubernetes required.");
  const skills = extractResumeSkills("Deployed services to ECS for container workloads.");
  const assessments = buildRequirementAssessments(requirements, skills);

  assert.equal(assessments[0]!.evidence, "adjacent", "a genuinely different tool must stay adjacent for a tool-named requirement");
});

test("weak-signal language caps evidence at adjacent, never strong", () => {
  const cases = ["Familiar with Kubernetes.", "Some exposure to Terraform.", "Worked alongside the Kubernetes team."];
  for (const resumeText of cases) {
    const tag = resumeText.includes("Terraform") ? "terraform" : "kubernetes";
    const requirements = extractJDRequirements(`${tag === "terraform" ? "Terraform" : "Kubernetes"} required.`);
    const skills = extractResumeSkills(resumeText);
    const assessments = buildRequirementAssessments(requirements, skills);
    assert.equal(assessments[0]!.evidence, "adjacent", `"${resumeText}" must cap at adjacent`);
  }
});

test("genuine ownership language still produces strong evidence, unaffected by the weak-signal check", () => {
  const cases = [
    ["Kubernetes required.", "Designed Kubernetes platforms for three production clusters."],
    ["Terraform required.", "Owned Terraform infrastructure end to end."],
    ["Kubernetes required.", "Operated production Kubernetes clusters at scale."],
  ];
  for (const [jd, resumeText] of cases) {
    const assessments = buildRequirementAssessments(extractJDRequirements(jd!), extractResumeSkills(resumeText!));
    assert.equal(assessments[0]!.evidence, "strong", `"${resumeText}" must remain strong`);
  }
});

test("expanded aliases from the brief resolve correctly end to end", () => {
  const assessments = buildRequirementAssessments(extractJDRequirements("Amazon ECS required."), extractResumeSkills("Ran services on Amazon ECS."));
  assert.equal(assessments[0]!.tag, "ecs");
  assert.equal(assessments[0]!.evidence, "strong");
});

test("a capability-phrased requirement draws candidate questions from every tag in its equivalence set", () => {
  const assessments = buildRequirementAssessments(extractJDRequirements("Container orchestration experience required."), []);
  const pool = [
    q({ id: "ecs-only", category: "aws", technologies: ["ecs"], question_type: ["conceptual"] }),
    q({ id: "k8s-only", category: "kubernetes", technologies: ["kubernetes"], question_type: ["conceptual"] }),
  ];
  const result = buildJobSpecificSession(pool, assessments, [], 5, new Set(), (x) => x);
  assert.equal(result.questionIds.length, 2, "both the ECS and Kubernetes questions should be eligible for one capability requirement");
});

test("no capability requirement is silently duplicated when the JD also names one of its member tools directly", () => {
  const requirements = extractJDRequirements("Requirements:\n- Kubernetes\n- Container orchestration experience");
  const kubernetesEntries = requirements.filter((r) => r.tag === "kubernetes");
  assert.equal(kubernetesEntries.length, 1, "should not produce a separate capability requirement duplicating an already-named tool");
});
