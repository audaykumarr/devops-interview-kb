---
id: terraform-interview-guide
title: "Terraform Interview Guide"
description: "A focused path through Terraform interview prep — provider workflow mechanics, module design, and state management, the areas this bank covers in depth."
guide_type: interview
category: terraform
categories:
  - terraform
technologies:
  - terraform
interview_levels:
  - devops-engineer
  - senior-devops
  - devsecops
  - staff-principal
estimated_reading_minutes: 9
featured_questions:
  - terraform-providers-state-lock-acquisition-failure-001
  - terraform-providers-import-existing-resource-001
  - terraform-providers-multiple-environments-workspaces-vs-directories-001
  - terraform-modules-versioning-strategy-001
  - terraform-modules-urgent-fix-reaching-all-consumers-001
  - terraform-state-sensitive-data-exposure-001
  - terraform-state-unexpected-recreate-001
  - terraform-state-monolithic-vs-micro-stacks-001
related_guides:
  - aws-devops-interview-guide
  - kubernetes-interview-guide
related_technologies:
  - infrastructure-as-code
  - aws
  - gitops
status: published
last_reviewed: 2026-08-23
last_updated: 2026-08-23
---

## Introduction

This guide covers exactly what this bank's 22 Terraform questions actually go deep on: the day-to-day mechanics of running Terraform in a team (providers, the CLI workflow, imports, environments), how to structure modules so they scale past one person's laptop, and — the area with the most genuine weight — the judgment calls around state that separate someone who's run `terraform apply` from someone who's operated Terraform against production infrastructure other people depend on.

