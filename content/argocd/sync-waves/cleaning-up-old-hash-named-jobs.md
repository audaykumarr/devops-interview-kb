---
id: argocd-sync-waves-cleaning-up-hash-named-jobs-001
title: "How would you clean up old, hash-named Argo CD migration Jobs so they don't accumulate indefinitely in the cluster?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - kubernetes
difficulty: intermediate
question_type:
  - practical
tags:
  - argocd
  - kubernetes
  - jobs
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Naming migration Jobs by a hash of their content (so a changed migration produces a new Job) avoids re-running unchanged migrations, but leaves old, no-longer-referenced Job objects behind after each change. How would you clean these up so they don't accumulate indefinitely?

## Short Answer

Use Kubernetes' built-in Job TTL mechanism (`ttlSecondsAfterFinished`) to have completed Jobs automatically garbage-collected after a set period, combined with (or instead of) an explicit `PreSync` hook with an appropriate deletion policy that removes the previous hash-named Job as part of the next sync — either approach avoids Jobs accumulating forever, with the TTL mechanism being simpler and Kubernetes-native, while the hook-based approach gives more precise control over exactly when cleanup happens relative to the sync lifecycle.

## Detailed Explanation

**`ttlSecondsAfterFinished` — the simplest, Kubernetes-native approach**: setting this field on the Job spec tells the Kubernetes Job controller to automatically delete the Job (and its Pods) some number of seconds after it completes, regardless of anything Argo CD-specific — this requires no additional hook logic and works using a mechanism Kubernetes itself provides for exactly this class of cleanup problem. The trade-off is less precise control over *when* cleanup happens relative to Argo CD's own sync lifecycle — it's purely time-based, not tied to "this Job is now definitely superseded."

**Explicit cleanup via an Argo CD hook**: a `PreSync` hook (or a separate cleanup mechanism triggered on each sync) that explicitly finds and deletes old, no-longer-referenced hash-named Jobs — identified by a label indicating they belong to this migration's lineage but don't match the current expected hash — gives more precise, sync-tied cleanup, removing old Jobs specifically when a new migration supersedes them rather than waiting for a fixed time delay.

**Labeling for identifiability**: whichever cleanup mechanism is used, consistently labeling migration Jobs (e.g. `migration-name: <base-name>`) alongside their hash-based name makes it straightforward to query "all Jobs belonging to this migration's lineage" for either a TTL-based approach's monitoring or an explicit cleanup hook's targeting logic, rather than needing to parse or guess from the Job name itself.

**Consider whether keeping some history has value**: not accumulating *indefinitely* doesn't necessarily mean deleting immediately — keeping the last few completed migration Jobs around (a bounded retention, not literally forever) can have real diagnostic value (reviewing exactly what a past migration did, or its logs, during a later investigation) — a TTL set to something like a week, or an explicit cleanup that retains the last N Jobs rather than deleting immediately on supersession, balances cleanup against retained diagnostic value.

**Combining both is often the most robust**: a `ttlSecondsAfterFinished` as a safety-net backstop (ensuring nothing accumulates forever even if the explicit cleanup logic has a bug or gap) alongside more precise, sync-tied explicit cleanup for the common case gives both convenience and robustness.

## Key Takeaways

- `ttlSecondsAfterFinished` is the simplest, Kubernetes-native way to ensure completed Jobs are eventually garbage-collected, with no Argo CD-specific logic needed.
- An explicit `PreSync` cleanup hook gives more precise, sync-tied control over exactly when old Jobs are removed, at the cost of more logic to build and maintain.
- Consistent labeling of migration Jobs by their lineage (separate from the hash-based name) makes either cleanup approach easier to implement correctly.
- Consider bounded retention (keeping the last few completed Jobs) rather than immediate deletion, preserving some diagnostic value from past migration runs.

## Interview Follow-Up Questions

- How would you monitor that the cleanup mechanism is actually working, rather than silently failing and letting Jobs accumulate anyway?
- What TTL duration would you choose, and how would you justify that specific number?
- How would this cleanup approach differ for a migration Job pattern used across many different services in the same cluster?

## References

- [Kubernetes Docs: Automatic Cleanup for Finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/#ttl-mechanism-for-finished-jobs)
- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
