---
id: devops-interview-guide
title: "DevOps Interview Guide"
description: "A domain-by-domain map across all 566 technical questions in this bank, so you can prioritize the areas your target role actually interviews on."
guide_type: interview
categories:
  - devops-fundamentals
  - linux
  - bash
  - python
  - yaml
  - git
  - github
  - gitlab
  - cicd
  - github-actions
  - gitlab-ci
  - jenkins
  - azure-pipelines
  - docker
  - containers
  - kubernetes
  - helm
  - terraform
  - infrastructure-as-code
  - ansible
  - aws
  - azure
  - gcp
  - cloud-fundamentals
  - cloud-architecture
  - security
  - devsecops
  - monitoring
  - observability
  - sre
  - gitops
  - argocd
  - platform-engineering
  - networking
  - databases
  - system-design
  - scenarios
  - troubleshooting
technologies:
  - kubernetes
  - aws
  - terraform
  - docker
  - linux
  - git
interview_levels:
  - junior-devops
  - devops-engineer
  - senior-devops
  - sre
  - platform-engineer
  - cloud-engineer
  - devsecops
  - staff-principal
estimated_reading_minutes: 20
featured_questions:
  - bash-error-handling-swallowed-exit-code-001
  - git-branching-recovering-after-force-push-overwrite-001
  - github-actions-workflow-design-concurrency-control-001
  - docker-volumes-bind-mount-permission-denied-001
  - kubernetes-autoscaling-hpa-not-scaling-despite-latency-001
  - helm-releases-hook-not-running-expected-order-001
  - terraform-providers-state-lock-acquisition-failure-001
  - aws-s3-determining-changes-after-exposure-without-versioning-001
  - gcp-storage-public-access-prevention-vs-iam-001
  - devsecops-supply-chain-security-dependency-confusion-001
  - sre-on-call-incident-response-alert-fatigue-001
  - gitops-argocd-stuck-outofsync-001
  - platform-engineering-platform-adoption-team-bottleneck-001
  - networking-dns-intermittent-resolution-failure-001
  - databases-replication-availability-split-brain-001
  - system-design-observability-alerting-paging-001
  - scenarios-real-world-tradeoffs-two-mediocre-options-001
  - troubleshooting-methodology-paged-app-is-slow-no-context-001
related_guides:
  - kubernetes-interview-guide
  - aws-devops-interview-guide
  - terraform-interview-guide
related_technologies:
  - azure
  - gcp
  - ansible
  - argocd
  - python
status: published
last_reviewed: 2026-08-23
last_updated: 2026-08-23
---

## Introduction

This bank holds 576 questions in total; 566 of them are technical and fall into 38 categories, and this guide is the map across all of them. It is not a single deep-dive — for that, use the dedicated [Kubernetes](/guides/kubernetes-interview-guide), [AWS](/guides/aws-devops-interview-guide), or [Terraform](/guides/terraform-interview-guide) guides instead. What this guide does is group those 38 categories into 16 higher-level domains, so you can see where the bank's actual weight sits (Orchestration alone is 142 questions — a quarter of the entire technical bank) and decide, deliberately, which domains matter for the interview you're actually preparing for rather than trying to cover all 566 questions evenly.

The one category deliberately excluded here is `behavioral` — this guide is scoped to technical interview preparation, not behavioral/situational interviewing, which is a different discipline with its own preparation approach.

## Who This Guide Is For

Every one of the 8 interview levels this bank tracks — Junior DevOps, DevOps Engineer, Senior DevOps, SRE, Platform Engineer, Cloud Engineer, DevSecOps, and Staff/Principal — has real coverage across this 566-question pool, so this guide works as a starting point regardless of which role you're interviewing for. That said, the coverage isn't evenly distributed: Senior DevOps (484 questions) and DevOps Engineer (348) dominate by volume, Cloud Engineer (96) and Staff/Principal (218) are strong, while Junior DevOps (49), SRE (34), and Platform Engineer (33) are real but comparatively narrow slices.

