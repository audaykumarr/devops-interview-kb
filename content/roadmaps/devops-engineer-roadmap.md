---
id: devops-engineer-roadmap
title: "DevOps Engineer Roadmap"
description: "A sequenced path from DevOps foundations to production-ready engineering skills, built from this bank's 528 most job-relevant questions."
target_role: devops-engineer
estimated_duration_weeks: 14
status: published
last_reviewed: 2026-08-23
last_updated: 2026-08-23
stages:
  - id: foundations
    title: Foundations
    categories: [devops-fundamentals, linux, bash, python, yaml]
    recommended_questions:
      - bash-scripting-cron-environment-mismatch-001
      - yaml-anchors-structure-indentation-errors-001
      - linux-disk-management-phantom-disk-usage-001
  - id: source-control
    title: Source Control & Collaboration
    prerequisites: [foundations]
    categories: [git, github, gitlab]
    recommended_questions:
      - git-branching-recovering-after-force-push-overwrite-001
      - github-branch-protection-status-check-stuck-expected-001
      - git-history-recovery-merge-conflict-resolution-001
  - id: containers
    title: Containers
    prerequisites: [foundations]
    categories: [docker, containers]
    recommended_questions:
      - docker-networking-inter-container-connectivity-001
      - containers-runtime-internals-oom-killed-distinction-001
      - docker-volumes-bind-mount-permission-denied-001
  - id: cicd
    title: CI/CD
    prerequisites: [source-control, containers]
    categories: [cicd, github-actions, gitlab-ci, jenkins, azure-pipelines]
    recommended_questions:
      - github-actions-workflow-design-concurrency-control-001
      - gitlab-ci-pipeline-optimization-cache-vs-artifacts-001
      - jenkins-pipeline-design-parallel-stage-failure-001
  - id: orchestration
    title: Orchestration
    prerequisites: [containers]
    categories: [kubernetes, helm]
    related_guides: [kubernetes-interview-guide]
    recommended_questions:
      - kubernetes-autoscaling-limits-without-requests-breaks-hpa-001
      - helm-releases-hook-not-running-expected-order-001
      - kubernetes-admission-multiple-mutating-webhooks-conflict-001
  - id: iac
    title: Infrastructure as Code
    prerequisites: [orchestration]
    categories: [terraform, infrastructure-as-code, ansible]
    related_guides: [terraform-interview-guide]
    recommended_questions:
      - terraform-providers-state-lock-acquisition-failure-001
      - infrastructure-as-code-drift-manual-console-change-001
      - ansible-playbooks-not-idempotent-every-run-changed-001
  - id: cloud
    title: Cloud Platforms
    prerequisites: [iac]
    categories: [aws, gcp, cloud-fundamentals, cloud-architecture, azure]
    related_guides: [aws-devops-interview-guide, gcp-interview-guide]
    recommended_questions:
      - aws-s3-public-bucket-exposure-001
      - azure-aks-autoscaler-not-scaling-001
      - aws-lambda-timeout-troubleshooting-001
  - id: security
    title: Security Fundamentals
    prerequisites: [cicd, containers, cloud]
    categories: [security, devsecops]
    recommended_questions:
      - security-iam-and-access-control-shared-admin-account-001
      - devsecops-supply-chain-security-dependency-confusion-001
      - security-iam-and-access-control-sso-lockout-001
  - id: observability
    title: Observability Fundamentals
    prerequisites: [cloud]
    categories: [monitoring, observability]
    recommended_questions:
      - monitoring-metrics-dashboards-cardinality-explosion-001
      - observability-metrics-prometheus-cardinality-explosion-001
      - monitoring-alerting-setting-initial-slo-no-history-001
  - id: gitops
    title: GitOps & Modern Delivery
    prerequisites: [source-control, cicd, orchestration]
    categories: [gitops, argocd]
    recommended_questions:
      - gitops-argocd-stuck-outofsync-001
      - argocd-sync-waves-cleaning-up-hash-named-jobs-001
      - gitops-argocd-mutating-webhook-config-belongs-in-git-001
  - id: networking
    title: Networking Essentials
    prerequisites: [containers, cloud]
    categories: [networking]
    recommended_questions:
      - networking-dns-intermittent-resolution-failure-001
      - networking-load-balancing-health-check-flapping-001
      - networking-load-balancing-connection-draining-001
  - id: production-readiness
    title: Production Readiness
    prerequisites: [security, observability, gitops, networking]
    categories: [scenarios, troubleshooting]
    recommended_questions:
      - troubleshooting-methodology-paged-app-is-slow-no-context-001
      - scenarios-legacy-systems-refactor-vs-rewrite-decision-001
      - scenarios-real-world-tradeoffs-good-enough-is-enough-001
