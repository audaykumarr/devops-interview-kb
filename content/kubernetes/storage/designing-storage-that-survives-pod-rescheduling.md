---
id: kubernetes-storage-surviving-pod-rescheduling-001
title: "A production workload needs persistent storage, and its pods may be rescheduled to different nodes — how do you design storage so data survives that?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
difficulty: beginner
question_type:
  - scenario
  - architecture
tags:
  - kubernetes
  - storage
  - persistent-volumes
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A workload needs to write data that must survive both pod restarts and the pod being rescheduled to an entirely different node. Simply writing to the container's own filesystem clearly won't work. How would you design the storage so the data reliably survives both cases?

## Short Answer

Decouple the data's lifecycle from the pod's lifecycle by using a PersistentVolume (PV) backed by network-attached or cloud-block storage, requested by the pod through a PersistentVolumeClaim (PVC) — since the PV exists as its own Kubernetes object independent of any specific pod, a rescheduled pod can reattach to the same underlying storage on its new node, which a node-local mechanism like `hostPath` fundamentally cannot support.

## Detailed Explanation

The core design problem is that a pod's own lifecycle (created, deleted, rescheduled) and the data's required lifecycle (must persist regardless of what happens to any specific pod) are fundamentally different — the solution has to introduce an object whose lifecycle is independent of any one pod, which is exactly what the PersistentVolume/PersistentVolumeClaim abstraction provides.

## Requirements

- Data written by the workload must survive a pod restart on the same node.
- Data must also survive the pod being rescheduled to a completely different node (e.g., after a node failure or drain).
- The solution needs to work generically across whatever underlying infrastructure the cluster runs on (cloud block storage, on-prem SAN, etc.).

## Architecture

**PersistentVolume and PersistentVolumeClaim decouple storage from pod lifecycle**: a PVC is a request for storage that a pod references in its spec; the PV it binds to is a separate, cluster-level object representing the actual underlying storage resource. Because the PV isn't owned by any specific pod, when a pod is deleted and recreated (on the same node or a different one), its PVC — and therefore the same underlying PV — can be reattached to the new pod instance.

**Why `hostPath` fails this requirement entirely**: `hostPath` mounts a directory from the specific node the pod happens to be running on — the moment the pod is rescheduled to a different node, that data simply isn't there, since it never left the original node's local disk. `hostPath` is only appropriate for node-local, disposable, or genuinely node-scoped data (like accessing a node's own logs), never for data that must survive rescheduling.

**Network-attached or cloud block storage is the underlying mechanism that makes this possible**: the PV itself is backed by storage that exists independently of any single node — cloud block storage (EBS, Azure Disk, Persistent Disk), a network filesystem (NFS), or a distributed storage system (Ceph, Longhorn) — provisioned and managed through a CSI (Container Storage Interface) driver. It's this underlying infrastructure property, not anything Kubernetes does on its own, that actually makes the data survive a node change.

**Access mode matters for how many pods can use the volume, and where**: for most single-writer stateful workloads, `ReadWriteOnce` (usable by one node at a time) is sufficient and simplest — but understanding that this restricts the volume to one node at a time (not one pod) matters for how the workload can be scheduled and rescheduled without a multi-attach conflict.

**Rescheduling is a scheduling problem too, not just a data problem**: the new pod needs to actually be scheduled onto a node where the underlying storage can be attached (for zonal cloud block storage, that means the same availability zone as the volume) — `volumeBindingMode: WaitForFirstConsumer` on the StorageClass ensures the PV is provisioned in a zone compatible with wherever the pod actually gets scheduled, rather than the two being decided independently and potentially conflicting.

## Trade-offs

Network-attached storage has higher I/O latency than a node's local disk, which matters for genuinely performance-sensitive workloads — for those, node-local storage with application-level replication (rather than relying on Kubernetes-managed PVs) is sometimes the better trade, accepting more operational complexity in exchange for lower latency. For the large majority of stateful workloads, though, the operational simplicity and reliability of PV/PVC-based storage outweighs the latency cost.

## Key Takeaways

- PersistentVolume and PersistentVolumeClaim exist independently of any specific pod, which is what allows a rescheduled pod to reattach to the same data.
- `hostPath` is node-local and cannot survive a pod being rescheduled to a different node — it's fundamentally the wrong tool for this requirement.
- The actual cross-node durability comes from the underlying storage infrastructure (cloud block storage, network filesystem), provisioned via a CSI driver.
- `volumeBindingMode: WaitForFirstConsumer` avoids a mismatch between where a zonal volume is provisioned and where the pod actually gets scheduled.

## Interview Follow-Up Questions

- What's the difference between `ReadWriteOnce`, `ReadWriteMany`, and `ReadWriteOncePod`, and what production symptom does picking the wrong one cause?
- A pod is stuck `Pending` with an event about its PVC failing to bind — how do you diagnose why?
- How would you back up and restore persistent volume data for a stateful app, given `kubectl` alone doesn't capture volume contents?

## References

- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