It is not a Terraform-from-zero tutorial (there's no beginner-difficulty content here — the floor is intermediate), and it's not a general infrastructure-as-code philosophy guide either. For broader, tool-agnostic IaC practices — drift detection design, module design principles that apply beyond Terraform specifically, Terraform-vs-Pulumi-vs-cloud-native trade-offs — this bank has a separate, related `infrastructure-as-code` category worth working through alongside this guide, not instead of it.

## Who This Guide Is For

This bank's Terraform questions map to **DevOps Engineer**, **Senior DevOps**, and **Staff/Principal** levels, with a single **DevSecOps**-relevant question (state file secrets exposure) — that's the honest scope, not a rounder-sounding list. There is currently no Junior DevOps, SRE, Platform Engineer, or Cloud Engineer coverage specific to Terraform in this bank; if you're preparing for one of those roles, the reasoning here (especially the state-management judgment calls) still transfers, but don't expect dedicated content at that level yet.

Concretely: if you're expected to run Terraform changes against shared infrastructure and reason about what happens when something goes wrong — a corrupted state file, an unexpected destroy-and-recreate, a breaking module change reaching thirty consumers — this guide is built for exactly that interview.

## Prerequisites

Before working through this guide, you should already be comfortable with:

- Core Terraform vocabulary: providers, resources, variables/outputs, and what `plan`/`apply` actually do.
- Having run Terraform yourself at least a handful of times — this bank assumes familiarity with the basic workflow, not first exposure to it.
- Basic version control practices (this bank's module and CI/CD questions assume you understand PRs, tagging, and release practices in general, even before applying them to Terraform specifically).
- General production-safety instincts — the instinct to ask "what does this actually change" before running something against shared infrastructure.

## Learning / Interview Path

Three stages, sequenced by how the actual content clusters — work through them in order.

1. **Providers (9 questions).** Despite the subcategory name, this is really the CLI-and-workflow-mechanics stage: provider version pinning and lock-file checksums, importing a resource that was created manually, running the same resource across multiple regions with provider aliases, and the specific migration risk of converting `count` to `for_each`. This is intermediate-heavy (7 of 9) and deliberately first — it's the operational fluency everything else assumes.
2. **Modules (4 questions).** Once the day-to-day mechanics are solid, move to how Terraform code is actually structured at team scale: registry versus Git-tag module distribution, designing a module differently depending on who consumes it, and — the hardest question in this stage — how you'd actually ship an urgent fix to a shared module without breaking the thirty other teams depending on it. Small in count, but each question is a genuine trade-off discussion, not a syntax check.
3. **State (9 questions).** This is where the bank's real weight sits — 7 of 9 questions here are advanced difficulty, and it shows: state file backup and recovery, blocking destructive applies in CI/CD, `create_before_destroy` semantics, monolithic versus micro-stacks, cross-stack coupling via `terraform_remote_state`, and the specific danger of secrets leaking into state. Doing this stage last means the workflow fluency from stage 1 and the structural thinking from stage 2 are both already in place — state questions in this bank routinely assume both.

## Key Concepts

- **A `terraform plan` diff can come from your code, from drift, or from the provider itself — and they need different responses.** A data source that resolves to "the latest AMI" can produce a diff with zero code change; state drift from a manual console edit produces a different kind of diff; and neither is a bug in Terraform. Diagnosing which one you're looking at is a recurring skill in this bank.
- **`count` and `for_each` key state fundamentally differently.** `count` indexes numerically; `for_each` indexes by map/set key. Switching between them without `terraform state mv` (or a `moved` block) makes Terraform see entirely different resources — destroy-and-recreate, not an in-place change.
- **State holds real secrets in plaintext by default.** Any sensitive value passed as a resource argument lands in the state file whether or not you mark it `sensitive` in your own outputs — `sensitive = true` only affects what's *displayed*, not what's *stored*. This is one of the more consequential, easy-to-miss facts in Terraform.
- **`-target` and `terraform state rm` are both scalpels, not fixes.** Both let you act on one resource in isolation, and both carry real risk (a `-target` apply can leave the rest of the plan stale; `state rm` removes a resource from *management*, it doesn't delete the resource itself) — this bank tests whether you know the difference between "the fast way" and "the safe way."
- **A destroy-and-recreate plan (`-/+`) on a stateful resource is not routine.** Terraform's own annotation tells you exactly which attribute forced it — reading that before running `apply` is the difference between a safe change and a production incident.

## Interview Focus

- **DevOps Engineer:** Can you run the standard workflow confidently and diagnose the common CLI failures — a lock-file mismatch, a stuck state lock, an unpinned provider that silently upgraded?
- **Senior DevOps:** Can you reason about *consequences* — what a given change actually does to production state, why a plan is showing what it's showing, and how to structure modules so a change doesn't ripple unpredictably to other teams?
- **DevSecOps:** The one security-tagged question in this bank (state file secrets exposure) is representative of the actual concern: not "is Terraform secure," but "what ends up in this state file, who can read it, and what do you do about it."
- **Staff / Principal:** The state-management questions at this level are architectural — monolithic versus micro-stacks, cross-stack coupling trade-offs, designing CI/CD to structurally prevent a destructive apply. These are judgment calls with real trade-offs on both sides, not a single correct answer.

Across every level, naming the actual mechanism — `terraform state mv`, a `moved` block, `-refresh-only`, `create_before_destroy` — reads far stronger than describing the idea without the vocabulary.

## Practice Questions

The list below is generated live from the current Terraform question bank — nothing here is a fixed list that goes stale as new questions are added. Start with **Must Practice** for a cross-section of all three subcategories, then use the groupings below to focus your remaining time.

## Scenario & Troubleshooting Focus

Terraform troubleshooting in this bank rarely has a one-line fix. A checksum mismatch, an unexpected recreate, a stuck state lock — each requires reading the specific error/plan output carefully before acting, because the *wrong* fast fix (force-unlocking a lock that's actually still held, or letting an unexplained `-/+` through to `apply`) can cause real damage to shared infrastructure. That's deliberate: Terraform questions test restraint and diagnosis at least as much as they test knowing the fix.

The full set of Terraform troubleshooting questions is at [Terraform Troubleshooting Questions](/type/troubleshooting?category=terraform), and the trade-off-heavy scenario questions are at [Terraform Scenario Questions](/type/scenario?category=terraform). Practice these by first writing down exactly what you'd check in the plan output or state before proposing a fix — that's the specific reasoning this bank's questions are built to evaluate.

## Common Mistakes

- **Running `apply` on an unexplained `-/+` without reading which attribute forced replacement.** Terraform tells you directly, via a `# forces replacement` annotation — skipping that check on a stateful production resource is the single riskiest habit this bank's state questions are built to catch.
- **Treating `-target` or `state rm` as routine tools rather than deliberate exceptions.** Both are legitimate in the right, narrow circumstance; reaching for them as a default fix reads as not understanding what they actually risk.
- **Assuming `sensitive = true` keeps a value out of the state file.** It only suppresses console/log output — the plaintext value is still in state. Conflating "hidden from output" with "not stored" is a specific, common misconception.
- **Switching `count` to `for_each` (or the reverse) without a state migration plan.** Without `terraform state mv` or a `moved` block, Terraform will propose destroying and recreating every instance — a candidate who doesn't anticipate this is missing a core piece of how Terraform's state addressing actually works.
- **Proposing a broad architectural rewrite when the real answer is a specific, existing mechanism.** Several state questions in this bank have a precise, mechanism-level correct answer (a `moved` block, `-refresh-only`, `create_before_destroy`) — reaching immediately for "redesign the whole state structure" reads as not knowing the direct tool.

## Recommended Preparation Path

This bank is small (22 questions) — a multi-week schedule would be filler. A more honest plan:

1. **First session:** The eight Must Practice questions below — a genuine cross-section of providers, modules, and state, doable in under two hours.
2. **Second session:** Whichever of Providers, Modules, or State felt weakest, worked through in full.
3. **Third session:** The remaining two subcategories, in the Learning Path order above.
4. **Before the interview:** Revisit Common Mistakes and the troubleshooting/scenario links — the state-management judgment calls are where this bank's real signal concentrates.

## Related Guides

If your interview also covers AWS or Kubernetes, both guides are natural companions — most of this bank's Terraform questions reason about AWS resources specifically, and Terraform-managed Kubernetes clusters raise their own state-and-module questions worth preparing alongside these.

## References

- [Terraform: State](https://developer.hashicorp.com/terraform/language/state)
- [Terraform: Modules](https://developer.hashicorp.com/terraform/language/modules)
- [Terraform: Resource behavior (create_before_destroy)](https://developer.hashicorp.com/terraform/language/resources/behavior)
