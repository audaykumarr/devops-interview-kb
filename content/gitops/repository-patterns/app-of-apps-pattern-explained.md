---
id: gitops-repository-patterns-app-of-apps-001
title: "What problem does the 'app of apps' pattern actually solve in GitOps, and when would you reach for it instead of just managing each application independently?"
category: gitops
subcategory: repository-patterns
technologies:
  - gitops
  - argocd
difficulty: intermediate
question_type:
  - conceptual
tags:
  - gitops
  - argocd
  - app-of-apps
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Argo CD (and GitOps more broadly) documentation frequently mentions the "app of apps" pattern. What problem does it actually solve, and when would you reach for it instead of just managing each application independently?

## Short Answer

App of apps solves the problem of bootstrapping and managing many related Applications declaratively, as a single unit — instead of manually creating each Application resource individually (via UI clicks or separate `kubectl apply` commands), you define a single "parent" Application whose entire purpose is to declare and manage a set of "child" Applications, so adding, removing, or reconfiguring the whole set is itself a Git-tracked, reviewable change, not a manual, untracked operational task.

## Detailed Explanation

Without app of apps, managing many Applications means each one exists as an individually, manually-created resource — which works fine for a handful of applications but becomes an operational and governance gap as the number grows: there's no single Git-tracked source of truth for "which Applications should exist," onboarding a new one requires a manual step outside your normal GitOps review process, and there's no easy way to apply a consistent baseline configuration across many Applications at once.

**The parent Application manages the existence of child Applications, applying the same GitOps principle one level up**: the parent Application's own "manifest" is itself a set of Argo CD Application resource definitions — so declaring, in Git, that "this set of 15 Applications should exist, each pointing at this specific service's manifests" becomes a Git-tracked, PR-reviewable change, exactly the same way any other GitOps-managed resource is, rather than a manual operational task performed outside the review process.

**Onboarding a new application becomes a Git commit, not a manual click**: adding a 16th Application to the set is now a change to the parent Application's declared child list, going through the same PR review and audit trail as any other GitOps change — this is a meaningful governance improvement over manually creating a new Application resource via the Argo CD UI or CLI, which leaves no equivalent review trail.

**A consistent baseline can be applied across the managed set**: since the parent Application generates the child Application definitions (often via templating, e.g. Helm or Kustomize generating the child manifests from a shared pattern), it's straightforward to apply consistent defaults (sync policy, project assignment, common labels) across every managed child, rather than each child Application's configuration being independently, manually set and prone to drifting inconsistently over time.

**This is a genuinely different concern from what a single Application already handles**: a single Application already manages the GitOps reconciliation for one service's Kubernetes resources — app of apps adds a layer managing the reconciliation of the *set of Applications themselves*, which matters specifically once you have enough applications that manually managing that set becomes its own operational burden.

**When it's not worth reaching for**: for a small number of applications (a handful), the overhead of an additional templating/parent-Application layer may not be worth it relative to just directly, manually managing each Application — app of apps earns its complexity specifically at the point where manually tracking "which Applications exist and how they're configured" has itself become a real operational and governance gap, not as a default starting pattern for every GitOps setup regardless of scale.

## Key Takeaways

- App of apps solves managing the existence and baseline configuration of many Applications declaratively, applying the same GitOps principle (Git as source of truth) one level up from individual resource management.
- Onboarding a new managed application becomes a reviewable Git commit rather than a manual, untracked operational step.
- The pattern also enables applying consistent defaults across a set of managed Applications via templating, rather than each one's configuration independently drifting.
- It earns its complexity at meaningful scale (many applications), not as a default starting pattern for a small handful managed directly.

## Interview Follow-Up Questions

- How would you structure app of apps to support different configuration per environment (dev, staging, production) for the same set of underlying applications?
- What are the risks of a bug in the parent Application's templating logic, given it affects every child Application it manages?
- How would you migrate an existing set of manually-created Applications to an app-of-apps-managed structure without disruption?

## References

- [Argo CD: Cluster Bootstrapping (App of Apps)](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)
