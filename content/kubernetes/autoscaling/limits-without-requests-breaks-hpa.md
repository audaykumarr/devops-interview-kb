---
id: kubernetes-autoscaling-limits-without-requests-breaks-hpa-001
title: "Why does setting only limits (no requests) on a container break HPA's CPU-based scaling calculation?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: beginner
question_type:
  - conceptual
  - troubleshooting
tags:
  - kubernetes
  - hpa
  - resource-management
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Deployment's containers have `resources.limits.cpu` set, but no `resources.requests.cpu`. An HPA targeting CPU utilization on this Deployment never scales, regardless of actual load. Why specifically does the missing `requests` field (not `limits`) break this, given `limits` is also a CPU-related setting?

## Short Answer

HPA's CPU utilization percentage is computed as `(current usage) / (requests.cpu) * 100` — it uses `requests.cpu` specifically as the denominator, not `limits.cpu`. Without `requests.cpu` set, there's nothing for HPA to divide by, so the metric comes back as `<unknown>` and no scaling decision can ever be made, regardless of how `limits` is configured.

## Detailed Explanation

HPA's CPU-based scaling doesn't measure absolute CPU usage against some fixed ceiling — it computes a percentage, and a percentage requires both a numerator (actual usage) and a denominator (the value being compared against). `requests.cpu`, not `limits.cpu`, is specifically the value HPA uses as that denominator, which is why omitting it — even while `limits` is set — leaves the calculation with nothing to divide by.

## Symptoms

- An HPA targeting CPU utilization shows `<unknown>` for the current metric value in `kubectl get hpa`, rather than an actual percentage.
- The HPA never scales the Deployment regardless of real load.
- `resources.limits.cpu` is set on the containers, which can make it look at a glance like resource configuration is complete.

## Possible Causes

- The pod spec sets `resources.limits.cpu` without also setting `resources.requests.cpu` — a common oversight since some teams treat `limits` as the primary or only resource setting worth configuring.
- A Kubernetes version or cluster configuration without a `LimitRange` that would otherwise auto-populate a default `requests` value when only `limits` is specified.

## Investigation Steps

**Check the container's actual resource configuration**: `kubectl get deployment <name> -o jsonpath='{.spec.template.spec.containers[*].resources}'` — confirm whether `requests.cpu` is present at all, distinct from whether `limits.cpu` is present, since they're independent fields that are easy to conflate.

**Check `kubectl describe hpa` for the specific error**: it typically states something like `missing request for cpu` directly in its Conditions/Events, confirming this exact cause rather than requiring you to infer it.

**Check whether a namespace `LimitRange` is expected to auto-populate defaults, and whether it's actually doing so**: some namespaces have a `LimitRange` configured with a `defaultRequest` that automatically sets `requests` when a pod spec omits it — if one exists but isn't behaving as expected, that's worth checking directly (`kubectl get limitrange -n <namespace> -o yaml`) rather than assuming it's covering the gap.

## Resolution

Add an explicit `resources.requests.cpu` value to the container spec, set to a value that genuinely reflects the container's typical baseline usage (not an arbitrary guess) — HPA's utilization percentage will be measured against whatever this value is, so setting it too low makes the workload appear to scale earlier than genuinely needed, and too high makes it under-scale relative to actual load. Confirm the fix by watching `kubectl get hpa` report an actual percentage value instead of `<unknown>`.

## Key Takeaways

- HPA computes utilization as a percentage of `requests.cpu`, not `limits.cpu` — the two fields serve different purposes, and only one of them is what HPA's calculation depends on.
- Setting `limits` without `requests` looks like complete resource configuration at a glance but leaves HPA with no denominator to compute a percentage against.
- `kubectl describe hpa`'s Conditions/Events state this specific cause directly when it's the problem.
- The `requests.cpu` value chosen isn't arbitrary — it directly determines what "100% utilization" means for HPA's scaling threshold.

## Interview Follow-Up Questions

- What's the difference between `requests` and `limits` more broadly, beyond just their role in HPA's calculation?
- How would you determine the right `requests.cpu` value for a workload you don't yet have production usage data for?
- How would a namespace-level `LimitRange` with a `defaultRequest` change this specific failure mode, if one were configured?

## References

- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes: Managing Resources for Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
