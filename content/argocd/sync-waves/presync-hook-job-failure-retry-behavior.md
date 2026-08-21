---
id: argocd-sync-waves-presync-hook-failure-retry-001
title: "If an Argo CD PreSync hook Job fails, does Argo CD retry it automatically? How would you make that retry behavior explicit instead of relying on defaults?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
  - configuration
tags:
  - argocd
  - gitops
  - hooks
estimated_time_minutes: 6
companies: []
related_questions:
  - argocd-sync-waves-controlling-apply-order-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A `PreSync` hook Job in Argo CD fails. Does Argo CD automatically retry it, or does the sync just fail outright? How would you make the retry behavior explicit and predictable rather than relying on whatever the default happens to be?

## Short Answer

Argo CD itself does not automatically retry a failed hook — a failed `PreSync` hook marks the sync operation as failed and stops the sync from proceeding to subsequent waves/phases, full stop, unless Argo CD's own sync-level retry (`retry` in the sync policy, or manually retrying the sync) kicks in. Any retry behavior for the Job's own execution *within* a single hook run is governed separately by the Job's own `backoffLimit` (standard Kubernetes Job retry), which is a distinct layer from Argo CD's sync-level retry — making both explicit, rather than relying on either's defaults, is what gives predictable behavior.

## Detailed Explanation

There are two genuinely separate retry mechanisms at play here, and conflating them is the source of most confusion:

**Kubernetes Job-level retries**: a Job's `backoffLimit` (default 6) controls how many times Kubernetes itself retries a failing Pod within that Job before marking the Job as failed. This is about individual Pod failures within one Job execution — a crashed migration script gets a few automatic retries at the Pod level before the Job itself is considered failed. This is standard Kubernetes behavior, unrelated to Argo CD.

**Argo CD sync-level retries**: once the hook Job is marked failed (after exhausting its own `backoffLimit`), Argo CD sees the hook itself as failed. Argo CD does not automatically retry a failed hook by re-running it — the sync operation is marked as failed, and later waves/phases don't proceed. What Argo CD *can* do is retry the overall sync operation (not just the failed hook in isolation) if a `retry` policy is configured on the Application's sync policy (`spec.syncPolicy.retry`, with `limit` and a `backoff` configuration) — this retries the whole sync attempt, including re-running `PreSync` hooks from the top, not the specific failed hook alone.

Given this, relying on defaults means: a hook Job retries a few times internally (Kubernetes' default `backoffLimit`), and if it still fails, the sync simply fails with no automatic recovery unless Argo CD's `syncPolicy.retry` happens to be configured — which isn't the default for a manually-created Application. Making this explicit means deliberately setting both layers: an appropriate `backoffLimit` on the Job itself (tuned for how many Pod-level retries make sense for that specific migration/task), and an explicit `syncPolicy.retry` on the Application if automatic sync-level retry on hook failure is actually desired — rather than assuming either layer behaves the way you'd guess.

## Key Takeaways

- Argo CD does not automatically retry a failed `PreSync` hook by itself — a failed hook fails the sync.
- Kubernetes Job `backoffLimit` retries failed Pods within one Job execution — a separate, lower-level mechanism from Argo CD's own retry behavior.
- Argo CD's `syncPolicy.retry` retries the whole sync operation (re-running hooks from the top), not just the specific failed hook.
- Explicitly configuring both `backoffLimit` and `syncPolicy.retry` (if desired) avoids relying on assumptions about default retry behavior.

## Interview Follow-Up Questions

- What happens to a `PreSync` hook Job that succeeded on a previous sync if the overall sync is retried after a later hook fails?
- How would you distinguish "the migration itself is broken and retrying won't help" from "this was a transient failure worth retrying," in terms of alerting design?
- How does `syncPolicy.retry`'s backoff configuration work, and how would you tune it for a slow-starting dependency?

## References

- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
- [Argo CD: Sync options and automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Kubernetes Docs: Jobs — Pod backoff failure policy](https://kubernetes.io/docs/concepts/workloads/controllers/job/#pod-backoff-failure-policy)
