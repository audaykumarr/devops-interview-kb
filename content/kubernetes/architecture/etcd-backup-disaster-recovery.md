---
id: kubernetes-architecture-etcd-backup-disaster-recovery-001
title: "How would you design backup/DR for etcd, and what's actually recoverable from a snapshot versus what isn't?"
category: kubernetes
subcategory: architecture
technologies:
  - kubernetes
  - etcd
difficulty: advanced
question_type:
  - architecture
tags:
  - kubernetes
  - etcd
  - disaster-recovery
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A cluster's entire state lives in etcd — losing it without a usable backup means losing the record of every object in the cluster. How would you design a backup and disaster recovery strategy for etcd specifically, and what does restoring from a snapshot actually get you back, versus what's genuinely unrecoverable that way?

## Short Answer

Take regular `etcdctl snapshot save` backups (stored somewhere durable and off-cluster, since a local-only backup doesn't survive the same disaster that takes out the cluster) and periodically test actual restores, not just backup creation. A snapshot restore recovers every Kubernetes object's declared and last-known state — Deployments, Secrets, ConfigMaps, everything the API server ever wrote — but it does not recover anything that lived outside etcd entirely, most importantly actual application data in PersistentVolumes, which have their own separate backup requirement.

## Detailed Explanation

Since etcd is the cluster's only persistent state store, its backup strategy is effectively the cluster's disaster-recovery strategy for everything except actual application data — the design has to be explicit about that scope, including what it deliberately doesn't cover.

## Requirements

- Regular, automated etcd snapshots, stored durably outside the cluster itself.
- A tested, documented restore procedure — not just a backup creation process.
- Clear understanding of what a restore does and doesn't recover, to set correct expectations before an actual disaster.
- A defined recovery point objective (RPO) driving how frequently snapshots are taken.

## Architecture

**`etcdctl snapshot save` is the standard mechanism for point-in-time backups**: run against a healthy etcd member, it produces a single consistent snapshot file representing etcd's complete state at that moment — this is typically automated on a schedule (via a CronJob or an external backup tool) rather than run manually, with the resulting snapshot immediately transferred to durable, off-cluster storage (object storage in a different region/account, ideally).

**Storing the snapshot only on the same infrastructure as the cluster defeats the purpose**: a snapshot saved to local disk on a control-plane node doesn't survive the same infrastructure failure (a full cluster loss, a region outage) that the backup is meant to protect against — the snapshot's value depends entirely on being stored somewhere genuinely independent of the cluster's own failure domain.

**A snapshot restore recovers etcd's complete key-value state, which is everything the API server has ever persisted**: every object definition (Deployments, Services, ConfigMaps, Secrets, RBAC objects, everything) as of the snapshot's timestamp is fully recoverable — restoring the snapshot to a new etcd instance and pointing a fresh (or repaired) control plane at it brings back the entire declared cluster state exactly as it existed at snapshot time.

**What a restore does *not* recover: actual data inside PersistentVolumes**: etcd stores the *definition* of a PersistentVolumeClaim (its size, access mode, which StorageClass it uses) — it does not store the actual bytes written to the underlying volume by an application. Restoring etcd brings back the PVC object, which may or may not still successfully bind to its original underlying storage (depending on reclaim policy and whether that storage still exists) — but the file/database contents inside that volume are an entirely separate backup concern, requiring the volume-snapshot/Velero-style approach covered separately from etcd backup entirely.

**Anything created after the snapshot's timestamp is lost, defining the actual RPO**: a restore rolls the cluster's state back to exactly the snapshot's moment — any object created, deleted, or modified between the snapshot and the disaster is gone after restore, which is why snapshot frequency directly determines how much recent state (an acceptable amount, ideally) could be lost in a worst-case scenario.

**Test the actual restore procedure regularly, not just backup creation**: a backup that's never been used to perform a real restore is unverified — periodically practicing a full restore into a separate test cluster (confirming the resulting cluster genuinely comes up correctly with the expected objects) is what actually validates the strategy, since a subtly broken backup or restore procedure is often only discovered the hard way, during a real disaster, if it was never tested beforehand.

## Trade-offs

More frequent snapshots reduce the RPO (less potential data loss) but increase storage cost and the operational overhead of managing more backup artifacts — the right frequency is a deliberate trade-off against the business's actual tolerance for lost recent state, not a default to leave unexamined. Testing full restores regularly consumes real time and test infrastructure, but the alternative (an untested backup strategy) provides false confidence that can fail exactly when it matters most.

## Key Takeaways

- `etcdctl snapshot save`, automated and stored durably off-cluster, is the standard etcd backup mechanism — a local-only backup doesn't survive the disaster it's meant to protect against.
- A snapshot restore recovers every Kubernetes object's definition and last-known state as of the snapshot's timestamp — this is everything the API server has ever persisted.
- A restore does not recover actual data inside PersistentVolumes — that's a separate, volume-level backup concern entirely distinct from etcd backup.
- Test actual full restores regularly, not just backup creation, since an unverified backup strategy provides false confidence.

## Interview Follow-Up Questions

- How would you coordinate an etcd restore with the separate PersistentVolume data restore, to bring a cluster back to a genuinely consistent combined state?
- What would you do if the etcd snapshot restore succeeds, but some PVCs no longer bind correctly because their original underlying storage no longer exists?
- How would you determine the right snapshot frequency for a specific cluster's actual business RPO requirement?

## References

- [Kubernetes: Backing up an etcd cluster](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/#backing-up-an-etcd-cluster)
- [etcd: Disaster Recovery](https://etcd.io/docs/latest/op-guide/recovery/)
