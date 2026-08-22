---
id: kubernetes-storage-pod-pending-pvc-not-binding-001
title: "A pod is stuck Pending with an event about its PVC failing to bind — how do you diagnose why?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - kubernetes
  - storage
  - persistent-volumes
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`kubectl get pods` shows a pod stuck in `Pending`, and `kubectl describe pod` shows an event referencing its PersistentVolumeClaim failing to bind. How do you work out exactly why the PVC isn't binding, and fix it?

## Short Answer

Start with `kubectl describe pvc <name>` — its Events section almost always states the specific reason (no matching PV, provisioner failure, capacity mismatch, access mode mismatch) directly, rather than needing to reason about it indirectly from the pod. From there, the fix depends entirely on which specific reason it reports.

## Detailed Explanation

A PVC binding failure has a small, well-defined set of causes, and Kubernetes' own events for the PVC object are the most direct source for narrowing down which one applies — the investigation is about reading that signal precisely rather than reasoning about it indirectly through the pod's own (much less specific) `Pending` state.

## Symptoms

- `kubectl get pods` shows the pod in `Pending` state.
- `kubectl describe pod` shows an event like `pod has unbound immediate PersistentVolumeClaims`.
- `kubectl get pvc` shows the PVC itself in `Pending` state rather than `Bound`.

## Possible Causes

- No StorageClass is specified and no default StorageClass exists in the cluster, so dynamic provisioning never triggers.
- The requested StorageClass's provisioner is failing (misconfigured cloud credentials, quota exceeded, CSI driver not running).
- A statically-provisioned PV exists but doesn't match the PVC's requested size, access mode, or storage class.
- The PVC requests a zone-specific volume that can't be satisfied given where the pod is being scheduled (or vice versa, if `volumeBindingMode` isn't `WaitForFirstConsumer`).

## Investigation Steps

**Read the PVC's own events first**: `kubectl describe pvc <name> -n <namespace>` — the Events section directly states why binding is failing in the overwhelming majority of cases, for example `waiting for a volume to be created, either by external provisioner "ebs.csi.aws.com" or manually created by system administrator` (provisioning in progress or stuck) or `no persistent volumes available for this claim and no storage class is set`.

**Check whether a StorageClass is actually specified, and whether a default exists**: `kubectl get storageclass` — if the PVC's `spec.storageClassName` is empty and no StorageClass has the `storageclass.kubernetes.io/is-default-class: "true"` annotation, no provisioner will ever be triggered, and the PVC will sit `Pending` indefinitely with no further progress.

**Check the provisioner/CSI driver's own health**: `kubectl get pods -n kube-system` (or wherever the CSI driver runs) for the relevant driver's controller pods, and their logs — a provisioner that's crashlooping, lacking cloud IAM permissions, or hitting a quota limit will silently fail to provision, and this failure often only shows up in the driver's own logs, not the PVC's events.

**For statically-provisioned PVs, check for a genuine mismatch**: `kubectl get pv` and compare each candidate PV's `capacity`, `accessModes`, and `storageClassName` against exactly what the PVC requests — a PV that's slightly smaller than requested, or has a different access mode, won't bind even if it looks like an obvious match at a glance.

**Check for a zone/topology mismatch**: if the StorageClass doesn't use `volumeBindingMode: WaitForFirstConsumer`, a zonal volume can be provisioned in a different availability zone than where the pod later gets scheduled, leaving the PVC bound to a PV the pod's node can't actually attach — `kubectl get pv <name> -o yaml` and check `spec.nodeAffinity` against the pod's actual node.

## Resolution

The fix follows directly from what the PVC's events (or the deeper provisioner/CSI investigation) revealed: set or create a default StorageClass, fix the provisioner's underlying permissions/quota issue, correct a static PV's capacity/access-mode mismatch, or switch the StorageClass to `WaitForFirstConsumer` binding mode to resolve a zone mismatch. Confirm the fix by watching `kubectl get pvc -w` transition to `Bound`, then confirm the pod itself transitions out of `Pending`.

## Key Takeaways

- `kubectl describe pvc` is the first and most direct source of the actual binding failure reason — start there, not with the pod.
- A missing default StorageClass (and no explicit `storageClassName` on the PVC) is one of the most common causes of an indefinitely-`Pending` PVC.
- A struggling or misconfigured CSI provisioner often fails silently from the PVC's perspective — check the driver's own pod logs.
- `volumeBindingMode: WaitForFirstConsumer` prevents a zonal mismatch between where a volume is provisioned and where the pod is actually scheduled.

## Interview Follow-Up Questions

- How would you set up alerting to catch a PVC stuck `Pending` for an unusually long time, before it becomes a user-visible incident?
- What would you do if `kubectl describe pvc` shows no useful events at all?
- How would you test that a StorageClass's provisioner is genuinely healthy, without waiting for a real application's PVC to reveal a problem?

## References

- [Kubernetes: Persistent Volumes — Binding](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#binding)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
