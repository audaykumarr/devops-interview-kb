---
id: kubernetes-storage-backing-up-persistent-volume-data-001
title: "How would you back up and restore persistent volume data for a stateful app, given kubectl alone doesn't capture volume contents?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - practical
  - architecture
tags:
  - kubernetes
  - storage
  - backup
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A team assumes their GitOps setup (which backs up all their Kubernetes manifests) means their stateful application is fully backed up. It isn't — `kubectl get` and manifest backups capture the *definition* of a PersistentVolumeClaim, not the actual data written to the underlying volume. How would you actually design a backup and restore strategy for the data itself?

## Short Answer

Use the Kubernetes `VolumeSnapshot` API (backed by a CSI driver that supports snapshotting) to capture point-in-time, storage-backend-level snapshots of the actual volume contents, orchestrated by a backup tool like Velero that also captures the associated Kubernetes object state — and for anything transactional (a database), ensure the snapshot is application-consistent (via a pre-snapshot hook that flushes/quiesces writes) rather than just a raw disk-level snapshot that might capture data mid-write.

## Detailed Explanation

Kubernetes manifests describe desired state, not data — a GitOps repository backing up every PVC's YAML definition tells you nothing about what was actually written to the volume itself. Backing up the data requires a mechanism that operates at the storage layer, coordinated with (but distinct from) whatever already backs up the cluster's object definitions.

## Requirements

- Backups must capture actual volume data, not just the PVC/PV object definitions.
- Backups for transactional workloads must be application-consistent, not just crash-consistent.
- Restoring a backup must reconstruct both the Kubernetes objects and the underlying data together, in a way that actually reattaches correctly.
- The strategy should support both routine scheduled backups and an on-demand backup before a risky operation (like the PVC expansion or CSI driver upgrade scenarios).

## Architecture

**`VolumeSnapshot`/`VolumeSnapshotContent` are the Kubernetes-native mechanism for volume-level backups**: these API objects (part of the `snapshot.storage.k8s.io` API group) trigger the underlying CSI driver to take a storage-backend-level snapshot of a PV's contents — this is the foundational primitive that most higher-level backup tools build on, rather than something you'd typically invoke completely manually for a production backup strategy.

**A backup tool like Velero orchestrates both the object state and the volume snapshots together**: Velero (or a similar tool) backs up the Kubernetes API object definitions (Deployments, PVCs, ConfigMaps, Secrets) *and* triggers VolumeSnapshots for the associated PVs as one coordinated backup operation — this matters because restoring only the volume data without the matching object definitions (or vice versa) produces an incomplete, likely broken restore.

**Application-consistent snapshots require coordinating with the application itself**: a raw storage-level snapshot taken while a database is mid-transaction can capture data in an inconsistent state — tools that support pre/post-hooks (running a command inside the pod before and after the snapshot, like a database-specific flush or lock command) ensure the snapshot represents a consistent point in time from the application's perspective, not just whatever bytes happened to be on disk at that instant.

**Restore needs to handle both the "same cluster" and "different cluster" cases differently**: restoring into the same cluster after an accidental deletion is comparatively simple; restoring into a new cluster (disaster recovery, or migrating environments) requires the backup to be portable — meaning the VolumeSnapshots need to be stored somewhere accessible outside the original cluster (most backup tools store an actual copy of the data in object storage, not just a reference to a backend-specific snapshot that might not exist if the original cluster/region is gone).

**Test restores are part of the architecture, not an afterthought**: a backup strategy that's never actually been used to restore into a clean environment is unverified — periodically practicing a full restore (into a test namespace or cluster) is what actually confirms the backup strategy works, rather than discovering a gap in it during a real incident.

## Trade-offs

Application-consistent snapshots (with pre/post hooks) add latency and complexity to each backup operation compared to a raw crash-consistent snapshot, but are necessary for transactional workloads where a corrupted restore is unacceptable. Storing full data copies in object storage (for cross-cluster portability) costs more than relying on backend-specific snapshots alone, but is what actually makes disaster recovery into a different region or cluster possible at all.

## Key Takeaways

- Manifest/GitOps backups capture PVC/PV *definitions*, never the actual volume data — a separate, deliberate mechanism is required for the data itself.
- The Kubernetes `VolumeSnapshot` API (via a snapshot-capable CSI driver) is the native primitive; tools like Velero orchestrate it alongside Kubernetes object backups.
- Transactional workloads need application-consistent snapshots (pre/post hooks), not just raw storage-level snapshots, to avoid capturing data mid-write.
- Regularly test actual restores into a clean environment — an unverified backup strategy is not a real backup strategy.

## Interview Follow-Up Questions

- How would you design the pre/post-snapshot hooks for a specific database to guarantee application consistency?
- What would you do if the CSI driver in use doesn't support the `VolumeSnapshot` API at all?
- How would you validate, on a recurring schedule, that backups are actually restorable rather than just assuming they are because the backup job reports success?

## References

- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Velero: Documentation](https://velero.io/docs/latest/)
