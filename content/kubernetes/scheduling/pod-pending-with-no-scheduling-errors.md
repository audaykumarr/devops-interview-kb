---
id: kubernetes-scheduling-pod-pending-with-no-scheduling-errors-001
title: "How would you troubleshoot a pod stuck Pending even though kubectl describe pod shows no scheduling errors at all?"
category: kubernetes
subcategory: scheduling
technologies:
  - kubernetes
difficulty: expert
question_type:
  - troubleshooting
tags:
  - kubernetes
  - scheduling
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A pod has been `Pending` for an unusually long time. Normally you'd expect a `FailedScheduling` event explaining why — but `kubectl describe pod` shows no scheduling-related events at all, not even an attempt. What would cause a pod to be stuck `Pending` with the scheduler apparently never even having tried?

## Short Answer

The most likely explanations are that the scheduler itself isn't running or isn't processing the queue (a scheduler outage or severe backlog), the pod was created with `spec.nodeName` already set (which bypasses the scheduler entirely and means it's waiting on the kubelet of that specific node, not scheduling at all), or the pod is using a custom `schedulerName` that doesn't match any scheduler actually running in the cluster.

## Detailed Explanation

An absence of scheduling events is itself a strong, specific signal — it means the normal scheduling process never even engaged with this pod, which narrows the investigation to "why didn't the scheduler pick this up at all" rather than "why did scheduling fail," a meaningfully different and less common class of problem.

## Symptoms

- The pod remains `Pending` for far longer than a normal scheduling decision should take.
- `kubectl describe pod` shows no `FailedScheduling` or `Scheduled` events — the Events section is essentially empty regarding scheduling.
- The cluster otherwise appears healthy, with other pods scheduling normally.

## Possible Causes

- The kube-scheduler itself is down, crashlooping, or unable to reach the API server, so it isn't processing the pending-pod queue at all — but only for this pod's shard/priority, or entirely, depending on the failure.
- The pod spec has `spec.nodeName` explicitly set (bypassing the scheduler's normal binding process entirely) — this is uncommon in hand-written manifests but can happen via a custom tool, an old cached manifest, or a mistaken copy from a different pod's spec.
- The pod specifies a custom `schedulerName` that doesn't correspond to any scheduler actually deployed in the cluster (a leftover reference to a scheduler that was decommissioned, or a typo in the name).
- The API server itself is under significant load or degraded, delaying the scheduler's ability to even observe the new pod, independent of the scheduler's own health.

## Investigation Steps

**Check the kube-scheduler's own health first, since other pods scheduling normally would rule this out quickly**: if *other* pods are also failing to schedule around the same time, `kubectl get pods -n kube-system -l component=kube-scheduler` (or the equivalent for the specific cluster's scheduler deployment) and its logs are the first thing to check — a scheduler-wide outage would explain a fleet-wide symptom, not just this one pod.

**If other pods schedule fine, check this specific pod's `spec.nodeName` and `spec.schedulerName`**: `kubectl get pod <name> -o yaml` — a non-empty `spec.nodeName` means this pod was never going to be scheduled by the scheduler at all; it's waiting for the kubelet on that specific named node to notice and start it, which is an entirely different investigation (is that node healthy, is the kubelet running, does the node even exist).

**Check `spec.schedulerName` against actually-deployed schedulers**: if it's set to something other than `default-scheduler` (or empty, which implies default), confirm a scheduler with that exact name is actually running in the cluster — a mismatched or decommissioned custom scheduler name means no scheduler will ever pick up this pod, and it will remain `Pending` indefinitely with no error, since nothing is actively failing, just nothing is looking at it.

**Check API server health and scheduler-to-API-server connectivity if scheduler pods look healthy but aren't processing**: scheduler logs showing repeated connection errors or watch failures against the API server indicate the scheduler is up but effectively blind to new pods — this is a control-plane connectivity issue rather than a scheduler-specific bug.

## Resolution

If it's a scheduler outage, restore the scheduler's health (restart, fix the underlying resource/connectivity issue) and the queued pods should be processed once it recovers. If `spec.nodeName` was mistakenly set, delete and recreate the pod without that field so it goes through normal scheduling. If `spec.schedulerName` references a scheduler that doesn't exist, either correct it to the intended scheduler's actual name or remove it to fall back to the default scheduler. Confirm resolution by watching the pod transition to `Scheduled` and then `Running`, and by checking `kubectl describe pod` now shows the expected scheduling events.

## Key Takeaways

- An absence of scheduling events at all (not a failure event, but no events) is a distinct signal from a `FailedScheduling` failure, and points toward the scheduler never engaging with the pod rather than a normal filtering/scoring failure.
- `spec.nodeName` set directly on a pod bypasses the scheduler entirely — this is easy to overlook since it's an uncommon field in hand-written manifests.
- A custom `spec.schedulerName` pointing to a scheduler that isn't actually deployed leaves a pod permanently `Pending` with no error, since nothing is actively watching for it.
- Check whether other pods are also affected first — a fleet-wide symptom points to scheduler/API-server health, while an isolated single-pod symptom points to that pod's own spec.

## Interview Follow-Up Questions

- How would you monitor for kube-scheduler health proactively, so a scheduler outage is caught within minutes rather than discovered via a stuck pod?
- What would cause a pod to end up with `spec.nodeName` already set without anyone directly configuring it that way?
- How would you design a multi-scheduler setup (multiple `schedulerName` values for different workload classes) without risking the "orphaned schedulerName" failure mode described here?

## References

- [Kubernetes: Scheduler](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/)
- [Kubernetes: Configure Multiple Schedulers](https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/)
