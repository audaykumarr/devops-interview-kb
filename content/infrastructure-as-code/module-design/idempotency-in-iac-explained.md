---
id: infrastructure-as-code-module-design-idempotency-001
title: "What does idempotency actually mean for infrastructure-as-code tooling, and what breaks when a module isn't genuinely idempotent?"
category: infrastructure-as-code
subcategory: module-design
technologies:
  - terraform
difficulty: intermediate
question_type:
  - conceptual
tags:
  - infrastructure-as-code
  - idempotency
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Idempotency is described as a core property of good Infrastructure as Code. What does that actually mean concretely for a Terraform module or similar IaC tool, and what specifically breaks when a module isn't genuinely idempotent?

## Short Answer

Idempotency means applying the same configuration multiple times produces the same end result as applying it once — running `terraform apply` twice in a row against unchanged configuration should result in "no changes" the second time, not a different outcome or an error. When a module isn't genuinely idempotent, re-running it can produce unexpected side effects (duplicate resources, unnecessary replacement, drift-detection false positives) that undermine the basic trust an IaC workflow depends on — if applying isn't safely repeatable, engineers can't confidently re-run a pipeline after a failure without risking unintended changes.

## Detailed Explanation

Idempotency is what makes an IaC tool's core workflow (plan, apply, and safely re-running either) trustworthy — without it, every apply carries uncertainty about whether re-running is actually safe, which undermines the basic operational confidence the whole practice of infrastructure-as-code is meant to provide.

**The expected behavior**: applying the exact same declared configuration against infrastructure that already matches it should result in Terraform (or any IaC tool) reporting no changes needed — this is the tool correctly recognizing that current state already satisfies desired state, and it's the property that lets you safely re-run `apply` after, say, a transient network failure interrupted a previous run, without worrying that re-running will duplicate or incorrectly modify something.

**What breaks a module's idempotency, concretely**: using a data source or expression that produces a different value on every run (a timestamp function evaluated at apply time, a random value not properly persisted in state) means the "desired state" itself changes between runs even though the source configuration didn't — Terraform then sees a difference and tries to apply a change on every single run, even though nothing meaningful actually changed, undermining the "no changes" guarantee idempotency is supposed to provide.

**Resources without a properly declared, stable identity can also break idempotency**: if a module's logic for naming or identifying a resource isn't stable across runs (generating a new random suffix each time rather than a fixed or properly-seeded one), each apply might create a duplicate resource rather than recognizing and managing the existing one — a serious bug, since it means the module isn't actually managing a single, consistent resource over time, but rather creating a new one on every run.

**Provider-side non-idempotent behavior can also leak through**: some cloud APIs themselves have operations that aren't naturally idempotent (an API call that always creates something new rather than checking for existence first) — a well-built Terraform provider handles this correctly by tracking the resource in state and checking actual current state before deciding what action to take, but a poorly-implemented custom provider or a misused `null_resource`/`local-exec` provisioner (which runs an arbitrary script with no inherent idempotency guarantee) can reintroduce non-idempotent behavior even within an otherwise idempotent tool.

**Practical consequence when idempotency breaks**: engineers lose the ability to safely re-run apply without careful, manual verification each time — which defeats a core operational benefit of IaC, since "just re-run the pipeline" becomes risky rather than a safe, default response to a failed or interrupted run, forcing more manual caution and slower recovery from routine failures.

## Key Takeaways

- Idempotency means applying the same configuration repeatedly produces the same end result — re-running `apply` against unchanged configuration should report no changes, not perform unexpected actions.
- Non-deterministic values evaluated at apply time (unpinned timestamps, improperly-persisted random values) are a common way module logic breaks idempotency.
- Unstable resource identity/naming logic can cause a module to create duplicate resources on repeated applies instead of managing a single, consistent one.
- Provisioners like `local-exec` and custom provider logic can reintroduce non-idempotent behavior even within an otherwise idempotent tool, since they run arbitrary code without an inherent idempotency guarantee.

## Interview Follow-Up Questions

- How would you test a module specifically for idempotency, beyond just visually inspecting its logic?
- What's the risk of using `local-exec` provisioners in a Terraform module, given their idempotency isn't guaranteed by Terraform itself?
- How would you fix a module that's currently creating duplicate resources on repeated applies due to unstable naming logic?

## References

- [Terraform: Resource Behavior](https://developer.hashicorp.com/terraform/language/resources/behavior)
- [Wikipedia: Idempotence](https://en.wikipedia.org/wiki/Idempotence)