---

## Introduction

This roadmap sequences 528 of this bank's 566 technical interview questions into a single path: what to learn, in what order, to go from DevOps fundamentals to job-ready. It doesn't answer interview questions for you — the [DevOps Interview Guide](/guides/devops-interview-guide) and category pages already do that. What this roadmap adds is sequencing: which of the bank's 16 preparation domains to tackle first, which depend on which, and when you've actually covered enough of a stage to move on.

Twelve stages, each scoped to a live-derived slice of the question bank, each with a small checkpoint set and a short representative practice sample — never the full stage dumped onto one page.

## Who This Roadmap Is For

This targets the **DevOps Engineer** interview level specifically — the bulk of a working DevOps engineer's day-to-day tooling, troubleshooting, and judgment calls, not a first-role primer and not a staff-level design review. If you're earlier in your career, the sequence still applies, but expect some stages (Cloud, GitOps, Security) to assume more working familiarity than a from-scratch tutorial would.

Reality check on the source material: true beginner-difficulty content in this bank is thin (49 of 566 questions, concentrated almost entirely in Foundations, Cloud Fundamentals, Docker, and Git). Past those, the bank assumes you already have working familiarity and tests judgment, not vocabulary. This roadmap's job is sequencing and checkpointing that reality, not manufacturing tutorial content that doesn't exist here — where a stage's own coverage is thin, "What to Learn" points to the general skill, and the checkpoint questions are there to test it, not teach it from zero.

## Deferred Areas

Four categories are deliberately **not** part of this roadmap, each for a specific, data-grounded reason:

- **`sre`** — zero questions at the devops-engineer level in this bank; every one of them assumes senior/staff framing (error budgets, on-call design). Reserved for a future SRE roadmap.
- **`platform-engineering`** — same pattern: organizational/strategic content (golden paths, internal developer platforms) that presupposes the tooling this roadmap teaches, rather than teaching it. Reserved for a future Platform Engineer roadmap.
- **`databases`** — 8 of its 10 questions are advanced or expert difficulty (replication split-brain, sync-vs-async trade-offs); this category skews senior in this bank, not devops-engineer. Reserved for a future SRE roadmap, alongside `sre`.
- **`system-design`** — 100% senior/staff-level, zero devops-engineer coverage. Reserved for a future Senior DevOps roadmap.

This isn't a content gap being hidden — it's the same category-level data used to sequence the 12 stages below, applied honestly to decide what doesn't belong in a DevOps Engineer's path yet.

## Stage: Foundations

Linux, Bash, Python, and YAML — the vocabulary every later stage assumes without re-teaching it. This is also where this bank's beginner-difficulty content concentrates most heavily (21 of 52 questions), making it the one stage genuinely safe to start from zero.

### Why It Matters

Nearly every later stage's questions lean on this vocabulary silently — a CI/CD question about a failing pipeline step assumes you can read the Bash it's running; a Kubernetes manifest question assumes YAML fluency. Skipping this stage doesn't remove that assumption, it just means later stages read as harder than they are.

### Learning Objectives

- Navigate and troubleshoot a Linux filesystem, process tree, and disk usage from the command line.
- Write and debug Bash scripts, including error handling (`set -e`, exit codes, quoting) — not just happy-path one-liners.
- Read and write YAML correctly, including the specific gotchas (anchors, implicit type coercion) that break configs silently.
- Explain core DevOps vocabulary and practices well enough to use them precisely in later stages, not just recognize them.

### Completion Criteria

- [ ] Can explain why a script with `set -e` still let a failing command through
- [ ] Can diagnose disk usage that doesn't match what `du`/`df` report inside a container
- [ ] Can identify a YAML indentation or type-coercion bug before it reaches a linter
- [ ] Comfortable reading unfamiliar Bash and Python scripts without line-by-line hand-holding

## Stage: Source Control & Collaboration

Git internals and platform-level governance (GitHub, GitLab) — sequenced right after Foundations because the next stage, CI/CD, is triggered by and reasons about Git events.

### Why It Matters

You can't reason about a stuck or misfiring CI/CD pipeline without first understanding what triggered it — a branch protection rule, a CODEOWNERS mismatch, a force-push that rewrote history a teammate was building on. This stage builds that vocabulary before CI/CD needs it.

### Learning Objectives

- Recover from common Git incidents: a bad force-push, a botched merge-conflict resolution, a history rewrite that needs undoing.
- Understand branch protection rules and why a required status check can get stuck in a state that looks wrong but isn't.
- Understand platform-level governance mechanics (CODEOWNERS, team permissions, API rate limits) beyond plain `git` commands.

