---
id: kubernetes-storage-expanding-pvc-for-statefulset-001
title: "How would you safely expand a PVC for a running StatefulSet without downtime, and what does the StorageClass need to support?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - practical
tags:
  - kubernetes
  - storage
  - statefulset
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A StatefulSet-managed database is running low on disk space. You need to expand its PersistentVolumeClaims' size without taking the database down. What does the StorageClass need to support for this to even be possible, and what's the actual safe procedure?

## Short Answer

The StorageClass must have `allowVolumeExpansion: true`, and the underlying storage backend/CSI driver must support online expansion (most modern cloud block storage does). With that in place, you edit the PVC's `spec.resources.requests.storage` directly to the new size — but for a StatefulSet, `volumeClaimTemplates` are immutable after creation, so this has to be done per-PVC directly (or via a StatefulSet recreation with `--cascade=orphan`), not by editing the StatefulSet spec itself.

## Detailed Explanation

**`allowVolumeExpansion` is the prerequisite, and it's off by default on many StorageClasses**: without `allowVolumeExpansion: true` set on the StorageClass, any attempt to increase a PVC's requested storage size will be rejected outright — checking this first (`kubectl get storageclass <name> -o yaml`) avoids attempting an expansion that was never going to be accepted.

**Whether expansion is genuinely "online" (no pod restart needed) depends on the CSI driver and the underlying filesystem**: most modern CSI drivers support expanding the underlying block volume without unmounting it, but the *filesystem* on top of that block device also needs to be resized to actually use the new space — for most common filesystems (ext4, xfs) this filesystem resize happens automatically when the pod's volume is next remounted, which for a running pod that never restarts can mean the filesystem-level resize doesn't happen until the next restart even though the block device itself grew.

**`volumeClaimTemplates` in a StatefulSet spec are immutable — you can't just edit the StatefulSet**: attempting to change `spec.volumeClaimTemplates` on an existing StatefulSet directly is rejected by the API server. The actual expansion happens by editing each PVC object individually (`kubectl edit pvc <statefulset-name>-<ordinal>` for each replica, or a scripted loop across all of them), since the PVCs already exist as independent objects even though they were originally created from the template.

**The safe sequence for a multi-replica StatefulSet is one PVC at a time, verifying health between each**: expanding all PVCs simultaneously risks all replicas hitting any expansion-related hiccup (a slow filesystem resize, a brief I/O pause) at the same time — expanding one replica's PVC, confirming its pod is healthy and the filesystem actually reflects the new size (`df -h` inside the pod), and only then moving to the next replica, keeps a majority of replicas healthy throughout in case anything goes wrong.

**Verify the filesystem actually grew, not just the PV object's reported size**: `kubectl get pvc` reporting the new, larger size only confirms the Kubernetes object was updated — it doesn't guarantee the filesystem inside the pod actually resized to use the new space. Checking `df -h` (or the equivalent) from inside the running container is the real confirmation that the expansion is fully complete and usable.

**Shrinking is generally not supported the same way**: unlike expansion, most CSI drivers and Kubernetes itself don't support shrinking a PVC in place — if a volume was over-provisioned and needs to be smaller, that typically requires provisioning a new, smaller PVC and migrating data, rather than an in-place operation analogous to expansion.

## Key Takeaways

- `allowVolumeExpansion: true` on the StorageClass is a hard prerequisite, and it's often off by default.
- StatefulSet `volumeClaimTemplates` are immutable — expansion happens by editing each PVC object directly, not the StatefulSet spec.
- The underlying block device can expand without a restart, but the filesystem on top of it may only actually resize on the pod's next remount — verify with `df -h` inside the pod, not just the PVC's reported size.
- Expand one replica's PVC at a time for a multi-replica StatefulSet, confirming health before moving to the next, rather than expanding all simultaneously.

## Interview Follow-Up Questions

- What would you do if a PVC expansion gets stuck in a `FileSystemResizePending` condition indefinitely?
- How would you handle shrinking an over-provisioned volume, given in-place shrinking generally isn't supported?
- How would you automate this expansion procedure safely for a StatefulSet with a large number of replicas, rather than doing it manually one at a time?

## References

- [Kubernetes: Expanding Persistent Volumes Claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims)
- [Kubernetes: StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
