---
id: helm-releases-helm-test-vs-hooks-001
title: "What's the difference between a helm test resource and a Helm lifecycle hook, and when would you use each?"
category: helm
subcategory: releases
technologies:
  - helm
difficulty: intermediate
question_type:
  - comparison
tags:
  - helm
  - testing
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A chart could validate a deployment either with a `helm.sh/hook: test` resource (invoked separately via `helm test`) or with a `pre-install`/`post-install` hook that runs automatically as part of `helm install`. Both are technically "hooks" in Helm's mechanism. What's the actual difference in when and how they run, and which fits a given validation need?

## Short Answer

A `test` hook only ever runs when explicitly invoked via `helm test <release>` — it never runs automatically as part of install/upgrade, and is meant for on-demand, post-deployment smoke testing that a human or a separate pipeline step chooses to trigger. `pre-install`/`post-install`/`pre-upgrade`/`post-upgrade` hooks run automatically as an integrated part of the install/upgrade lifecycle itself, and can block (or fail) the release operation they're attached to.

## Detailed Explanation

**`test` hooks are opt-in and decoupled from the install/upgrade lifecycle entirely**: a resource annotated `helm.sh/hook: test` is deployed along with the release but does nothing on its own — it only executes when someone explicitly runs `helm test <release-name>`, which is typically a separate, deliberate step (run manually, or as its own distinct CI pipeline stage after a deployment) rather than something that happens automatically during `helm install`/`helm upgrade`.

**Lifecycle hooks (`pre-install`, `post-install`, etc.) are integrated into the install/upgrade flow itself**: these run automatically at their designated point in the release process, and — critically — their success or failure directly affects whether the release operation itself succeeds; a failing `pre-install` hook blocks the install from proceeding at all, which is fundamentally different from a `test` hook's result, which never blocks anything since it isn't part of any install/upgrade operation to begin with.

**`test` hooks are the right fit for smoke-testing after deployment, without gating the deployment itself**: a chart validating "can the deployed application actually serve a basic request" as a `test` resource lets that check be run whenever convenient (immediately after deploy, periodically, or before promoting to the next environment) without making that specific check a hard gate on the deployment succeeding in the first place — useful when you want the check to exist and be runnable, but not necessarily always required to pass before the release is considered installed.

**Lifecycle hooks are the right fit for something that genuinely must happen (and succeed) as part of the release operation**: a database migration that the new application version depends on is a `pre-upgrade` (or `pre-install`) hook precisely because the upgrade shouldn't be considered successful — and the new application pods shouldn't start — unless that migration actually succeeded first; this is a hard dependency on the release process itself, not an optional post-deploy check.

**Both use the same underlying `helm.sh/hook` annotation mechanism, differing only in the hook type value and how/when they're invoked**: understanding that `test` is simply one more value for the same annotation (alongside `pre-install`, `post-upgrade`, and others) — rather than a fundamentally different Helm feature — clarifies that the difference is entirely about invocation trigger and blocking behavior, not about the underlying mechanism.

## Key Takeaways

- `test` hooks only run when explicitly invoked via `helm test` — never automatically during install/upgrade, and never block a release operation.
- Lifecycle hooks (`pre-install`, `post-upgrade`, etc.) run automatically as part of the install/upgrade flow and can block or fail that operation.
- Use `test` for optional, on-demand post-deployment smoke testing; use lifecycle hooks for something that must succeed as a hard prerequisite of the release operation itself.
- Both use the same `helm.sh/hook` annotation mechanism — the difference is entirely in the hook type value's invocation trigger and blocking behavior.

## Interview Follow-Up Questions

- How would you integrate `helm test` into a CI/CD pipeline as a required gate before promoting a release to the next environment?
- What would happen if a `test` hook resource is left in the cluster after `helm test` runs — does it get cleaned up automatically?
- How would you design a chart that needs both an automatic pre-upgrade migration hook and an optional post-deploy smoke test, without confusing the two purposes?

## References

- [Helm: Chart Tests](https://helm.sh/docs/topics/chart_tests/)
- [Helm: Chart Hooks](https://helm.sh/docs/topics/charts_hooks/)
