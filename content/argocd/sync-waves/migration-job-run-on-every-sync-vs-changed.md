---
id: argocd-sync-waves-migration-job-every-sync-vs-changed-001
title: "How would you handle an Argo CD migration Job that should run on every sync versus one that should only run when the migration itself actually changed?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - kubernetes
difficulty: advanced
question_type:
  - practical
  - configuration
tags:
  - argocd
  - gitops
  - kubernetes
  - jobs
estimated_time_minutes: 7
companies: []
related_questions:
  - argocd-sync-waves-controlling-apply-order-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A migration Job managed by Argo CD needs different behavior depending on the situation: sometimes it should run on every single sync (an idempotent reconciliation step), other times it should only run when the migration's own content actually changed (a one-time schema change). How would you configure each case correctly?

## Short Answer

For "run on every sync," use a `PreSync` hook with `hook-delete-policy: BeforeHookCreation` so Argo CD deletes and recreates the Job fresh on every sync, regardless of whether its manifest changed — Kubernetes Jobs are immutable once created, so without this policy a second sync with an unchanged Job manifest would just fail to reapply. For "run only when the migration content actually changed," let the Job's name (or a hash annotation) be derived from the migration's content, so an unchanged migration produces an identical Job that Argo CD sees as nothing-to-do, while a changed migration produces a genuinely new Job object that gets created and run.

## Detailed Explanation

Kubernetes Jobs are immutable by design — once created, most of a Job's spec can't be updated in place. This creates a real friction point for GitOps-managed migration Jobs, because a normal sync just re-applies the same manifest, and a re-apply of an unchanged Job resource is a no-op (nothing to run again), while a re-apply after editing a Job in place typically fails outright (Kubernetes rejects most spec mutations on an existing Job).

For the "run on every sync" case — think a reconciliation script that's cheap and safe to repeat, not a one-time migration — the fix is Argo CD's hook deletion policies. Annotating the Job as a `PreSync` hook with `argocd.argoproj.io/hook-delete-policy: BeforeHookCreation` tells Argo CD to delete the existing Job (from the prior sync) before creating a fresh one on this sync, sidestepping the immutability problem entirely by never trying to update an existing Job in place — each sync gets a brand-new Job object with the same name, and Argo CD's normal hook lifecycle (wait for it to complete before proceeding) still applies.

For the "run only when content actually changed" case, the goal is different: you want an unchanged migration to result in *no* Job execution at all, and a changed migration to run exactly once. The reliable pattern is deriving the Job's name (or a label/annotation) from a hash of the migration's actual content — for example, naming the Job `migrate-<short-hash-of-migration-sql>`. When the migration content is unchanged, the hash is unchanged, so Argo CD sees the identical Job manifest it already applied and treats it as already-synced (no new Job created, nothing runs again). When the migration content changes, the hash changes, producing a genuinely new Job name — a new object Argo CD creates and runs, while the old (now-orphaned) Job from the previous migration can be cleaned up via a `PreSync` hook with an appropriate deletion policy, or left for a separate cleanup mechanism if historical Job records are useful to keep.

The key distinction driving the two approaches: "every sync" wants Argo CD to always treat the Job as new (via deletion-before-creation), while "only on change" wants Argo CD to naturally see it as unchanged unless the actual content changed (via content-derived naming) — they're solving the immutability problem from opposite directions.

## Key Takeaways

- Kubernetes Jobs are immutable once created, which conflicts with GitOps' normal "re-apply the same manifest" reconciliation model.
- `hook-delete-policy: BeforeHookCreation` forces a fresh Job on every sync by deleting the old one first — the right tool for "run every time."
- Deriving the Job's name from a hash of its actual content makes an unchanged migration a no-op and a changed migration a genuinely new object — the right tool for "run only when changed."
- The two patterns solve immutability from opposite directions: always-treat-as-new versus naturally-detect-as-unchanged.

## Interview Follow-Up Questions

- How would you clean up old, hash-named migration Jobs so they don't accumulate indefinitely in the cluster?
- What would go wrong if you used content-hash naming for a Job that's meant to run on every sync instead?
- How would you handle a migration that needs to run exactly once across an entire fleet of clusters, not just once per cluster?

## References

- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
- [Kubernetes Docs: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
