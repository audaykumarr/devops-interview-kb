---
id: gitops-argocd-sync-status-vs-health-status-001
title: "What's the difference between Argo CD's Sync status and Health status, and why does treating them as the same thing cause confusion?"
category: gitops
subcategory: argocd
technologies:
  - argocd
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - argocd
  - gitops
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An Argo CD Application shows both a Sync status and a Health status, and it's common for people new to Argo CD to conflate the two. What's the actual difference, and what confusion results from treating them as one thing?

## Short Answer

Sync status answers "does the live cluster state match what's declared in Git" — purely a comparison between desired and actual configuration, with no awareness of whether anything is actually working. Health status answers "are the deployed resources actually functioning correctly" — Pods running, Deployments with enough ready replicas, Ingress properly provisioned — entirely independent of whether that state matches Git. An Application can be Synced but Unhealthy (the exact config from Git is applied, but the resulting Pods are crash-looping) or OutOfSync but Healthy (live state has drifted from Git, but whatever's currently running happens to be working fine) — the two axes are genuinely independent.

## Detailed Explanation

**Sync status** is purely a configuration-comparison question: Argo CD diffs the live cluster resources against what's declared in the Git-tracked manifests, and reports `Synced` if they match, `OutOfSync` if they don't. This says nothing about whether the deployed application is actually working — a Deployment can be perfectly `Synced` (exactly matching the image tag and replica count declared in Git) while the Pods it created are crash-looping due to a bug in that exact image, which Sync status has no way to know about, since it's not looking at runtime behavior at all.

**Health status** is a runtime-behavior question: Argo CD has built-in health checks for common resource types (a Deployment is `Healthy` once it has the desired number of ready replicas, an Ingress is `Healthy` once it has an assigned address, a Job is `Healthy` once it completes successfully) — this assessment is entirely independent of Git. A resource can be `Healthy` while badly out of sync with Git (someone manually scaled a Deployment up, and it's running fine at that manually-set replica count, which differs from what Git declares) or `Unhealthy` while perfectly synced (Git declares exactly what's running, and what's running happens to be broken).

The confusion this causes in practice: someone sees an Application status and assumes "Synced" means "working," when it only means "configuration matches Git" — a Synced-but-Unhealthy Application is a common source of "wait, why is Argo CD saying everything's fine" confusion when the actual application is clearly broken (crash-looping Pods, failing health checks), because Sync status genuinely has nothing to say about that. The reverse also causes confusion: an OutOfSync-but-Healthy Application might seem alarming ("something's wrong!") when actually the running application is completely fine — it's just that live state diverges from Git for some reason (manual intervention, an ignored field, or a real drift that hasn't caused any actual problem yet).

The practical takeaway: always check both statuses together for a real picture of an Application's state — Sync status tells you about configuration drift, Health status tells you about actual runtime correctness, and neither one substitutes for the other.

## Key Takeaways

- Sync status compares live configuration against Git; Health status assesses whether deployed resources are actually functioning — genuinely independent axes.
- An Application can be Synced but Unhealthy (exact Git config applied, but broken at runtime) or OutOfSync but Healthy (drifted from Git, but currently working fine).
- Assuming "Synced" means "working" is the most common source of confusion — Sync status says nothing about runtime correctness.
- Always check both statuses together for a complete picture; neither substitutes for the other.

## Interview Follow-Up Questions

- How would you configure a custom health check for a Custom Resource Argo CD doesn't have built-in health assessment for?
- What would you do if an Application is stuck `Progressing` (a Health status state) for an unusually long time — how would you investigate?
- How do Sync status and Health status each factor into deciding whether an automated sync or self-heal should trigger?

## References

- [Argo CD: Application health](https://argo-cd.readthedocs.io/en/stable/operator-manual/health/)
- [Argo CD: Core concepts — sync status](https://argo-cd.readthedocs.io/en/stable/core_concepts/)
