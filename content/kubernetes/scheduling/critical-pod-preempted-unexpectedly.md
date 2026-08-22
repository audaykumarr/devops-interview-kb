---
id: kubernetes-scheduling-critical-pod-preempted-unexpectedly-001
title: "A critical pod gets preempted by a seemingly lower-priority pod during a resource crunch — how do you investigate and prevent it?"
category: kubernetes
subcategory: scheduling
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - priorityclass
  - scheduling
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

During a period of cluster resource pressure, a pod belonging to what the team considers a critical workload gets evicted to make room for a different pod that, by the team's own understanding, should have been the lower-priority one. How do you investigate what actually determined the preemption decision, and how do you prevent this specific mismatch from happening again?

## Short Answer

Preemption is driven entirely by each pod's actual `PriorityClass` value (a numeric priority), not by any informal notion of "which workload is critical" — the almost-certain cause is that the "critical" pod either has no PriorityClass set (defaulting to a low or zero priority) or has a lower numeric priority than the pod that preempted it, regardless of what the team considers each workload's importance to be.

## Detailed Explanation

The scheduler's preemption logic has no awareness of a team's informal sense of "this workload matters more" — it only knows the numeric priority value attached to each pod via its `PriorityClass`. A mismatch between the team's mental model of importance and the actual configured priority values is the single most common cause of preemption behaving "wrong."

## Symptoms

- A pod the team considers critical is evicted (preempted) during resource pressure.
- The pod that triggered the preemption is, by the team's informal understanding, less important.
- No error in the application itself — the preempted pod's own health was fine before eviction.

## Possible Causes

- The "critical" pod has no `priorityClassName` set at all, defaulting to priority `0` (or whatever the cluster's default PriorityClass, if any, provides) — which can easily be lower than an explicitly-assigned priority on the pod that preempted it.
- A PriorityClass was assigned, but with a numeric `value` that doesn't actually reflect the intended relative importance compared to other classes in use.
- The preempting pod's PriorityClass was set higher than intended, possibly for an unrelated original reason that's since become stale.

## Investigation Steps

**Check both pods' actual assigned PriorityClass**: `kubectl get pod <name> -o jsonpath='{.spec.priorityClassName} {.spec.priority}'` for both the preempted and preempting pod — comparing the actual numeric `priority` values (not just the class names, which can be misleadingly named) directly confirms whether the preemption decision was consistent with the configured priorities.

**List all PriorityClasses and their numeric values**: `kubectl get priorityclass -o custom-columns=NAME:.metadata.name,VALUE:.value,GLOBAL-DEFAULT:.globalDefault` gives the full picture of how priorities are configured cluster-wide — this often reveals that PriorityClass values were set once, early on, without a clear ongoing convention, leading to drift between what a class name suggests and what it numerically means relative to newer classes.

**Check whether a `globalDefault: true` PriorityClass exists, and what it's set to**: if a PriorityClass is marked as the cluster's global default, any pod without an explicit `priorityClassName` gets that value automatically — if this default is unexpectedly low (or unexpectedly high, affecting unrelated pods), it explains a lot of "unexpected" preemption behavior for workloads that were never explicitly assigned a class.

**Review the eviction/preemption event for the full decision context**: `kubectl get events` around the preemption time, and the API server/scheduler logs if deeper detail is needed, confirm the scheduler's actual reasoning — this is worth checking directly rather than assuming, since a seemingly-unrelated resource constraint (not priority at all) can sometimes produce a superficially similar symptom.

## Resolution

Assign an explicit, deliberately-chosen `priorityClassName` to every workload that genuinely needs priority-aware scheduling behavior, rather than relying on an implicit default — and establish (or audit) the relative ordering of PriorityClass values against actual business/reliability importance, since the class names alone (e.g., "high," "critical") mean nothing to the scheduler if their numeric `value` fields don't actually reflect that intended ordering. Confirm the fix by verifying the corrected PriorityClass assignment via the same `kubectl get pod -o jsonpath` check used in the investigation.

## Key Takeaways

- Preemption decisions are driven entirely by numeric PriorityClass values — the scheduler has no concept of a team's informal sense of workload importance.
- A pod with no explicit `priorityClassName` gets whatever the cluster's `globalDefault` PriorityClass provides (or priority 0 if none exists), which can easily be lower than intended.
- PriorityClass names can be misleading if their numeric `value` doesn't actually reflect the intended relative ordering — always check the numeric value, not just the class name.
- Establishing and periodically auditing a clear, deliberate PriorityClass value convention prevents this class of mismatch from recurring as new workloads and classes are added over time.

## Interview Follow-Up Questions

- How would you design a cluster-wide PriorityClass convention that scales as new teams and workloads are added, without values drifting out of sync with actual importance?
- What's the difference between preemption and eviction under node-pressure, and does PriorityClass affect both the same way?
- How would you prevent a lower-priority but resource-hungry batch workload from repeatedly triggering preemption of higher-priority workloads, beyond just priority values alone?

## References

- [Kubernetes: Pod Priority and Preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
