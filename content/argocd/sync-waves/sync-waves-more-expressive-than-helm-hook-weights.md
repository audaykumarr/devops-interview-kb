---
id: argocd-sync-waves-more-expressive-than-helm-weights-001
title: "Why might Argo CD's sync-wave model be considered more expressive than Helm's own hook-weight system for controlling ordering?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - helm
difficulty: advanced
question_type:
  - comparison
tags:
  - argocd
  - helm
  - sync-waves
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Both Helm hook weights and Argo CD sync waves let you control ordering of applied resources. Why might Argo CD's sync-wave model be considered more expressive than Helm's own hook-weight system?

## Short Answer

Helm's hook weights only order resources *within* the same hook type (all `pre-install` hooks relative to each other, for instance) — they don't provide a way to order regular, non-hook resources relative to each other or relative to hooks in a unified scheme. Argo CD's sync waves apply uniformly to *any* resource, hook or not, giving one consistent, unified ordering mechanism across an entire Application's resources — a more general and expressive model than Helm's hook-specific weighting.

## Detailed Explanation

**Helm's hook weight system is scoped to hooks specifically**: the `helm.sh/hook-weight` annotation orders resources *within* a given hook type — if you have multiple `pre-install` hooks, weight determines their relative order among themselves. But this mechanism doesn't extend to ordering regular application resources (a Deployment relative to a ConfigMap, say) at all — Helm's regular (non-hook) resources are applied together, with no fine-grained ordering control between them beyond Kubernetes' own limited implicit ordering.

**Argo CD's sync waves apply to any resource uniformly**: the `argocd.argoproj.io/sync-wave` annotation works the same way regardless of whether the resource is also marked as a hook (`PreSync`/`Sync`/`PostSync`) or is just a regular application resource — every resource in an Application, hook or not, gets an implicit or explicit wave number, and Argo CD applies wave `-1` before wave `0` before wave `1`, uniformly. This means you can express "this ConfigMap before that Deployment, before this other Service" using the exact same mechanism as "this migration Job before this Deployment" — one consistent model covering both hook-timing and general resource-ordering, rather than two separate, more limited mechanisms.

**Combining waves with hooks gives finer control than either alone**: since a resource can be both a hook (with a lifecycle phase like `PreSync`) and carry a wave number, Argo CD lets you express "these three `PreSync` hooks should run in this specific relative order" — combining the hook's lifecycle-phase semantics with the wave's ordering semantics — a level of combined expressiveness Helm's hook-weight-only system, scoped just to ordering within one hook type, doesn't provide on its own.

**Practical consequence**: a complex deployment needing precise ordering across a mix of hooks and regular resources (say, a ConfigMap, then a migration Job hook, then a Deployment, then a validation hook) can express that entire sequence through one unified wave-numbering scheme in Argo CD, whereas achieving the equivalent with Helm alone would require working within the more limited scope of what hook weights can actually order (just hooks relative to other hooks of the same type), likely requiring workarounds for anything involving regular resources.

## Key Takeaways

- Helm's hook weights only order resources within the same hook type, not regular application resources relative to each other or to hooks.
- Argo CD's sync waves apply uniformly to any resource, hook or not, providing one consistent ordering mechanism across an entire Application.
- Combining wave numbers with hook lifecycle phases gives Argo CD finer combined expressiveness than Helm's hook-weight-only system.
- Complex deployments needing precise ordering across a mix of hooks and regular resources are more naturally expressed through Argo CD's unified wave model than Helm's more limited hook-scoped weighting.

## Interview Follow-Up Questions

- How would you design a sync-wave numbering scheme for a deployment with many interdependent resources, to keep it maintainable as the Application grows?
- What would you lose, specifically, if you tried to replicate Argo CD's cross-resource ordering using only Helm's native hook-weight system?
- How does this expressiveness difference factor into deciding whether to deploy a chart via Argo CD versus plain Helm CLI?

## References

- [Argo CD: Sync waves](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)
- [Helm: Chart Hooks — Hook weights](https://helm.sh/docs/topics/charts_hooks/#hook-weights)
