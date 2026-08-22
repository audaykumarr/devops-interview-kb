---
id: kubernetes-storage-statefulset-volume-wont-attach-after-reschedule-001
title: "A StatefulSet pod is rescheduled to a new node but its volume won't attach — what's happening, and how do you fix it?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - storage
  - statefulset
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A node running a StatefulSet pod fails (or is drained), and Kubernetes reschedules the pod to a new node. The new pod stays stuck `ContainerCreating`, with an event mentioning the volume is already in use or can't be attached. What's actually happening, and how do you resolve it?

## Short Answer

This is almost always a multi-attach error caused by block storage's `ReadWriteOnce` semantics combined with the old node not having cleanly released the volume — commonly because the old node is unreachable (not gracefully shut down), so Kubernetes can't confirm the volume was actually detached before trying to attach it to the new node. The fix is to confirm the old node is genuinely down (not just slow), then force-detach the volume so the new pod can attach it — carefully, since doing this against a node that's still actually running risks data corruption from two writers touching the same volume simultaneously.

## Detailed Explanation

A rescheduled StatefulSet pod expects its PVC to follow it to the new node, but the underlying storage can only be attached to one node at a time under `ReadWriteOnce`. This mechanism works cleanly on a graceful reschedule (old pod terminates, volume detaches, new pod attaches) — it breaks specifically when the old node disappears without going through that clean detach sequence, leaving the storage backend believing the volume is still attached to a node that no longer exists or isn't responding.

## Symptoms

- A rescheduled StatefulSet pod is stuck `ContainerCreating` or `Pending` on its new node.
- `kubectl describe pod` shows an event like `Multi-Attach error for volume "pvc-xxx": Volume is already used by pod(s) <old-pod>` or a CSI-specific attach timeout.
- The old pod may still show as `Terminating` or already be gone, while the underlying node itself is unreachable (`NotReady`).

## Possible Causes

- The old node failed ungracefully (hardware failure, network partition), so the volume was never cleanly detached before Kubernetes tried to schedule the pod elsewhere.
- The StatefulSet's `terminationGracePeriodSeconds` wasn't enough time for the old pod's volume to detach cleanly before the node became unreachable.
- The storage backend's own attach/detach reconciliation is slow or stuck, independent of the node's actual state.

## Investigation Steps

**Confirm the old node's actual state, not just its Kubernetes-reported condition**: `kubectl get node <old-node>` showing `NotReady` doesn't by itself confirm the node is truly down — a network partition can produce the same `NotReady` status while the node (and the pod's process using the volume) is still very much running. Checking the underlying infrastructure directly (cloud console, hypervisor status, ping/SSH if reachable) is necessary before concluding it's safe to force anything.

**Check the volume's attach state from the storage backend's perspective**: cloud providers expose the actual attach state of a block volume independent of what Kubernetes believes (e.g., `aws ec2 describe-volumes` for EBS) — comparing this against Kubernetes' own view (`kubectl get volumeattachments`) reveals whether the mismatch is a Kubernetes-side reconciliation lag or a genuinely stuck attachment on the storage backend's side.

**Check `VolumeAttachment` objects directly**: `kubectl get volumeattachments -o wide` shows which node each PV is currently believed to be attached to — a stale `VolumeAttachment` still referencing the old, dead node is the direct evidence of what's blocking the new pod's attach.

## Resolution

If the old node is confirmed genuinely down (not just unreachable due to a transient network issue), manually deleting the stale `VolumeAttachment` object (or, for cloud storage, force-detaching the volume via the cloud provider's API/console) releases it so the new node can attach it. This must only be done after confirming the old node isn't still running — force-detaching a volume still in use by a genuinely-alive node risks two nodes writing to the same block device simultaneously, which can corrupt the filesystem. After the forced detach, the new pod's attach should proceed automatically; confirm with `kubectl describe pod` showing a successful `AttachVolume` event.

## Key Takeaways

- This is fundamentally a `ReadWriteOnce` semantics problem colliding with an ungraceful node failure — the storage backend still believes the volume is attached to a node that's no longer cleanly reachable.
- `NotReady` on the old node doesn't by itself prove it's actually down — verify via the underlying infrastructure before forcing anything.
- `kubectl get volumeattachments` and the storage backend's own attach-state view are the concrete evidence sources, not just the pod's event message.
- Force-detaching against a node that's still genuinely running risks data corruption from concurrent writers — this must be a deliberate, verified action, not a reflexive unblock step.

## Interview Follow-Up Questions

- How would you design monitoring to detect this class of stuck multi-attach situation before it becomes a multi-hour outage?
- What's different about this failure mode for a workload using `ReadWriteOncePod` instead of `ReadWriteOnce`?
- How does the Kubernetes non-graceful node shutdown handling feature (`out-of-service` taint) change this investigation for newer cluster versions?

## References

- [Kubernetes: Non-graceful node shutdown](https://kubernetes.io/docs/concepts/architecture/nodes/#non-graceful-node-shutdown)
- [Kubernetes: Persistent Volumes — Access Modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)
