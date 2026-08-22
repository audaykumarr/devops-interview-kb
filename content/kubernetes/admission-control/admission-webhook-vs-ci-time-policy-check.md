---
id: kubernetes-admission-webhook-vs-ci-time-policy-check-001
title: "For enforcing a new policy, when does it belong in a cluster admission webhook versus a CI-time check before deployment even happens?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - architecture
  - comparison
tags:
  - kubernetes
  - admission-control
  - ci-cd
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A new policy needs enforcing — say, "every Deployment must have resource limits set." This could be checked in CI (before a manifest is ever applied) or via a cluster-side admission webhook (at the moment of apply). Both would eventually catch a violation. What actually determines which layer is the right place to enforce it, and would you ever want both?

## Short Answer

CI-time checks catch violations early (before anything reaches the cluster) and give fast, developer-friendly feedback, but only cover paths that actually go through that CI pipeline — anything applied directly (`kubectl apply`, a different pipeline, an emergency manual change) bypasses it entirely. A cluster admission webhook is the only mechanism that genuinely can't be bypassed, since it evaluates every request regardless of source — for any policy that's a genuine hard requirement (not just a best-practice nudge), the admission webhook is the actual enforcement layer, with a CI-time check as a valuable complementary fast-feedback layer, not a substitute for it.

## Requirements

- A genuine policy requirement must be enforced regardless of how a manifest reaches the cluster (CI pipeline, direct `kubectl apply`, a different tool).
- Developers should get feedback as early and fast as possible, ideally before anything is even attempted against the cluster.
- The enforcement design shouldn't create a false sense of security by relying on a bypassable check as if it were the real guarantee.

## Detailed Explanation

The key distinction is coverage: a CI-time check only sees what goes through that specific pipeline, while an admission webhook sees literally every request reaching the API server — this difference in coverage is what determines which layer can actually be trusted as the enforcement mechanism versus which layer is a valuable but non-exhaustive complement.

## Architecture

**CI-time checks are fast, cheap, and give the earliest possible feedback — but only for what goes through them**: a policy check run as part of a CI pipeline (linting a manifest, running `conftest`/`kyverno test` against it before merge) gives a developer feedback in minutes, before anything is ever applied — this is valuable purely for developer experience, catching mistakes at the point they're cheapest to fix. But it only covers manifests that actually flow through that specific CI pipeline.

**Admission webhooks see every request, regardless of source, which is what makes them the genuine enforcement layer**: `kubectl apply` run directly by someone with cluster access, a different team's pipeline that doesn't include the same CI check, an emergency manual fix during an incident — none of these go through your CI pipeline, but all of them go through the API server, which is exactly where an admission webhook evaluates every single request. For a policy that must genuinely always hold true, this is the only layer that can actually guarantee it.

**Treat CI-time checks as fast feedback, and the admission webhook as the actual guarantee**: this isn't redundancy for its own sake — the CI check exists to give developers a fast, cheap, pre-cluster signal (shifting the feedback left, in the usual sense), while the admission webhook exists to be the thing that's actually true regardless of what path a request took to reach the cluster. A policy enforced only in CI, with no cluster-side backstop, isn't actually enforced — it's enforced only for people who used the expected pipeline.

**The admission webhook's policy logic and the CI check's policy logic should ideally be the same underlying rules, expressed in both places**: using the same policy engine (Kyverno or Gatekeeper's Rego, for instance) both as a CI-time check (via their respective CLI test tools) and as the cluster's actual admission webhook avoids policy drift between the two layers — a policy that's stricter or looser in one layer than the other undermines the "fast feedback for the same thing that's actually enforced" value proposition.

## Trade-offs

Running the same policy check in two places (CI and admission webhook) means maintaining that policy logic in a way that stays synchronized across both — some tooling supports this natively (the same policy source used for both a CLI test command and the deployed webhook), which minimizes the duplication cost; without that, keeping two independently-maintained policy definitions in sync is real ongoing overhead. This cost is worth it specifically because the value each layer provides (fast feedback vs. genuine guarantee) is different and neither one substitutes for the other.

## Key Takeaways

- CI-time checks give fast, early feedback but only cover whatever actually goes through that pipeline — anything bypassing it (direct `kubectl apply`, a different pipeline) isn't checked.
- Admission webhooks see every request reaching the API server regardless of source, making them the only mechanism that can genuinely guarantee a policy always holds.
- Treat CI-time checks as a developer-experience layer (fast feedback) and the admission webhook as the actual enforcement guarantee — they serve different, complementary purposes, not redundant ones.
- Use the same underlying policy definitions in both layers where tooling supports it, to avoid drift between what CI checks and what the cluster actually enforces.

## Interview Follow-Up Questions

- How would you handle a policy violation that CI didn't catch (because the change bypassed CI) but the admission webhook correctly blocked — how would you close that pipeline gap going forward?
- What's the trade-off of running policy checks in CI using the exact same tool/config as the cluster webhook, versus using a different, CI-specific linting tool?
- How would you decide which specific policies genuinely need cluster-side enforcement versus which are fine as CI-only best-practice nudges?

## References

- [Open Policy Agent: Conftest](https://www.conftest.dev/)
- [Kyverno: Testing Policies](https://kyverno.io/docs/kyverno-cli/)
