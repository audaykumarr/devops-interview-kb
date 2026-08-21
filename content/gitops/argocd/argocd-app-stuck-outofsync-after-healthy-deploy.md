---
id: gitops-argocd-stuck-outofsync-001
title: "An Argo CD application shows OutOfSync even though the pods running in the cluster look correct and healthy. What would you check?"
category: gitops
subcategory: argocd
technologies:
  - argocd
  - kubernetes
  - gitops
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - argocd
  - gitops
  - kubernetes
  - drift
estimated_time_minutes: 8
companies: []
related_questions:
  - terraform-state-unexpected-recreate-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An Argo CD Application shows `OutOfSync`, but every pod running in the cluster looks correct and healthy when you check manually. What would you check to figure out what Argo CD thinks is actually different?

## Short Answer

Look at the actual diff Argo CD is reporting (`argocd app diff`, or the "Diff" view in the UI) rather than assuming — `OutOfSync` means the live cluster state differs from Git in *some* field, which is often something that doesn't affect visible pod health at all: a field a mutating webhook or admission controller adds/changes at apply time, a resource whose spec Argo CD tracks but that doesn't affect the running pod (like an annotation or an unmanaged replica count), or a field some other process (another controller, an HPA, a manual `kubectl edit`) is actively changing outside of Git.

## Detailed Explanation

Argo CD's sync status is a structural comparison between the manifests in Git and the live objects in the cluster — it's not a health check, and it's not scoped to "does the application work." A resource can be perfectly healthy and serving traffic correctly while still being `OutOfSync`, because sync status only cares whether the live object's fields match what's declared in Git, field by field, for every resource the Application manages.

The most common causes of a persistent `OutOfSync` that doesn't correspond to any visible problem: a Horizontal Pod Autoscaler changing `replicas` on a Deployment that Git also specifies a `replicas` value for, causing a permanent tug-of-war between Argo CD wanting to set it back to Git's value and the HPA wanting to change it based on load; a mutating admission webhook injecting a sidecar, label, or annotation that wasn't in the original Git manifest, so the live object always has "extra" fields Argo CD sees as drift; or someone using `kubectl edit`/`kubectl patch` directly against a live resource, which Argo CD will flag as drift on its next reconciliation regardless of whether the manual change was reasonable.

Argo CD does have a mechanism for exactly the "controller manages this field, not Git" case — `ignoreDifferences` in the Application spec, which tells Argo CD to exclude specific fields (like `spec.replicas` when an HPA owns it) from the sync comparison entirely. Not configuring this for known cases like HPA-managed replica counts is one of the most common sources of persistent, confusing `OutOfSync` states that don't correspond to any real problem.

## Symptoms

- Argo CD shows the Application as `OutOfSync` (sometimes alongside `Healthy`, which is itself a hint — the app works, but doesn't match Git).
- Manually inspecting pods, services, and other resources shows nothing obviously wrong.
- The `OutOfSync` state persists across multiple sync attempts or reappears shortly after a manual sync.

## Possible Causes

- A Horizontal Pod Autoscaler (or another controller) actively manages a field, like `replicas`, that Git also declares a value for, causing repeated drift.
- A mutating admission webhook or defaulting controller adds fields (sidecars, annotations, labels) to the live object that aren't present in the Git-sourced manifest.
- A manual `kubectl edit`/`kubectl patch`/`kubectl scale` against a resource Argo CD manages, introducing drift outside of Git.
- A genuine, un-synced Git change that Argo CD correctly flagged, but that doesn't happen to affect the visible health of running pods (e.g. a changed `ConfigMap` value that isn't consumed by the currently-running pod generation, or a comment/formatting-adjacent field).

## Investigation Steps

1. Run `argocd app diff <app-name>` (or open the Diff view in the UI) to see exactly which fields Argo CD considers different, rather than guessing.
2. For each differing field, check whether it's something managed by another controller (HPA, a mutating webhook, cluster autoscaler-adjacent fields) rather than a real Git-vs-cluster mismatch.
3. Check `kubectl get <resource> -o yaml` directly and compare specific fields against the Git-sourced manifest to confirm what the live object actually contains.
4. Check the Application's `spec.syncPolicy` and `ignoreDifferences` configuration to see whether the drifting field is already meant to be excluded but isn't configured correctly.
5. Check recent `kubectl` audit logs or cluster events for manual changes to the resource outside of Argo CD's own sync operations.

## Commands

```bash
argocd app get my-app
argocd app diff my-app

kubectl get deployment my-app -o yaml | less
kubectl get application my-app -n argocd -o yaml

kubectl get hpa -n my-namespace
```

## Resolution

If the drift is from a controller that legitimately owns a field (most commonly an HPA owning `replicas`), add that field to `spec.ignoreDifferences` in the Application manifest so Argo CD stops treating it as drift — this is the correct fix, not trying to make Git and the HPA agree on a single static value. If it's a mutating webhook adding fields, either configure `ignoreDifferences` for those specific fields too, or (if appropriate) move the injected configuration into Git so it's declared rather than injected, depending on which is the better source of truth for that field. If it's manual drift from a direct `kubectl` change, sync the Application to restore the Git-declared state, and address why a manual change happened outside the GitOps flow in the first place.

## Prevention

- Proactively configure `ignoreDifferences` for known controller-managed fields (HPA-managed replicas being the most common) as part of onboarding any Application, rather than discovering the conflict reactively.
- Treat direct `kubectl` changes to GitOps-managed resources as an incident-worthy exception, not a normal operational path — if a change is needed, it should go through Git.
- Use Argo CD's `Health` status alongside `Sync` status when triaging — a `Healthy` + `OutOfSync` application is a very different situation from an `Unhealthy` one, and treating them the same wastes investigation time.
- Document which fields are intentionally excluded from sync comparison and why, so the next person investigating an `OutOfSync` state isn't starting from zero.

## Interview Follow-Up Questions

- How does `ignoreDifferences` interact with Argo CD's automated self-healing (`selfHeal`) feature?
- How would you handle a case where a mutating webhook's injected configuration genuinely should be tracked in Git instead of ignored?
- What's the difference between Argo CD's `Sync` status and `Health` status, and why does treating them as the same thing cause confusion?

## Key Takeaways

- `OutOfSync` means "doesn't match Git," not "something is broken" — a healthy, `OutOfSync` application is a normal, explainable state, not necessarily a problem.
- Always look at the actual diff before investigating further — guessing at the cause wastes time that `argocd app diff` answers directly.
- HPA-managed replica counts are the single most common source of persistent, confusing drift, and have a direct fix (`ignoreDifferences`).
- Manual `kubectl` changes to GitOps-managed resources should be treated as exceptions worth addressing, not routine drift to just re-sync away.

## References

- [Argo CD docs: Diffing Customization](https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/)
- [Argo CD docs: Sync Status vs Health Status](https://argo-cd.readthedocs.io/en/stable/core_concepts/)
- [Argo CD docs: Automated Sync Policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
