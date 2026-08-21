---
id: argocd-sync-waves-controlling-apply-order-001
title: "How do you control the order Argo CD applies resources within a single Application, e.g. making sure a database migration Job completes before the Deployment that depends on it rolls out?"
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
  - sync-waves
  - kubernetes
estimated_time_minutes: 8
companies: []
related_questions:
  - argocd-sync-waves-migration-job-every-sync-vs-changed-001
  - argocd-sync-waves-presync-hook-failure-retry-001
  - argocd-sync-waves-argocd-hooks-vs-helm-hooks-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An Argo CD Application manages both a database migration Job and the Deployment that depends on that migration having completed. By default, Argo CD applies all manifests roughly together with no guaranteed order. How do you control the order resources are applied within a single Application, and specifically ensure the migration Job finishes before the Deployment rolls out?

## Short Answer

Argo CD supports **sync waves** via the `argocd.argoproj.io/sync-wave` annotation — resources are grouped into numbered waves and applied in ascending order, waiting for each wave's resources to be healthy before starting the next — so putting the migration Job in an earlier wave (e.g. `-1`) than the Deployment (wave `0`, the default) guarantees the Job completes successfully before the Deployment is applied.

## Detailed Explanation

Without sync waves, Argo CD applies all resources in an Application together, relying only on Kubernetes' own inherent ordering guarantees (which are minimal — there's no built-in "wait for this Job before creating that Deployment"). Sync waves solve this by adding an explicit ordering dimension: every resource gets an implicit wave of `0` unless annotated otherwise, and Argo CD applies wave `-1` before wave `0` before wave `1`, and so on, waiting for each wave to reach a healthy state (for a Job, that means completing successfully) before proceeding to the next wave.

For the migration-before-deployment case specifically, annotating the Job with `argocd.argoproj.io/sync-wave: "-1"` puts it in an earlier wave than the Deployment's default wave `0` — Argo CD applies the Job first, waits for it to reach `Healthy` status (which for a Job means the pod completed successfully, not just started), and only then proceeds to apply the Deployment. If the migration Job fails, the sync stops there and the Deployment is never applied with a broken schema underneath it, which is exactly the safety property being sought.

Sync waves handle ordering between distinct resources; for finer control tied to sync lifecycle events, Argo CD also supports **resource hooks** (`PreSync`, `Sync`, `PostSync`, `SyncFail`) via the `argocd.argoproj.io/hook` annotation — commonly used for the same migration use case as an alternative to sync waves, where the migration Job is annotated as a `PreSync` hook so it runs and must succeed before the main sync proceeds at all, and a cleanup Job can be annotated `PostSync` to run only after everything else succeeds. Hooks and waves can be combined: a `PreSync` hook resource can itself carry a wave annotation to control its order relative to other hooks in the same phase.

## Key Takeaways

- Sync waves (`argocd.argoproj.io/sync-wave` annotation) order resource application within an Application, waiting for each wave to become healthy before the next starts.
- A Job's "healthy" state for wave-completion purposes means it completed successfully, not merely that it was created.
- Resource hooks (`PreSync`/`Sync`/`PostSync`/`SyncFail`) provide an alternative, lifecycle-event-based mechanism for the same class of ordering problem, and can be combined with waves.
- A failed early-wave resource stops the sync, preventing later-wave resources (like a Deployment depending on a migration) from being applied against a broken precondition.

## Interview Follow-Up Questions

- How would you handle a migration Job that needs to run on every sync versus only when the migration itself changed?
- What happens if a `PreSync` hook Job fails — does Argo CD retry it automatically, and how would you make that behavior explicit?
- How does this compare to how Helm handles pre-install/pre-upgrade hooks, given Argo CD can also deploy Helm charts?

## References

- [Argo CD: Sync waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
- [Argo CD: Sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
