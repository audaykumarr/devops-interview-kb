---
id: kubernetes-autoscaling-oomkilled-despite-hpa-001
title: "A workload is constantly OOMKilled despite having an HPA configured — why doesn't horizontal scaling fix this, and what should you actually do?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - kubernetes
  - hpa
  - autoscaling
  - oom
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A team has an HPA configured on a Deployment, but individual pods keep getting `OOMKilled` regardless — the HPA adds more replicas, but the new replicas eventually get OOMKilled too. Why doesn't horizontal scaling solve this, and what's the actual fix?

## Short Answer

HPA solves a different problem than the one being experienced — it adds more copies of a pod to handle more total load, but each individual pod still has the exact same memory limit, so a single pod's memory usage exceeding its limit will OOMKill it regardless of how many other replicas exist alongside it. The actual fix is either increasing the per-pod memory limit (if the usage is legitimate) or fixing a memory leak (if it's not), or using a Vertical Pod Autoscaler to adjust per-pod sizing — none of which is what HPA does.

## Detailed Explanation

Horizontal and vertical scaling solve genuinely different resource problems: horizontal scaling (HPA) addresses "the total amount of work exceeds what current capacity can handle," by adding more units of that capacity — it has no mechanism to change any individual unit's own resource ceiling, which is exactly what an OOMKill is about.

## Symptoms

- Pods managed by a Deployment with an HPA configured repeatedly show `OOMKilled` in `kubectl get pods` / `kubectl describe pod`.
- The HPA does add replicas in response to load, but each individual pod (old and new) continues to be OOMKilled independently.
- The problem persists across scaling events rather than being resolved by them.

## Possible Causes

- A genuine memory leak in the application, where per-pod memory usage grows over the pod's lifetime regardless of replica count, eventually exceeding the configured limit.
- The per-pod memory limit was set too conservatively relative to the application's actual legitimate memory needs, independent of any leak.
- A misunderstanding that scaling out (more replicas) would reduce per-pod memory pressure, when in fact each replica receives its own independent share of traffic and does its own independent memory allocation — more replicas doesn't reduce what any single one needs to hold in memory for its own portion of the work.

## Investigation Steps

**Confirm it's genuinely OOMKilled, not a different failure**: `kubectl describe pod <pod>` showing `Reason: OOMKilled` under the last terminated state confirms this specifically — distinguishing it from a liveness-probe-triggered restart or an application crash, which would need a different investigation.

**Check whether memory usage grows over each pod's lifetime (a leak) or is roughly stable but simply over the limit**: comparing memory usage metrics over each individual pod's uptime (not aggregated across replicas) reveals whether this is a leak (usage climbs steadily until the limit is hit) or a legitimate-but-underestimated baseline (usage is roughly flat but close to or over the limit from early on).

**Check whether HPA's scaling is actually reducing per-pod load at all**: if the workload is genuinely stateless and request-driven, more replicas *should* reduce the per-pod request rate and therefore per-pod memory pressure somewhat — if OOMKills persist even with many replicas and correspondingly low per-pod traffic, that's strong evidence the issue isn't request-volume-driven at all (more likely a leak, or a fixed per-pod memory cost independent of traffic, like a large in-memory cache loaded at startup).

## Resolution

If it's a genuine leak, fix the application code — no infrastructure change resolves a leak, it only delays the inevitable OOMKill. If the baseline memory need was simply underestimated, raise the per-pod memory `limit` (and `request`) to a value grounded in actual measured usage. If the workload's real need is "the right amount of memory per pod, automatically tuned," a Vertical Pod Autoscaler (potentially combined with HPA for the horizontal dimension) is the tool actually designed for that — not HPA alone.

## Key Takeaways

- HPA changes the number of pod replicas; it has no ability to change any individual pod's own memory limit, which is what determines whether that pod gets OOMKilled.
- More replicas can reduce per-pod load for request-driven workloads, but doesn't help at all against a memory leak or a legitimately-underestimated baseline memory need.
- Distinguish a leak (usage climbs over a pod's lifetime) from a simple under-provisioning (usage is roughly flat but too close to the limit) before choosing a fix.
- VPA (or simply raising the memory limit/request) addresses per-pod sizing; HPA addresses total capacity — a workload can genuinely need both simultaneously for different reasons.

## Interview Follow-Up Questions

- A team wants to run HPA and VPA on the same Deployment for both CPU and memory — what breaks if you're not careful, and how do you combine them safely?
- How would you distinguish a memory leak from a legitimately growing cache using only container-level metrics, without application-level instrumentation?
- How would you set up an alert that specifically distinguishes a resource-limit problem from an HPA-scaling problem, given they can both eventually degrade the same user-facing latency metric?

## References

- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes: Managing Resources for Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
