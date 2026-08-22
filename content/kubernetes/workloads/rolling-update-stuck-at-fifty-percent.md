---
id: kubernetes-workloads-rolling-update-stuck-at-fifty-percent-001
title: "A rolling update to a Deployment is stuck at 50% — how do you determine whether it's a bad readiness probe, insufficient capacity, or a PodDisruptionBudget blocking it?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - deployments
  - rollouts
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`kubectl rollout status deployment/<name>` shows a rolling update stuck at roughly half the replicas updated, not progressing further. There are at least three plausible causes: a bad readiness probe on the new version, insufficient cluster capacity to schedule new pods, or a PodDisruptionBudget preventing old pods from terminating. How do you determine which one it actually is?

## Short Answer

Read `kubectl describe deployment` and `kubectl describe pod` on the new-version pods specifically — the ReplicaSet and pod-level events almost always state the blocking condition directly (`Unschedulable`, a failing readiness probe's specific error, or a PDB-related eviction block), so the investigation is about reading the right object's events rather than guessing between the three causes.

## Detailed Explanation

A stuck rolling update is the Deployment controller correctly waiting for a condition it can't yet satisfy — the controller itself isn't broken, it's honoring `maxUnavailable`/`maxSurge` and readiness constraints exactly as configured, which means the stuck state is informative if you look at the right level (ReplicaSet, pod, or PDB) rather than a generic failure.

## Symptoms

- `kubectl rollout status` reports the update as in-progress but not completing, with the replica counts stuck at a partial split between old and new ReplicaSets.
- `kubectl get pods` shows a mix of old and new version pods, with new pods potentially in `Pending`, `CrashLoopBackOff`, or `Running` but not `Ready`.
- No further progress occurs even after waiting well beyond the expected rollout duration.

## Possible Causes

- New pods are `Running` but never becoming `Ready` because their readiness probe is failing (a genuine bug in the new version, or a misconfigured probe path/port/timing).
- New pods are stuck `Pending` because the cluster doesn't have enough spare capacity to schedule additional pods beyond `maxSurge`.
- A PodDisruptionBudget on the old ReplicaSet's pods is preventing the Deployment controller from terminating enough old pods to make room for new ones, given `maxUnavailable`.

## Investigation Steps

**Check the new pods' actual status first**: `kubectl get pods -l <deployment-selector> -o wide` immediately narrows things down — `Pending` points toward a capacity/scheduling problem, `Running` but not `Ready` (check the `READY` column, e.g. `0/1`) points toward a readiness probe failure, and this single check eliminates two of the three hypotheses immediately.

**For `Pending` new pods, check scheduling events**: `kubectl describe pod <new-pod>` shows a `FailedScheduling` event with the specific reason (`Insufficient cpu`, `Insufficient memory`, node affinity/taint mismatch) — this directly confirms or rules out the capacity hypothesis, and tells you exactly which resource is constrained.

**For `Running`-but-not-`Ready` new pods, check the readiness probe's specific failure**: `kubectl describe pod <new-pod>` shows the probe's failure reason directly (connection refused, non-2xx HTTP status, timeout) in its Events section — and `kubectl logs <new-pod>` for the application's own startup behavior confirms whether it's a genuine application bug or a misconfigured probe (wrong port, path, or insufficient `initialDelaySeconds`).

**Check for a PodDisruptionBudget blocking old pod termination**: `kubectl get pdb` and specifically check whether the PDB's `ALLOWED DISRUPTIONS` is `0` for the old ReplicaSet's pods — if `maxUnavailable` on the Deployment combined with the PDB's minimum-available requirement leaves no room to terminate any more old pods, the rollout will stall exactly at whatever point it reached before hitting that constraint, which explains a stall at a seemingly arbitrary percentage.

**Cross-reference the ReplicaSet's own status for the authoritative count**: `kubectl get replicaset -l <deployment-selector>` shows the desired/current/ready counts for both old and new ReplicaSets side by side, confirming exactly how far the rollout actually progressed and which side (old pods not terminating, or new pods not becoming ready) is the actual blocker.

## Resolution

Fix follows directly from the identified cause: correct the readiness probe configuration or fix the underlying application bug if it's a probe failure; add cluster capacity (or temporarily reduce `maxSurge`) if it's a scheduling/capacity problem; or adjust the PodDisruptionBudget's `minAvailable`/`maxUnavailable` (or temporarily pause the rollout, if the PDB is protecting something genuinely important) if it's a PDB conflict. In all cases, confirm resolution by watching `kubectl rollout status` actually progress to completion, not just that the immediately-blocking symptom cleared.

## Key Takeaways

- The Deployment controller isn't broken during a stuck rollout — it's correctly waiting on a condition, so the investigation is about identifying which one via the right object's events.
- New pods' status (`Pending` vs `Running`-not-`Ready`) immediately narrows the cause to capacity/scheduling versus readiness probe failure.
- A PodDisruptionBudget with zero allowed disruptions on the old ReplicaSet's pods can stall a rollout at an otherwise-unexplained partial percentage — check `kubectl get pdb` explicitly.
- Confirm resolution by watching the rollout actually complete, not just that the immediate blocking symptom (a probe error, a scheduling event) disappeared.

## Interview Follow-Up Questions

- How would you design alerting to catch a stalled rollout automatically, rather than a human noticing `kubectl rollout status` hanging?
- What would you do if `maxUnavailable: 0` is a deliberate, correct setting, but it's now conflicting with a PDB during a genuine incident requiring an urgent rollback?
- How does `kubectl rollout undo` behave if triggered while a rollout is stuck partway through — does it cleanly reverse, or can it get stuck too?

## References

- [Kubernetes: Deployments — Rolling Update](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)
- [Kubernetes: Specifying a Disruption Budget for your Application](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
