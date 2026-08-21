---
id: cloud-fundamentals-iaas-to-paas-migration-evaluation-001
title: "How would you evaluate whether to move an existing IaaS-hosted application to a PaaS, given the migration cost involved?"
category: cloud-fundamentals
subcategory: service-models
technologies:
  - cloud
difficulty: intermediate
question_type:
  - conceptual
  - scenario
tags:
  - cloud-fundamentals
  - iaas
  - paas
  - migration
estimated_time_minutes: 7
companies: []
related_questions:
  - cloud-fundamentals-iaas-paas-saas-decision-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An application currently runs on IaaS (self-managed VMs) and works fine, but a PaaS option exists that could reduce operational overhead. How would you actually evaluate whether the migration is worth it, given that migrating itself has a real cost?

## Short Answer

Weigh the ongoing operational burden the team is actually paying today (patching, scaling logic, deployment tooling, on-call load) against the one-time migration cost (re-architecting anything that depends on IaaS-specific setup, testing, cutover risk) and the PaaS platform's constraints going forward — the migration is worth it when the ongoing savings, compounded over a realistic time horizon, clearly exceed the migration cost and the team isn't giving up something it genuinely needs from the IaaS-level control.

## Detailed Explanation

The evaluation has two distinct halves that are often conflated: what you're currently paying in ongoing operational cost, and what the one-time migration actually costs. Being clear-eyed about both matters — teams often overweight one and underweight the other.

**Ongoing cost of staying on IaaS**: this is the real, recurring tax of self-managing infrastructure — OS patching and security updates, building and maintaining deployment/scaling automation that PaaS would provide out of the box, and the on-call burden of infrastructure-level incidents (a VM running out of disk, a scaling event that didn't trigger correctly) that a PaaS platform would absorb. This cost is easy to underestimate because it's diffuse — spread across many small tasks and interruptions rather than one visible line item — but it's real and compounds over the application's remaining lifetime.

**One-time migration cost**: this includes re-architecting anything that assumes IaaS-level control the PaaS doesn't offer (custom OS-level configuration, specific kernel modules, non-standard networking setups), the actual engineering time to port the deployment, and — often underweighted — the cutover risk itself: a migration is a window where something can go wrong that wouldn't otherwise, and that risk has a cost even if the migration ultimately succeeds cleanly.

**What you give up going forward**: PaaS constrains you to what the platform supports — specific runtimes, specific scaling knobs, less visibility into what's happening below the application layer when something goes wrong in a way that requires infrastructure-level debugging. If the application has genuine non-standard requirements (unusual performance tuning, a runtime the PaaS doesn't support well, compliance requirements around infrastructure control), this constraint might make PaaS a worse fit regardless of operational savings.

The concrete evaluation: estimate the ongoing operational cost as a recurring number (engineer-hours per month, or incidents per quarter attributable to infrastructure-level concerns), estimate the one-time migration cost as effort plus a risk-adjusted cutover cost, and project forward over a realistic horizon (a year or more, since a migration that pays back in 18 months is a different decision than one that never pays back). If the application is expected to be actively maintained and scaled for years, the ongoing savings compound and migration is more likely to be worth it; if the application is near end-of-life or rarely touched, the migration cost may simply never be recouped.

## Key Takeaways

- Evaluate the recurring operational cost of staying on IaaS against the one-time migration cost and cutover risk — not just a gut feeling that "PaaS would be nicer."
- Ongoing IaaS operational cost is easy to underestimate because it's diffuse (small recurring tasks and interruptions) rather than one visible number.
- PaaS's constraints (limited runtime/scaling flexibility, less infrastructure-level visibility) are a real cost if the application has genuine non-standard requirements.
- Project the trade-off over the application's realistic remaining lifetime — a near-end-of-life application rarely justifies migration cost.

## Interview Follow-Up Questions

- How would you estimate "engineer-hours spent on infrastructure operations" concretely enough to put a number on it?
- What would make you conclude a migration should NOT happen, even if the operational savings look favorable on paper?
- How would you de-risk the cutover itself, e.g. running both environments in parallel before fully committing?

## References

- [AWS: Migrating to the Cloud (migration strategies overview)](https://aws.amazon.com/cloud-migration/)
- [Google Cloud: IaaS vs PaaS vs SaaS](https://cloud.google.com/learn/paas-vs-iaas-vs-saas)