### Completion Criteria

- [ ] Can recover a teammate's lost work after a force-push overwrite
- [ ] Can diagnose why a required GitHub status check is stuck rather than failed
- [ ] Understands the difference between a Git problem and a platform-governance problem

## Stage: Containers

Docker and container runtime internals — deliberately before Orchestration, since this bank's Kubernetes questions routinely assume you already understand what a container actually is at the OS level.

### Why It Matters

Kubernetes doesn't re-explain namespaces, cgroups, or image layers — it assumes them. A candidate who jumps straight to Kubernetes without this stage can usually operate `kubectl` but struggles the moment a question asks *why* a container behaves a certain way, not just *what* command fixes it.

### Learning Objectives

- Explain what actually isolates a container (namespaces, cgroups) and where that isolation is thinner than people assume.
- Diagnose container networking and volume issues — permission errors, disk usage that doesn't add up, connectivity between containers.
- Distinguish an OOM-killed container from other failure modes, and explain why the distinction matters for the fix.

### Completion Criteria

- [ ] Can explain the difference between a container being OOM-killed and crashing for another reason
- [ ] Can diagnose a bind-mount permission error
- [ ] Can explain why anonymous volumes accumulate disk space over time
- [ ] Comfortable with basic image, network, and volume troubleshooting without looking up every flag

## Stage: CI/CD

