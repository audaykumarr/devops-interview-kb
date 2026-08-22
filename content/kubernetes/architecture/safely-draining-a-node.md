---
id: kubernetes-architecture-safely-draining-a-node-001
title: "How would you safely drain and remove a node without disrupting running workloads?"
category: kubernetes
subcategory: architecture
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - practical
tags:
  - kubernetes
  - node-management
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A node needs to be removed from the cluster — for maintenance, decommissioning, or replacement. It's currently running a mix of workloads, including some that are availability-sensitive. Walk through how you'd safely drain and remove it without causing an outage for anything running there.

## Short Answer

Cordon the node first (marking it unschedulable, so nothing new lands there while you work), then drain it (`kubectl drain`, which evicts existing pods gracefully, respecting PodDisruptionBudgets so availability-sensitive workloads aren't all evicted simultaneously), confirm the node is genuinely empty of relevant workloads, and only then decommission it — the entire safety of this procedure depends on PDBs being correctly configured beforehand and on the rest of the cluster having spare capacity for evicted pods to land on.

## Detailed Explanation

**Cordon the node first, as a distinct step before draining**: `kubectl cordon <node>` marks the node unschedulable without touching any pods already running there — this prevents the scheduler from placing any *new* pod on the node while you're in the middle of migrating the existing ones off, avoiding a race where you drain the node only for something new to land on it moments later.

**Confirm PodDisruptionBudgets are correctly configured for availability-sensitive workloads before draining**: `kubectl get pdb -A` — a workload with `minAvailable`/`maxUnavailable` correctly set will have its eviction paced by the drain command respecting that budget; a workload with *no* PDB at all can have all of its replicas evicted from the node simultaneously if that's where they happen to be, which is exactly the outage this whole procedure exists to prevent — checking this before draining, not discovering it during, is what actually matters.

**Confirm the cluster has spare capacity for evicted pods to land on**: draining only helps if the evicted pods have somewhere healthy to reschedule to — checking current cluster-wide utilization against what this node's workloads will need elsewhere avoids evicted pods ending up `Pending` rather than smoothly relocating.

**Run the actual drain, and watch its progress rather than assuming success**: `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data` (flags needed since DaemonSet pods can't be meaningfully evicted, and pods with `emptyDir` volumes need explicit acknowledgment that that ephemeral data will be lost) — watching the command's output and `kubectl get pods -o wide` confirms pods are actually rescheduling successfully elsewhere, not just being evicted.

**Confirm the node is genuinely empty before decommissioning it**: once the drain completes, `kubectl get pods -o wide --field-selector spec.nodeName=<node>` should show nothing remaining (other than DaemonSet pods, which `--ignore-daemonsets` deliberately leaves in place since they'll be cleaned up by the DaemonSet controller when the node is actually removed) — only then is the node safe to remove from the cluster (`kubectl delete node`, plus whatever underlying infrastructure teardown is relevant), followed by confirming the migrated workloads are healthy on their new nodes.

## Key Takeaways

- Cordon before draining, as a distinct first step, to stop new pods from landing on a node that's about to have its existing pods migrated off.
- Correctly configured PodDisruptionBudgets are what actually make the drain step safe for availability-sensitive workloads — verify this before draining, not after something goes wrong.
- Confirm spare cluster capacity exists before draining, since evicted pods only help if they have somewhere healthy to reschedule to.
- `--ignore-daemonsets` and `--delete-emptydir-data` are typically necessary flags, each representing a deliberate acknowledgment of something the drain can't handle automatically.

## Interview Follow-Up Questions

- What would you do if `kubectl drain` hangs indefinitely because a pod's PodDisruptionBudget won't allow its eviction under any circumstances?
- How would you automate node draining as part of a larger cluster upgrade or node-pool replacement process, safely and at scale?
- How does the newer Kubernetes non-graceful node shutdown / `out-of-service` taint mechanism relate to this procedure, for a node that's already failed rather than being deliberately drained?

## References

- [Kubernetes: Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes: Specifying a Disruption Budget for your Application](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