Use this guide as the entry point specifically because it's honest about that imbalance — the domain breakdown below tells you where to spend disproportionate time if you're prepping for a role this bank covers thinly (e.g., an SRE candidate should treat Observability & SRE, and cross-reference the Troubleshooting question type, as higher priority than the raw category size suggests).

## Prerequisites

This guide assumes:

- General comfort with the command line and at least one scripting language (this bank's Foundations domain assumes Linux/Bash fluency, not first exposure).
- Some hands-on exposure to the core toolchain — Git, a CI/CD platform, Docker, and at least one cloud provider — even if not deep expertise in all of them.
- Willingness to go deep in a handful of domains rather than shallow across all 16 — this bank rewards specificity (naming the actual mechanism, not describing the idea) far more than breadth.

If you're missing the fundamentals entirely, start with the Foundations domain below before attempting anything else — nearly every other domain's questions assume it.

## Learning / Interview Path

Sixteen domains, sequenced by dependency and by how this bank's content actually clusters — not alphabetically, and not by raw question count.

1. **Foundations (52).** Linux, Bash, Python, YAML, and general DevOps fundamentals. Everything downstream assumes this — a script-parsing question in CI/CD or a YAML-manifest question in Kubernetes both lean on skills built here first.
2. **Source Control & Collaboration (30).** Git internals and platform governance (GitHub, GitLab). Comes right after Foundations because CI/CD, the very next stage, is triggered by and reasons about Git events — branch protection, merge conflicts, and force-push recovery are prerequisites for understanding pipeline behavior, not a separate track.
3. **CI/CD (44).** Pipeline design and the four platform-specific mechanics this bank covers (GitHub Actions, GitLab CI, Jenkins, Azure Pipelines). Builds directly on stage 2 — you can't reason about a stuck pipeline without first understanding what triggered it.
4. **Containers (29).** Docker and container runtime internals. Placed before Orchestration deliberately: this bank's Kubernetes questions routinely assume you already understand what a container actually is at the OS level (namespaces, cgroups, image layers) — skipping straight to Kubernetes without this stage means missing the "why" behind a lot of K8s behavior.
5. **Orchestration (142).** Kubernetes and Helm — by a wide margin the largest domain in this bank, a quarter of the entire technical pool. Budget your heaviest single block of preparation time here.
6. **Infrastructure as Code (40).** Terraform, tool-agnostic IaC practice, and Ansible. Sequenced after Orchestration because a meaningful share of this bank's Terraform and IaC questions are about provisioning and managing the exact kind of infrastructure — including Kubernetes clusters themselves — the previous two stages just covered.
7. **Cloud (96).** AWS, Azure, GCP, plus cloud-fundamentals and cross-cloud architecture. Comes after IaC rather than before it deliberately: by this point you already understand containers, orchestration, and how infrastructure gets provisioned as code, so cloud-specific content (IAM models, managed Kubernetes offerings, serverless) lands as an application of those concepts to a specific provider rather than a disconnected topic.
8. **Security (24).** Access control, secrets, and supply-chain security (security, devsecops). Placed here because most of this bank's security questions assume you already understand the CI/CD, container, and cloud surfaces they're securing — security-as-an-afterthought stage would be backwards, but security-as-a-standalone-first-topic doesn't match how the questions are actually written either.
9. **Observability & SRE (34).** Metrics, logs, traces, and SRE practice. You need something running (stages 1–8) before "how do you know it's healthy" becomes a meaningful question.
10. **GitOps (23).** Git-as-source-of-truth deployment and Argo CD specifically — a natural synthesis of Source Control (stage 2), CI/CD (stage 3), and Orchestration (stage 5), which is why it sits after all three rather than earlier.
11. **Platform Engineering (10).** Internal developer platforms and golden paths — organizational-maturity content that presupposes you already understand the tools (stages 1–10) a platform team is trying to abstract away for other engineers.
12. **Networking (10).** DNS, load balancing, and connectivity failures. Deliberately consolidated here rather than earlier: networking concepts show up throughout Containers, Orchestration, and Cloud already, so this stage is a focused, standalone pass on the networking-specific questions this bank has, not a first introduction to the topic.
13. **Databases (10).** Replication, availability, and consistency trade-offs. Same rationale as Networking — a focused pass on data-layer judgment calls that complements, rather than repeats, the infrastructure-focused stages before it.
14. **Architecture & System Design (8).** Open-ended, expert-difficulty system design problems that deliberately span multiple earlier domains at once (a logging platform design pulls on Observability, Storage, and Cloud simultaneously). Doing this before you've covered stages 1–13 means missing half the vocabulary these questions expect you to draw on.
15. **Real-World Scenarios (10).** Judgment calls with no single right answer — inheriting a disagreement, choosing between two mediocre options under a deadline. Placed near the end because these questions test how you synthesize trade-offs across everything above, not any one domain's mechanics.
16. **Troubleshooting (4 in this domain; 130 across the whole bank).** The final stage is deliberately about *methodology* — how you triage an ambiguous page with no context, when to escalate, how to balance "mitigate first" against masking the real cause — general diagnostic thinking that applies across every domain above it. See Scenario & Troubleshooting Focus below for why this domain's count (4) and the bank's full troubleshooting-question count (130) are two different, non-overlapping numbers.

## Key Concepts

- **Domain size is not the same as domain importance.** Troubleshooting is a 4-question literal category here, but the diagnostic thinking it represents runs through 130 questions — nearly a quarter of the whole bank — tagged `question_type: troubleshooting` across every other domain. Treat the small domains (Networking, Databases, Platform Engineering, Architecture, Scenarios, Troubleshooting) as concentrated, not minor.
- **This bank rewards naming the actual mechanism.** Across every domain, "I'd investigate the logs" reads far weaker than naming the specific tool — `terraform state mv`, a Kubernetes `admission webhook`, `CODEOWNERS`, a Prometheus cardinality limit. Depth beats breadth in every single domain.
- **Interview level and domain are independent axes.** A Staff/Principal candidate and a Junior DevOps candidate might both get a Kubernetes question — the level changes what depth of answer is expected, not which domain the question comes from. Use Prepare by Interview Level (below) alongside the domain breakdown, not instead of it.
- **Question type and domain are also independent axes.** A Kubernetes question can be `troubleshooting`, `scenario`, `architecture`, or plain `conceptual` — Orchestration is the *domain*, troubleshooting is the *kind of question*. Both are separately worth practicing.

## Interview Focus

- **Junior DevOps / DevOps Engineer:** Foundations, Source Control, CI/CD, and Containers carry the most direct weight — this is where day-to-day operational fluency is actually tested.
- **Senior DevOps:** The largest slice of this bank (484 of 566 questions touch this level) — expect depth expectations across nearly every domain, especially Orchestration, Cloud, and IaC.
- **SRE:** Observability & SRE is the obvious core, but don't skip the cross-cutting Troubleshooting question type (130 questions) — SRE interviews lean on diagnostic reasoning at least as much as on any one tool.
- **Cloud Engineer:** The Cloud domain (96 questions, spanning AWS/Azure/GCP) is the direct match — this bank's `cloud-engineer` interview level is populated almost entirely from this domain plus Containers and Orchestration.
- **DevSecOps:** Security (24) is the obvious anchor, but security-tagged questions also appear inside CI/CD (supply-chain), Cloud (IAM), and IaC (state secrets) — this bank treats security as cross-cutting, not siloed.
- **Platform Engineer:** A narrow but real slice (33 questions) — Platform Engineering, GitOps, and the platform-adoption judgment calls inside Scenarios are the most relevant material.
- **Staff/Principal:** Architecture & System Design and the hardest Real-World Scenarios questions are written specifically for this level — expect open-ended, multi-domain problems with genuine trade-offs on both sides, not single-correct-answer questions.

## Practice Questions

The groupings below are generated live from the current 566-question technical pool — nothing here is a hand-maintained list that goes stale as new questions are added. Start with **Must Practice** for a deliberate cross-section of all 16 domains, then use **By Domain** to go deep in whichever areas matter most for your target role.

## Scenario & Troubleshooting Focus

Two different numbers show up in this guide and they measure different things — worth being precise about which one you're looking at:

- **4** is the literal `troubleshooting` category size — the Troubleshooting domain above, which covers general incident-investigation *methodology* (triage, escalation, mitigate-vs-diagnose trade-offs) independent of any specific technology.
- **130** is the count of questions across the *entire* 566-question pool tagged `question_type: troubleshooting` — a Kubernetes HPA that won't scale, a Terraform state lock that won't release, a DNS resolution failure. These questions live inside their own technology domain (Orchestration, IaC, Networking, and so on); they are not part of the 4-question Troubleshooting domain, and the two counts are never added together anywhere in this guide.

In practice: use the Troubleshooting domain to build the general diagnostic mindset, then use the [full cross-bank troubleshooting question list](/type/troubleshooting) to apply that mindset inside whichever technology domains matter for your interview. The same distinction applies to `scenario` (89 questions) and `architecture` (89 questions) — both cut across nearly every domain rather than living in one place.

## Common Mistakes

- **Treating this as a "cover 566 questions" checklist instead of a prioritization map.** Nobody preparing for a real interview needs even coverage across all 16 domains — the point of this guide is to help you pick which ones matter for *your* target role and go deep there.
- **Confusing domain size with domain importance.** Architecture (8) and Troubleshooting (4) are small by count and disproportionately hard — expert-difficulty and cross-cutting, respectively. Skipping them because the number looks small is a mistake several domains here are specifically designed to catch.
- **Answering at the wrong depth for the level being interviewed.** A Junior DevOps answer that stays at "I'd check the logs" and a Staff/Principal answer that never gets past the mechanics of a single tool are both under-calibrated for their level — Interview Focus above exists to help you calibrate.
- **Not naming the actual mechanism.** Whether the domain is IaC, Orchestration, or Databases, this bank consistently rewards the specific term — the tool, the flag, the API — over the general idea.
- **Ignoring the question-type dimension entirely.** A candidate who's only ever practiced conceptual questions in a domain will be caught off guard by that same domain's scenario or troubleshooting questions, which ask for different reasoning, not more facts.

## Recommended Preparation Path

Given 566 questions, a single sitting isn't realistic — treat this as a multi-week plan, weighted by where the bank's own weight sits:

1. **Week 1 — orientation and the biggest domain:** Work through Must Practice below (18 questions, one cross-section pass), then spend the bulk of the week in Orchestration (142) — the single largest domain in this bank.
2. **Week 2 — the operational backbone:** Foundations, Source Control, CI/CD, and Containers — the domains that sequence first in the Learning Path above because everything else assumes them.
3. **Week 3 — infrastructure and cloud:** Infrastructure as Code (40) and Cloud (96) together — by this point the provisioning and platform vocabulary from weeks 1–2 makes both land faster.
4. **Week 4 — operational maturity:** Security, Observability & SRE, GitOps, and Platform Engineering — smaller domains individually, but this is where "runs in production, safely, at scale" thinking gets tested.
5. **Final pass — synthesis and judgment:** Networking, Databases, Architecture & System Design, Real-World Scenarios, and Troubleshooting methodology, in that order — then revisit the cross-cutting [troubleshooting](/type/troubleshooting) and [scenario](/type/scenario) question types across whichever domains matter most for your actual interview.

Adjust the weighting based on Who This Guide Is For above — an SRE candidate should compress weeks 2–3 and spend disproportionate time on Observability & SRE plus the troubleshooting question type; a Cloud Engineer candidate should do the reverse.

## Related Guides

This guide is the map — for the three domains with the deepest dedicated coverage in this bank, use the focused guides instead of relying on this one alone: the [Kubernetes Interview Guide](/guides/kubernetes-interview-guide) for the full 142-question Orchestration domain, the [AWS DevOps Interview Guide](/guides/aws-devops-interview-guide) for AWS specifically within the Cloud domain, and the [Terraform Interview Guide](/guides/terraform-interview-guide) for the Terraform-specific slice of Infrastructure as Code. Work through this guide first to decide where to spend your time, then go deep with the dedicated guide for whichever domain matters most.

## References

- [The DORA / State of DevOps research program](https://dora.dev/)
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/)
- [The Twelve-Factor App](https://12factor.net/)
