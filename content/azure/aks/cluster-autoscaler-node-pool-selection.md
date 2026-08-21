---
id: azure-aks-autoscaler-node-pool-selection-001
title: "How does the Kubernetes cluster autoscaler decide which node pool to scale when multiple pools could satisfy a pending pod?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
difficulty: advanced
question_type:
  - conceptual
tags:
  - azure
  - aks
  - autoscaler
  - kubernetes
estimated_time_minutes: 7
companies: []
related_questions:
  - azure-aks-autoscaler-not-scaling-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An AKS cluster has multiple node pools, and a pending pod's resource requirements could technically be satisfied by more than one of them. How does the cluster autoscaler actually decide which node pool to scale up?

## Short Answer

The cluster autoscaler evaluates each node pool (technically, each "node group" it's configured to manage) by simulating whether scaling it up would let the pending pod be scheduled, and among the pools that would work, it applies an "expander" strategy to pick one — by default, a fairly simple heuristic (the `random` expander, or `least-waste` in many managed setups) rather than genuinely optimal bin-packing across pools; the choice can be tuned explicitly via the `--expander` flag to prioritize cost, least wasted resources, or a specific priority ordering you define.

## Detailed Explanation

The autoscaler's core loop is: notice a pod stuck in `Pending` because no existing node has room, determine whether scaling up any node pool would let that pod schedule (by simulating the pod against a hypothetical new node from each candidate pool, checking resource requests, node selectors/affinity, taints/tolerations all line up), and if multiple pools pass that simulation, use an "expander" to choose among them.

The available expander strategies each optimize for something different: `random` picks arbitrarily among viable pools (the default in many setups, prioritizing simplicity over optimization); `least-waste` picks the pool that would leave the least unused CPU/memory after the pod is scheduled, trying to avoid provisioning an oversized node for a small pod; `most-pods` picks the pool that could schedule the most pending pods at once, useful when many pods are waiting simultaneously; `price` (where supported) picks the cheapest viable option; and `priority` lets you explicitly configure an ordering of preference among pools via a ConfigMap, giving full manual control when the automatic heuristics don't match what you actually want.

This matters in troubleshooting because "the autoscaler scaled the wrong pool" is often not a bug — it's the configured expander behaving exactly as designed, just not aligned with the intended outcome. A cluster with a cheap general-purpose pool and an expensive GPU pool, both technically able to satisfy a pod's resource requirements (if the pod doesn't have a node selector actually requiring GPU), could see the `random` expander pick the expensive pool by chance — the fix isn't fixing a bug, it's either tightening the pod's node selector/affinity so only the intended pool is even a viable candidate, or switching to an expander (or explicit `priority` configuration) that reflects the actual cost/placement intent.

## Key Takeaways

- The autoscaler simulates whether scaling each node pool would let a pending pod schedule, then uses an "expander" strategy to choose among the viable pools.
- Expander strategies (`random`, `least-waste`, `most-pods`, `price`, `priority`) each optimize for something different — the default isn't necessarily cost-optimal.
- "Wrong pool got scaled" is often the expander working as configured, not a bug — the real fix is usually tightening pod scheduling constraints or choosing a more appropriate expander.
- `priority` expander gives explicit manual control when automatic heuristics don't match the actual intended placement.

## Interview Follow-Up Questions

- How would you configure the `priority` expander's ConfigMap to strictly prefer a cheaper node pool before falling back to a more expensive one?
- Why might node selectors or taints/tolerations be a more robust fix than changing the expander strategy for a GPU-vs-general-purpose pool scenario?
- How would multiple simultaneously pending pods with different resource needs interact with the `most-pods` expander's decision?

## References

- [Kubernetes Autoscaler: Cluster Autoscaler FAQ — Expanders](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#what-are-expanders)
- [AKS: Cluster autoscaler on AKS](https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler)