Pipeline design and the platform-specific mechanics of GitHub Actions, GitLab CI, Jenkins, and Azure Pipelines — building on Source Control (you can't reason about a stuck pipeline without understanding what triggered it) and Containers (build stages assume runtime literacy).

### Why It Matters

This is where "I can write a YAML pipeline" turns into "I can diagnose why this specific pipeline is stuck, flaky, or silently wrong" — concurrency control, cache-vs-artifact confusion, and parallel-stage failures are the actual day-to-day of a DevOps engineer's CI/CD work, not pipeline syntax.

### Learning Objectives

- Design pipelines with correct concurrency control, so simultaneous merges don't race each other.
- Understand the real difference between cache and artifacts, and why conflating them causes subtle failures.
- Diagnose parallel-stage and self-hosted-runner failures across at least one major CI/CD platform in depth.

### Completion Criteria

- [ ] Can explain why two merges within a minute of each other caused a pipeline race
- [ ] Can diagnose a `cache` vs `artifacts` misuse in GitLab CI
- [ ] Can debug a parallel Jenkins stage failure
- [ ] Comfortable reading pipeline YAML across more than one CI/CD platform

## Stage: Orchestration

Kubernetes and Helm — by a wide margin the largest stage in this roadmap (142 of 528 questions, over a quarter of the roadmap's total scope). Go deep here; it's the dominant real-world DevOps Engineer skill in this bank. The dedicated [Kubernetes Interview Guide](/guides/kubernetes-interview-guide) covers this stage's full 128-question Kubernetes slice in depth.

### Why It Matters

This is the single heaviest-weighted skill area in the entire bank. A DevOps Engineer interview that touches Kubernetes at all will go deep, and this bank's own weighting reflects that reality — budget your largest single block of preparation time here.

### Learning Objectives

- Understand workloads, scheduling, and resource management (requests/limits) well enough to explain *why* the scheduler made a given decision.
- Diagnose autoscaling (HPA) behavior, including the specific ways misconfigured requests/limits silently break it.
- Understand RBAC, cluster security, and admission control at a working level, not just "apply this YAML."
- Understand Helm release lifecycle — hooks, rollbacks, values precedence — since it's the packaging layer most real clusters run on top of.

### Completion Criteria

- [ ] Can explain why an HPA doesn't scale despite rising load (and the requests/limits root cause)
- [ ] Can diagnose a Helm hook that isn't running in the expected order
- [ ] Understands RBAC and admission control well enough to reason about a rejected request
- [ ] Comfortable navigating workloads, scheduling, and storage without leaning on a cheat sheet

## Stage: Infrastructure as Code

Terraform, tool-agnostic IaC practice, and Ansible — sequenced right after Orchestration, since a meaningful share of this bank's Terraform questions provision and manage the exact kind of infrastructure the previous stage just covered. The dedicated [Terraform Interview Guide](/guides/terraform-interview-guide) covers this stage's Terraform slice in depth.

### Why It Matters

Provisioning is a different discipline from operating what's provisioned — state management, drift, and idempotency are their own category of failure mode, distinct from anything in the Orchestration stage, and this bank tests them accordingly.

### Learning Objectives

- Understand Terraform state mechanics well enough to diagnose a stuck lock or an unexpected plan diff.
- Recognize configuration drift (a manual console change diverging from code) and know how to reconcile it safely.
- Understand what idempotency actually guarantees in Ansible playbooks, and why "ran successfully" doesn't always mean "didn't change anything it shouldn't have."

### Completion Criteria

- [ ] Can diagnose a Terraform state lock acquisition failure
- [ ] Can explain how to detect and reconcile infrastructure drift
- [ ] Can explain why an Ansible playbook reported changes on a run that should have been a no-op
- [ ] Comfortable reading a Terraform plan diff and explaining what's about to happen before running apply

## Stage: Cloud Platforms

AWS, GCP, Azure, cloud fundamentals, and cross-cloud architecture. Lands here deliberately — by this point you already understand provisioning and orchestration, so cloud-specific content (IAM models, managed Kubernetes, serverless) is an application of those concepts to a vendor, not a disconnected topic. The dedicated [AWS DevOps Interview Guide](/guides/aws-devops-interview-guide) and [GCP Interview Guide](/guides/gcp-interview-guide) cover this stage's two deepest single-provider slices.

**Pick one provider to go deep on rather than splitting attention evenly across all three.** AWS is this bank's deepest single-provider path (39 questions, a dedicated Guide, and a clear IAM/Lambda/S3 structure). GCP is comparably deep (27 questions, its own dedicated Guide covering IAM, Storage, and Cloud Functions) — a reasonable second choice if AWS isn't your target. Azure is the thinnest of the three here (10 questions, no dedicated Guide yet) and best treated as a light survey unless it's specifically your target platform.

### Why It Matters

Nearly every DevOps Engineer role is anchored to a specific cloud provider in practice — depth on one provider reads far stronger in an interview than shallow familiarity with three.

### Learning Objectives

- Go deep on IAM, storage, and compute (serverless or managed containers) for one primary provider.
- Understand the security failure modes specific to that provider (public bucket exposure, over-permissioned roles) well enough to both cause and fix them in a discussion.
- Understand managed Kubernetes autoscaling behavior on at least one provider, connecting back to the Orchestration stage.

### Completion Criteria

- [ ] Can explain how to determine what changed after an accidental public storage exposure
- [ ] Can diagnose a managed-Kubernetes autoscaler that isn't scaling under load
- [ ] Can debug a serverless function timeout or cold-start latency issue
- [ ] Has picked one primary provider and can go deep on it, not just describe all three at a survey level

## Stage: Security Fundamentals

Security and DevSecOps — explicitly scoped as baseline DevOps security competency, not full DevSecOps specialization (that's a future, dedicated roadmap). Placed after CI/CD, Containers, and Cloud, since most of this stage's questions assume you already understand the surfaces being secured.

### Why It Matters

A DevOps Engineer interview expects you to reason about IAM sprawl, supply-chain risk, and access-control failures as part of normal operations — not as a separate specialist's job. This stage is the floor every DevOps Engineer needs, not the ceiling a DevSecOps Engineer eventually reaches.

### Learning Objectives

- Diagnose IAM and access-control failures: service-account sprawl, shared admin accounts, SSO lockouts.
- Understand supply-chain risk at a working level — dependency confusion, third-party CI/CD action risk — without needing to design a full mitigation program.
- Recognize when a security question is asking for a specific mechanism versus a general awareness answer, and calibrate accordingly.

### Completion Criteria

- [ ] Can diagnose why a security audit found hundreds of untraceable service accounts
- [ ] Can explain dependency confusion and why it's a real supply-chain risk, not a theoretical one
- [ ] Can reason about an SSO lockout without immediately reaching for "just reset the password"

## Stage: Observability Fundamentals

Monitoring and observability — you need something running (every stage before this one) before "how do you know it's healthy" is a meaningful question. The deeper SRE-specific content (error budgets, on-call design) is deliberately excluded here; see Deferred Areas.

### Why It Matters

Cardinality explosions, alert fatigue, and SLO-setting-without-history are the practical, day-to-day observability failures a DevOps Engineer actually hits — distinct from the org-level SRE practice this roadmap defers.

### Learning Objectives

- Understand metric cardinality well enough to diagnose (and prevent) a cardinality explosion before it takes down monitoring itself.
- Set an initial SLO reasonably when there's no historical data to base it on.
- Recognize alert fatigue as a design problem with the alerting rules, not a tooling problem.

### Completion Criteria

- [ ] Can explain why adding a high-cardinality label to a metric caused a monitoring outage
- [ ] Can propose a reasonable initial SLO with no historical data
- [ ] Can diagnose noisy alert thresholds causing fatigue, and propose a fix

## Stage: GitOps & Modern Delivery

GitOps and Argo CD — a synthesis of Source Control, CI/CD, and Orchestration, sequenced after all three because it presupposes them. Genuinely more advanced content in this bank (only a third of its questions sit at the devops-engineer level), appropriately placed late in the path.

### Why It Matters

Git-as-source-of-truth deployment is increasingly how modern Kubernetes delivery actually works in production — this stage connects everything learned so far into the deployment model a growing share of DevOps Engineer roles now run on.

### Learning Objectives

- Diagnose an Argo CD application stuck OutOfSync despite matching pods.
- Understand Argo CD sync waves and hook ordering well enough to control migration and cleanup behavior deliberately.
- Reason about what belongs in Git versus what a mutating webhook should handle at apply time.

### Completion Criteria

- [ ] Can diagnose an Argo CD application stuck OutOfSync
- [ ] Can explain how sync waves control apply order and why that matters for migrations
- [ ] Can reason about what configuration belongs in Git versus a runtime admission mechanism

## Stage: Networking Essentials

DNS, load balancing, and the connectivity failures that show up in production — small (10 questions) but consistently referenced by earlier stages (Docker networking, Kubernetes networking, cloud VPCs) without ever being taught standalone. This is the dedicated, focused pass.

### Why It Matters

Networking failures are disproportionately represented in real production incidents relative to how much standalone attention they get in most preparation — this stage exists because every earlier stage assumed just enough networking to function, without ever teaching it directly.

### Learning Objectives

- Diagnose DNS resolution failures, including the specific client-side vs. server-side distinction.
- Diagnose load-balancer health-check flapping and connection-draining issues during deployments.
- Understand the practical trade-offs load balancers make (sticky sessions, MTU mismatches) well enough to reason about them, not just name them.

### Completion Criteria

- [ ] Can differentiate a client-side from a server-side DNS resolution problem
- [ ] Can diagnose a load balancer flapping healthy backends as unhealthy
- [ ] Can explain what happens to in-flight requests during a deployment without connection draining

## Stage: Production Readiness

Scenarios and troubleshooting methodology — the capstone. Only 14 questions live directly in these two categories, but this stage's real material is the cross-cutting `scenario` (89 questions) and `troubleshooting` (130 questions) question types spread across every stage above. This is the synthesis stage, not a new topic.

**A note on precision, since this trips people up:** `/troubleshooting` (this stage's own category) is 4 general-methodology questions. `/type/troubleshooting` is 130 questions — every troubleshooting-tagged question across the entire bank, spanning every category above. They are not the same thing, and this roadmap never adds them together.

### Why It Matters

By this stage you've covered the mechanics of every domain — this is where judgment gets tested: triage under ambiguity, deciding when to escalate, and reasoning through legacy systems and imperfect trade-offs with no single correct answer. It's also the most realistic simulation of what an actual interview's hardest questions look like.

### Learning Objectives

- Triage an ambiguous incident ("the app is slow," no other context) methodically rather than guessing.
- Decide when to escalate versus continue investigating alone, and articulate why.
- Reason through legacy-system scenarios — refactor vs. rewrite, inheriting undocumented systems — as genuine trade-offs, not solvable-with-one-right-answer puzzles.
- Practice broadly across the [cross-cutting troubleshooting question type](/type/troubleshooting) and [scenario question type](/type/scenario), not just this stage's own 14 questions.

### Completion Criteria

- [ ] Can lay out a methodical triage plan for a vague "app is slow" page with no other context
- [ ] Can articulate a clear, reasoned escalation threshold
- [ ] Can argue both sides of a refactor-vs-rewrite decision on a legacy system
- [ ] Has practiced enough of the cross-cutting troubleshooting/scenario question types to be comfortable with unfamiliar categories, not just the ones covered directly above

## Related Guides

Three stages in this roadmap have a dedicated deep-reference Guide: [Kubernetes Interview Guide](/guides/kubernetes-interview-guide) for the full Orchestration stage, [Terraform Interview Guide](/guides/terraform-interview-guide) for the Infrastructure as Code stage's Terraform slice, and the [AWS DevOps Interview Guide](/guides/aws-devops-interview-guide) and [GCP Interview Guide](/guides/gcp-interview-guide) for the Cloud Platforms stage's two deepest single-provider paths. For the roadmap's full scope in one place — all 16 domains, not just the 12 stages sequenced here — see the umbrella [DevOps Interview Guide](/guides/devops-interview-guide), which this roadmap draws its structure from but sequences differently: the Guide is organized for reference (jump to any domain), this roadmap is organized for progression (work through in order).
