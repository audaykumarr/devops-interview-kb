---
id: kubernetes-storage-access-modes-comparison-001
title: "What's the difference between ReadWriteOnce, ReadWriteMany, and ReadWriteOncePod, and what production symptom does picking the wrong one cause?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
technology_version:
  kubernetes: "1.29"
difficulty: beginner
question_type:
  - comparison
tags:
  - kubernetes
  - storage
  - persistent-volumes
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A PersistentVolumeClaim's `accessModes` field can be `ReadWriteOnce`, `ReadWriteMany`, or `ReadWriteOncePod`. What does each one actually restrict, and what real production symptom shows up when a workload is deployed with the wrong one?

## Short Answer

`ReadWriteOnce` (RWO) allows the volume to be mounted read-write by multiple pods, but only if they're scheduled on the same node; `ReadWriteMany` (RWX) allows read-write mounting from multiple pods across multiple nodes simultaneously; `ReadWriteOncePod` (RWOP) is the strictest — exactly one pod, cluster-wide, can mount it read-write at a time. Picking RWO for a workload that actually needs multi-node concurrent access produces `FailedAttachVolume`/multi-attach errors the moment a second pod on a different node tries to mount it; picking RWX when the underlying storage backend doesn't actually support it fails at provisioning time instead.

## Detailed Explanation

**`ReadWriteOnce` is node-scoped, not pod-scoped — a common misconception**: RWO is often assumed to mean "only one pod can ever mount this," but it actually means "only one node at a time" — multiple pods on the *same* node can mount an RWO volume simultaneously. This distinction matters directly for a Deployment with `replicas > 1`: if the scheduler happens to place two replicas on the same node, they can both mount the same RWO volume; if it places them on different nodes, the second one fails to attach.

**`ReadWriteMany` requires storage backend support — it's not universally available**: RWX needs a storage backend that supports concurrent multi-node access (NFS, most distributed filesystems, some cloud file-storage offerings) — common cloud block storage (AWS EBS, Azure Disk) fundamentally doesn't support RWX at all. Requesting RWX against a StorageClass backed by block storage fails at provisioning time with a clear error, rather than an ambiguous runtime symptom.

**`ReadWriteOncePod` closes a real gap RWO left open**: before RWOP existed (Kubernetes 1.22+, GA later), there was no way to guarantee true single-pod exclusivity — a StatefulSet expecting exactly one writer could still end up with two pods on the same node both mounting an RWO volume, which is exactly wrong for a workload (like some databases) that assumes exclusive access. RWOP enforces single-pod, cluster-wide, closing that gap explicitly.

**The real production symptom from picking RWO for a genuinely multi-node workload**: a Deployment scaled beyond one replica, or a rolling update where the old and new pod briefly coexist on different nodes, produces a `FailedAttachVolume` event and the new pod stays stuck `ContainerCreating` — this is a very common real incident specifically during rollouts, since the old pod (on node A) hasn't released the volume yet when the new pod (scheduled to node B) tries to attach it.

**Choosing the right mode is a workload-shape decision, not a default to leave unexamined**: a single-writer stateful workload (most databases) wants RWOP for correctness; a workload that's read-heavy and shared across many pods (a shared cache warm-up volume, shared static assets) needs RWX; the large majority of simple single-replica-per-node stateful workloads are correctly served by plain RWO. Defaulting to RWO without considering the workload's actual concurrency shape is what causes the rollout-time multi-attach failures.

## Key Takeaways

- `ReadWriteOnce` restricts to one *node* at a time, not one pod — multiple pods on the same node can share an RWO mount.
- `ReadWriteMany` requires explicit storage backend support and fails at provisioning time (not runtime) if the backend doesn't support it.
- `ReadWriteOncePod` guarantees true single-pod, cluster-wide exclusivity, closing a gap RWO leaves open for workloads that need it.
- Picking RWO for a workload that gets scheduled across multiple nodes (common during rolling updates) produces `FailedAttachVolume` errors and a stuck `ContainerCreating` pod.

## Interview Follow-Up Questions

- A StatefulSet pod is rescheduled to a new node but its volume won't attach — what's happening, and how do you fix it?
- How would you migrate an existing workload from `ReadWriteOnce` to `ReadWriteOncePod` without causing a deployment outage?
- Why might mounting the same ReadWriteOnce PVC work for two pods on some clusters but fail on others?

## References

- [Kubernetes: Persistent Volumes — Access Modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)
