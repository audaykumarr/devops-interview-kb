---
id: kubernetes-autoscaling-hpa-not-scaling-despite-latency-001
title: "Users report increasing latency under load, but the HPA isn't scaling the Deployment at all — how do you figure out why?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - hpa
  - autoscaling
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Users are reporting growing latency during a traffic increase, but `kubectl get hpa` shows the replica count hasn't budged. The HPA object exists and looks correctly configured at a glance. How do you find out why it isn't scaling?

## Short Answer

`kubectl describe hpa` is the first and most direct source — its Conditions and Events sections state exactly why scaling isn't happening (metrics unavailable, target utilization not actually exceeded, at `maxReplicas` already, or a scaling stabilization window holding it back) — and the single most common root cause is that the target Deployment's containers don't have resource `requests` set, which makes CPU-based HPA scaling mathematically undefined rather than just conservative.

## Detailed Explanation

HPA's scaling decision depends on a chain of working parts — the metrics pipeline, the resource requests needed to compute utilization percentage, and the configured thresholds — and a break anywhere in that chain produces the same visible symptom (no scaling) with a completely different actual cause, which is why reading the HPA's own diagnostic output first is far more efficient than checking each possibility from scratch.

## Symptoms

- Latency is visibly increasing under load, consistent with the Deployment being under-provisioned for current traffic.
- `kubectl get hpa` shows the current replica count unchanged, and often shows `<unknown>` or `0%` for the current metric value.
- No scaling events appear in the Deployment's or HPA's recent history.

## Possible Causes

- The target containers have no resource `requests` set, making CPU utilization percentage undefined (HPA can't compute "percentage of requested CPU" without a request to divide by).
- The metrics-server (or custom metrics adapter, for non-CPU metrics) isn't running or isn't reporting data for these pods.
- The HPA is already at `maxReplicas`, silently capping further scaling regardless of actual load.
- A stabilization window (`behavior.scaleUp.stabilizationWindowSeconds`) is holding back a scale-up decision that would otherwise have already triggered.

## Investigation Steps

**Read the HPA's own status and events first**: `kubectl describe hpa <name>` — the `Conditions` section (`AbleToScale`, `ScalingActive`, `ScalingLimited`) and recent `Events` state the actual blocking reason directly in most cases, for example `the HPA was unable to compute the replica count: missing request for cpu`.

**Check whether the target containers actually have resource requests set**: `kubectl get deployment <name> -o jsonpath='{.spec.template.spec.containers[*].resources}'` — if `requests.cpu` is absent, this is almost certainly the root cause, since HPA's percentage-based CPU scaling has no defined baseline to compute a percentage against without it.

**Confirm the metrics pipeline is actually reporting data**: `kubectl top pods` (for CPU/memory via metrics-server) or checking the custom metrics adapter's own health/logs (for a custom metric like queue depth) — if this command itself fails or returns nothing, the HPA has no data to act on regardless of how it's configured.

**Check `maxReplicas` against the current replica count**: `kubectl get hpa` directly shows both — if they're equal, the HPA is working correctly but has hit its configured ceiling, which is a capacity-planning conversation, not a bug.

**Check for a stabilization window delaying the scale-up decision**: `kubectl get hpa <name> -o yaml` for `spec.behavior.scaleUp.stabilizationWindowSeconds` — a long window (or a conservative default) can make scaling look "stuck" for longer than expected during a fast-ramping traffic increase, even though it will eventually scale.

## Resolution

Add appropriate `requests` to the container spec if that was the root cause (this alone is the fix in a large fraction of real cases), confirm the metrics pipeline is healthy and restore it if not, raise `maxReplicas` if the workload has legitimately outgrown its configured ceiling, or tune the stabilization window if it's delaying scale-up longer than the workload's traffic pattern can tolerate. Confirm the fix by watching `kubectl get hpa -w` actually report a current metric value and scale replicas in response to the next load increase.

## Key Takeaways

- `kubectl describe hpa`'s Conditions and Events sections state the actual blocking reason directly — start there before checking each possible cause individually.
- Missing resource `requests` on the target containers is one of the most common root causes, since it makes CPU utilization percentage mathematically undefined, not just imprecise.
- Being at `maxReplicas` is a valid, non-broken state — check it explicitly before assuming something is malfunctioning.
- A stabilization window can make scaling look stuck during a fast traffic ramp even when the HPA is working correctly and will scale shortly.

## Interview Follow-Up Questions

- Why does setting only limits (no requests) on a container break HPA's CPU-based scaling calculation?
- How does HPA's scaling decision actually get computed from raw metrics — walk through what happens between a CPU spike and a new replica appearing?
- How would you set up alerting specifically for "HPA is unable to scale" conditions, rather than only alerting on the downstream symptom of high latency?

## References

- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes: HPA Walkthrough — Troubleshooting](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
