---
id: gitops-argocd-ignorediffs-vs-selfheal-interaction-001
title: "How does Argo CD's ignoreDifferences configuration interact with its automated self-healing (selfHeal) feature?"
category: gitops
subcategory: argocd
technologies:
  - argocd
  - kubernetes
difficulty: advanced
question_type:
  - conceptual
tags:
  - argocd
  - gitops
  - self-healing
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Argo CD's `selfHeal` automatically reverts any live drift back to what's in Git, and `ignoreDifferences` tells Argo CD to stop treating specific fields as drift at all. How do these two features actually interact?

## Short Answer

`ignoreDifferences` runs first, conceptually: it removes specific fields from Argo CD's diff calculation entirely, so a live value differing from Git in an ignored field is never even *seen* as drift in the first place — and since `selfHeal` only acts on detected drift, an ignored field is never a candidate for self-healing to revert, regardless of how much it diverges from the Git-declared value. The two features are complementary rather than competing: `ignoreDifferences` defines what counts as drift at all, and `selfHeal` decides what to do about whatever's left after that filtering.

## Detailed Explanation

Argo CD's sync status is computed by diffing the live cluster state against what's declared in Git, field by field. `ignoreDifferences` configures specific fields (or entire paths, via JSON pointers or a Kubernetes-native `managedFieldsManagers` approach) to be excluded from that diff calculation — meaning Argo CD never even compares those specific fields between live and Git state, so no divergence there is ever registered as drift, regardless of how different the live value actually is.

`selfHeal` (part of the automated sync policy) acts on whatever *is* detected as drift — when live state diverges from Git in a field that Argo CD is actually comparing, `selfHeal` triggers an automatic sync to revert that divergence back to the Git-declared value, without waiting for a human to notice and manually sync. Since `ignoreDifferences` has already removed certain fields from the comparison entirely, those fields are structurally invisible to `selfHeal` — there's no drift for it to detect or revert in an ignored field, no matter what value it holds live.

This relationship is exactly why `ignoreDifferences` is the correct tool for fields legitimately mutated by something other than Argo CD (a mutating webhook injecting a sidecar container spec, a Horizontal Pod Autoscaler adjusting replica count, a cloud provider populating a Service's external IP) — without `ignoreDifferences`, `selfHeal` would fight that external mutator, repeatedly reverting its changes back to the Git-declared value the instant they're made, causing a genuinely disruptive reconciliation loop. With the field correctly ignored, `selfHeal` simply never engages with it, letting the external mutator's changes persist undisturbed while `selfHeal` still actively protects every field that *is* being compared.

## Key Takeaways

- `ignoreDifferences` removes specific fields from Argo CD's diff calculation entirely, before `selfHeal` ever gets involved.
- `selfHeal` only acts on fields that are actually being compared — an ignored field is structurally invisible to it, regardless of live drift.
- This is exactly why `ignoreDifferences` is the correct tool for fields legitimately mutated by something other than Argo CD — without it, `selfHeal` would fight that external mutator continuously.
- The two features are complementary: `ignoreDifferences` defines the scope of what counts as drift; `selfHeal` decides the response to whatever's left in that scope.

## Interview Follow-Up Questions

- How would you decide whether a diverging field should be handled with `ignoreDifferences` versus updating the Git source to match reality?
- What's the risk of over-using `ignoreDifferences` across many fields — what protection does that trade away?
- How would you audit an Argo CD Application's `ignoreDifferences` configuration to make sure it's not silently masking a real, unwanted drift?

## References

- [Argo CD: Diffing customization](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/)
- [Argo CD: Automated sync policy — self healing](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/#automatic-self-healing)
