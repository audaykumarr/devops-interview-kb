---
id: kubernetes-autoscaling-pods-evicted-during-scale-up-latency-001
title: "A Deployment's pods get evicted during scale-up because new nodes take too long to become ready — how would you close that gap?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: expert
question_type:
  - scenario
  - troubleshooting
tags:
  - kubernetes
  - autoscaling
  - cluster-autoscaler
  - reliability
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

During a sudden traffic increase, HPA correctly decides to scale up, and the cluster autoscaler correctly decides to add nodes to accommodate the new pods. But by the time the new nodes are actually ready, existing pods have already started getting evicted or the service has degraded — the gap between "scaling decided" and "capacity actually available" is itself causing the incident. How would you close that gap?

## Short Answer

The core problem is that cluster-level node provisioning (often 1-3+ minutes for a cloud provider to launch and register a new node) is slow relative to how fast a traffic spike can cause resource pressure — closing the gap means either avoiding the need to provision new nodes reactively at all (standing headroom, over-provisioned pause pods) or using Pod Priority and preemption to protect the workloads that matter most while capacity catches up, rather than letting eviction happen indiscriminately.

## Detailed Explanation

Reactive infrastructure scaling has an inherent floor on how fast it can respond — a cloud provider launching a new VM, registering it with the cluster, and having the kubelet report Ready takes real wall-clock time that no Kubernetes-level tuning can eliminate. The fix has to either remove the need to wait for that provisioning during the actual incident, or make sure the pain of insufficient capacity lands on the least important workloads while it's happening.

## Symptoms

- During a scale-up event, existing pods are evicted or degraded before new node capacity becomes available.
- `kubectl get nodes` shows new nodes taking a meaningful amount of time (often 1+ minutes) to transition from provisioning to `Ready`.
- The overall incident duration is dominated by this node-provisioning gap, not by the application's own startup time.

## Possible Causes

- No standing headroom exists — the cluster runs close to fully utilized under normal conditions, so any sudden demand increase immediately requires new node provisioning with no buffer to absorb it in the meantime.
- No Pod Priority classes are configured, so eviction under pressure is effectively arbitrary rather than protecting the most important workloads first.
- The cloud provider's node provisioning itself (image pull, instance boot time, kubelet registration) is slower than the application's growth in demand.

## Investigation Steps

**Measure the actual node provisioning latency for the cluster's specific infrastructure**: `kubectl get nodes -o json` timestamps (or cluster autoscaler's own metrics/logs) for recent scale-up events show exactly how long nodes take from creation trigger to `Ready` — this concrete number (rather than an assumption) is what any mitigation design needs to be sized against.

**Check whether Pod Priority classes exist and are actually applied**: `kubectl get priorityclass` and checking whether critical workloads' pod specs reference an appropriate `priorityClassName` — without this, the kubelet's eviction and the scheduler's preemption behavior during pressure has no signal for which pods matter more, and eviction effectively becomes arbitrary.

**Check current cluster utilization baseline against actual peak demand**: comparing typical utilization to the level that triggers the problematic scale-up reveals how much standing headroom would actually be needed to absorb the gap without triggering reactive node provisioning at all.

## Resolution

**Use Pod Priority and preemption so eviction protects what matters**: assigning higher `PriorityClass` to critical workloads means that if eviction does happen under pressure, lower-priority (non-critical) pods are evicted first, protecting the workloads that actually need to stay up while capacity catches up.

**Maintain standing headroom via low-priority pause pods**: deploying deliberately low-priority pods that consume otherwise-idle capacity, configured to be preempted first when real workloads need to scale, effectively reserves headroom that's available instantly (no node provisioning wait) for genuine demand, while not wasting that capacity when it isn't needed — this is a well-established pattern specifically for closing this exact gap.

**Consider over-provisioning `minReplicas`/node pool baseline for workloads where this gap is unacceptable**: for the most critical, latency-sensitive workloads, accepting some ongoing standing cost (more baseline replicas, a higher minimum node count) to avoid ever needing reactive node provisioning during a real incident is a deliberate, justified trade for the right workloads.

## Key Takeaways

- Node provisioning latency (often 1-3+ minutes) is a hard floor on reactive scale-up speed that no Kubernetes-level configuration alone can eliminate.
- Pod Priority classes ensure that if eviction happens under pressure, it protects the most important workloads rather than being effectively arbitrary.
- Low-priority pause pods reserving standing headroom (preempted first when real demand arrives) close the provisioning gap without wasting capacity when it isn't needed.
- For the most critical workloads, deliberately over-provisioning baseline capacity to avoid ever needing reactive node provisioning during an incident is a legitimate, if costly, trade.

## Interview Follow-Up Questions

- How would you size the pause-pod headroom correctly — too little doesn't help, too much wastes money?
- How does this problem and its mitigations differ between the traditional cluster autoscaler and a faster-provisioning tool like Karpenter?
- How would you communicate the cost trade-off of standing headroom to stakeholders who see it as "paying for capacity we're not using"?

## References

- [Kubernetes: Pod Priority and Preemption](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- [Kubernetes Autoscaler: Cluster Autoscaler FAQ — Overprovisioning](https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md#how-can-i-configure-overprovisioning-with-cluster-autoscaler)
