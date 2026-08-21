---
id: infrastructure-as-code-drift-terraform-target-flag-risk-001
title: "What's the risk of using terraform apply -target to fix drift on just one resource, and when is it actually the right call?"
category: infrastructure-as-code
subcategory: drift
technologies:
  - terraform
difficulty: intermediate
question_type:
  - conceptual
tags:
  - infrastructure-as-code
  - terraform
  - drift
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`terraform apply -target=<resource>` applies changes to just one specific resource instead of the full plan. It's tempting to reach for when fixing a single drifted resource. What's the actual risk of using it this way, and when is it genuinely the right call?

## Short Answer

`-target` bypasses Terraform's normal dependency-graph-aware planning for everything outside the targeted resource, meaning it can apply a change that's inconsistent with the rest of the configuration's current intended state, and it deliberately produces a plan that doesn't reflect the *full* configuration — using it routinely trains a false sense that a plan is complete when it's actually partial. It's appropriate as a narrow, deliberate tool for a specific, well-understood situation (isolating a risky change, working around a provider bug blocking the full plan) — not as a routine way to "fix one drifted thing" without running a full plan to see the complete picture.

## Detailed Explanation

Terraform's normal `plan`/`apply` flow considers the entire configuration's dependency graph, ensuring that when a change to one resource affects another (a security group's ID changing, which other resources reference), that downstream effect is captured in the plan too. `-target` deliberately narrows this to a specific resource (and its dependencies, but not resources that depend on it) — meaning changes to that one resource are applied without necessarily re-evaluating everything that might be affected by it.

For drift-fixing specifically, this creates a real risk: if the drifted resource has any relationship to other resources in the configuration, a `-target`-scoped apply might fix the immediate drift while leaving a now-inconsistent state elsewhere that a full plan would have caught and addressed together. It also means the applied change isn't validated against the *complete* current plan — Terraform's own documentation specifically warns that `-target` should be used sparingly, since routine reliance on it can mask real configuration drift or errors that a full plan would surface, precisely because you're only looking at a narrow slice of the picture each time.

**When it's genuinely appropriate**: isolating a specific, well-understood, low-risk change you want applied immediately without waiting for or being affected by unrelated pending changes elsewhere in a large configuration; working around a provider bug or a specific resource's plan/apply failure that's blocking the full configuration's plan from succeeding at all, as a temporary, deliberate workaround; or during incident response, when applying a very specific fix quickly matters more than running (and reviewing) the full plan first — used deliberately, with the understanding that a full `plan`/`apply` should follow afterward to confirm the complete configuration is genuinely consistent.

**When it's the wrong habit**: reaching for `-target` routinely as a shortcut to avoid reviewing a large plan's full diff, or as a default way to "just fix this one drifted thing" without ever following up with a full plan — this is exactly the pattern that risks masking real, unrelated issues elsewhere in the configuration that a full plan would have surfaced.

## Key Takeaways

- `-target` narrows Terraform's plan/apply to one resource (and its dependencies), bypassing full dependency-graph-aware evaluation of everything else.
- Routine use risks masking real, unrelated drift or errors elsewhere that a full plan would have caught.
- Genuinely appropriate uses: isolating a specific low-risk change, working around a blocking provider bug, or urgent incident response — always followed by a full plan/apply to confirm overall consistency.
- The wrong habit is using `-target` as a routine shortcut to avoid reviewing a large plan, rather than as a deliberate, narrow exception.

## Interview Follow-Up Questions

- How would you communicate to a team the difference between `-target` as an emergency tool versus a routine workflow habit?
- What would you check immediately after a `-target`-scoped apply to confirm nothing was left inconsistent?
- How does `-target` interact with Terraform's state locking, compared to a full apply?

## References

- [Terraform: Resource Targeting](https://developer.hashicorp.com/terraform/cli/commands/plan#resource-targeting)
- [Terraform: State and drift](https://developer.hashicorp.com/terraform/language/state)
