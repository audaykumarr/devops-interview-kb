---
id: kubernetes-architecture-zero-downtime-cluster-upgrade-sequencing-001
title: "A cluster upgrade needs zero workload downtime — walk through sequencing control-plane and node upgrades safely."
category: kubernetes
subcategory: architecture
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - scenario
  - practical
tags:
  - kubernetes
  - upgrades
  - control-plane
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Kubernetes cluster needs to move from one minor version to the next. Workloads running on it can't have any downtime during the process. Walk through how you'd sequence the control-plane and node upgrades to actually achieve that.

## Short Answer

Upgrade the control plane first (one component/node at a time, since a highly-available control plane tolerates individual node upgrades without full downtime), then upgrade worker nodes one at a time (or in small batches) by draining each node before upgrading it and uncordoning it after, letting the existing Deployment/StatefulSet controllers reschedule pods onto still-available nodes throughout — the key enabler for zero workload downtime is that node draining, combined with adequate spare capacity and properly configured PodDisruptionBudgets, moves workloads gracefully rather than dropping them.

## Detailed Explanation

**Control plane before worker nodes, following Kubernetes' version skew policy**: the API server must be upgraded first among control-plane components, and no component can be newer than the API server — kubelets can run up to a few minor versions older than the API server (within the documented skew policy), which is exactly what allows the control plane to be fully upgraded while worker nodes still run the old version, without immediately breaking anything.

**With an HA control plane, control-plane nodes are upgraded one at a time**: since a highly-available control plane has multiple API server/etcd replicas, upgrading them sequentially (one node fully upgraded and confirmed healthy before moving to the next) means the API server remains reachable throughout, load-balanced across the still-healthy replicas — this is exactly why the earlier investment in HA control-plane design pays off directly during upgrades, not just during unplanned failures.

**Worker node upgrades proceed one node (or a small batch) at a time via drain-upgrade-uncordon**: `kubectl drain <node>` evicts the node's pods (respecting PodDisruptionBudgets) and marks it unschedulable, the node is then upgraded (new kubelet/kubeadm version, OS patches if bundled), and `kubectl uncordon <node>` makes it schedulable again — repeating this across all worker nodes achieves a full-cluster upgrade without ever taking more than one node's workloads offline simultaneously.

**PodDisruptionBudgets are what actually prevent the drain step from causing an outage**: a PDB defines the minimum number/percentage of a workload's pods that must remain available during voluntary disruptions like a drain — without a PDB, `kubectl drain` can evict all of a Deployment's replicas on one node simultaneously if that's where they all happen to be, and if that Deployment has no other replicas elsewhere, that's a real outage; a correctly configured PDB makes the drain wait or refuse to evict beyond what the PDB allows, forcing genuinely safe pacing.

**Spare cluster capacity needs to exist for evicted pods to actually reschedule successfully**: draining a node only helps if the evicted pods have somewhere to go — if the cluster is already running near full capacity, evicted pods can end up `Pending` rather than smoothly rescheduling elsewhere, which defeats the "zero downtime" goal even though the drain itself technically succeeded; either maintaining standing headroom or temporarily adding extra capacity for the duration of the upgrade addresses this.

**Test the full sequence, including PDB behavior, in a non-production environment first**: because the actual zero-downtime property depends on the interaction between drain behavior, PDBs, and available capacity — none of which is trivial to reason about in the abstract — validating the full upgrade procedure against a representative staging environment (with realistic PDB configurations and capacity constraints) is what actually gives confidence before running it against production.

## Key Takeaways

- Control plane upgrades before worker nodes, following Kubernetes' version skew policy, and one control-plane node at a time to keep the API server available throughout via the remaining healthy replicas.
- Worker nodes upgrade via drain → upgrade → uncordon, one node (or small batch) at a time, never taking more than a bounded slice of capacity offline simultaneously.
- PodDisruptionBudgets are what actually enforce safe eviction pacing during drains — without them, a drain can evict an entire workload's replicas at once if they're co-located.
- Spare cluster capacity must exist for evicted pods to actually reschedule successfully — a drain succeeding doesn't guarantee the evicted pods land somewhere healthy if the cluster is already near full.

## Interview Follow-Up Questions

- How would you handle a node that a drain can't fully evict because of a PDB blocking the last necessary eviction indefinitely?
- What's Kubernetes' version skew policy specifically, and what happens if you violate it during a rushed or incorrectly sequenced upgrade?
- How would you automate this entire upgrade sequence safely, rather than performing each step manually across potentially many nodes?

## References

- [Kubernetes: Version Skew Policy](https://kubernetes.io/docs/setup/release/version-skew-policy/)
- [Kubernetes: Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
