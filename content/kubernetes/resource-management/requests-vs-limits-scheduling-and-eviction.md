---
id: kubernetes-resource-management-requests-vs-limits-scheduling-001
title: "How do requests.memory and limits.memory affect Pod scheduling and node-level eviction behavior differently from each other?"
category: kubernetes
subcategory: resource-management
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - kubernetes
  - resource-management
  - scheduling
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`requests.memory` and `limits.memory` sound related but drive completely different Kubernetes mechanisms. How does each one actually affect Pod scheduling and node-level eviction behavior?

## Short Answer

`requests.memory` is what the scheduler uses to decide *whether a Pod can even be placed on a node* — it sums a node's already-committed requests and only schedules a new Pod if the node has enough uncommitted capacity to cover the new Pod's request, regardless of whether that memory is actually used yet. `limits.memory` has no bearing on scheduling at all — it's enforced purely at runtime via the cgroup memory controller, capping how much memory a running container can actually use before being OOMKilled, independent of whatever was requested.

## Detailed Explanation

**Scheduling (requests.memory)**: when the scheduler considers a node for a new Pod, it sums the memory *requests* of all Pods already scheduled on that node (not their actual current usage) and checks whether the node's allocatable memory has enough remaining headroom to also cover the new Pod's request. This is a purely request-based reservation system — a Pod requesting 2Gi reserves that 2Gi against the node's capacity for scheduling purposes the moment it's scheduled, even if the container ends up using far less in practice. `limits.memory` plays no role in this calculation at all — the scheduler doesn't consider limits when deciding placement, meaning a node can be scheduled full of Pods whose *limits* sum to well more than the node's total capacity (a common, deliberate practice called overcommitment), as long as their *requests* fit.

**Runtime enforcement (limits.memory)**: once a Pod is running, `limits.memory` is enforced by the kernel's cgroup memory controller for that specific container — if the container's actual memory usage crosses its limit, the kernel's OOM killer terminates it immediately, regardless of what was requested. This is a purely runtime, usage-based enforcement mechanism, with no connection to the scheduling decision that already happened.

**The consequence of overcommitment** (limits summing higher than the node's capacity, a common practice since most workloads don't use their full limit most of the time) is that node-level memory pressure becomes possible even on a node that was legitimately schedulable by requests — if enough Pods on an overcommitted node simultaneously use memory closer to their individual limits than to their requests, the node's actual total usage can exceed its capacity, triggering node-level eviction or OOM behavior (as covered in the container-limit-vs-node-OOM distinction) even though every individual Pod was correctly scheduled according to its request.

**Node-level eviction specifically** (the kubelet proactively evicting Pods under memory pressure, distinct from the kernel's OOM killer) also uses a request/usage-relative comparison: the kubelet's eviction manager tends to prioritize evicting Pods whose actual usage exceeds their *request* by the largest margin (among BestEffort and Burstable pods), which is again a request-relative calculation, independent of each Pod's limit.

## Key Takeaways

- `requests.memory` drives scheduling — the scheduler sums requests (not actual usage or limits) to decide whether a node has room for a new Pod.
- `limits.memory` drives runtime enforcement only — the cgroup memory controller kills a container that exceeds its own limit, with no connection to the scheduling decision.
- Limits can be overcommitted relative to a node's capacity (a common, deliberate practice) since scheduling only considers requests, not limits.
- Node-level eviction (kubelet-driven, distinct from cgroup OOM) tends to prioritize Pods whose actual usage most exceeds their request, another request-relative (not limit-relative) calculation.

## Interview Follow-Up Questions

- What's the risk of setting `limits` significantly higher than `requests` across many Pods on the same node (heavy overcommitment)?
- How does Kubernetes' Guaranteed QoS class (requests equal to limits) change both the scheduling and eviction behavior discussed here?
- How would you determine the right requests/limits values for a workload you don't yet have production usage data for?

## References

- [Kubernetes Docs: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Docs: Node-pressure Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes Docs: Pod Quality of Service Classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
