---
id: kubernetes-storage-readwriteonce-node-vs-pod-scoped-001
title: "Why might mounting the same ReadWriteOnce PVC work for two pods on some clusters but fail on others?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
technology_version:
  kubernetes: "1.29"
difficulty: advanced
question_type:
  - troubleshooting
  - conceptual
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

Two pods both mount the same `ReadWriteOnce` PVC. On one cluster this works fine; on another, the second pod fails to attach with a multi-attach error. Both clusters are running a supported Kubernetes version. Why would the exact same manifest behave differently?

## Short Answer

`ReadWriteOnce` restricts a volume to being mounted read-write by only one *node* at a time, not one *pod* — so whether two pods can successfully share it depends on whether the scheduler happens to place them on the same node, which the manifest itself doesn't guarantee. The difference between clusters is most often explained by different scheduling outcomes, though some CSI drivers also enforce stricter single-attachment semantics than the Kubernetes API's baseline RWO behavior technically requires.

## Detailed Explanation

`ReadWriteOnce`'s actual restriction — one *node* at a time, not one *pod* — means whether two pods can share the mount depends entirely on whether the scheduler happens to place them on the same node, which isn't guaranteed by the manifest itself, and can additionally be affected by CSI driver-specific behavior that's stricter than the baseline Kubernetes semantics.

## Symptoms

- The same PVC and pod manifests behave differently across two clusters (or even across two different scheduling outcomes on the same cluster).
- One outcome: both pods run successfully, sharing the RWO volume.
- The other outcome: the second pod fails to attach with a `Multi-Attach error for volume` event.

## Possible Causes

- The two pods were scheduled onto the same node in the working case, and different nodes in the failing case — RWO permits multiple pods to mount read-write simultaneously only if they're on the same node.
- The CSI driver in use on the failing cluster enforces stricter single-pod semantics than the Kubernetes RWO baseline technically requires (some CSI drivers effectively behave like `ReadWriteOncePod` even when the PVC only requests RWO).
- A difference in Kubernetes version between the two clusters affects `ReadWriteOncePod` availability or default CSI driver behavior.

## Investigation Steps

**Check where each pod was actually scheduled on both clusters**: `kubectl get pods -o wide` showing the node column directly confirms whether the working case had both pods on the same node — this is the single most likely explanation and should be checked first before assuming anything about the CSI driver.

**Check which CSI driver each cluster uses, and its specific documented behavior**: not all CSI drivers implement RWO's "same node" permissiveness identically — some implementations are stricter in practice than the Kubernetes API's own definition technically requires, meaning the same `accessModes: [ReadWriteOnce]` PVC spec can behave differently purely based on which storage backend and driver version is underneath it.

**Compare Kubernetes versions and check for `ReadWriteOncePod` availability**: if one cluster is on a version where `ReadWriteOncePod` enforcement-related behavior differs, or where a CSI driver version has changed its RWO handling, that's a second axis worth ruling out alongside the scheduling explanation.

## Resolution

If the workload genuinely requires guaranteed single-pod exclusivity (a database, for instance), switch the PVC's access mode to `ReadWriteOncePod` explicitly rather than relying on RWO's same-node permissiveness, which was never a guarantee to begin with — this removes the ambiguity entirely and makes the behavior consistent and predictable across any cluster and CSI driver. If genuinely sharing across pods on the same node was the intended design, that's inherently fragile against future scheduling changes (an update to the scheduler's placement decisions could break it) and should be reconsidered in favor of `ReadWriteMany` on a backend that actually supports it, if true multi-node sharing is the real requirement.

## Key Takeaways

- `ReadWriteOnce` permits multiple pods to mount read-write simultaneously only if the scheduler happens to place them on the same node — this was never a documented guarantee to rely on.
- CSI driver implementations can be stricter than the Kubernetes API's baseline RWO semantics, so identical manifests can behave differently across storage backends.
- `ReadWriteOncePod` exists specifically to remove this ambiguity for workloads that need guaranteed single-pod exclusivity.
- Relying on RWO's same-node permissiveness for intentional pod-sharing is fragile — a scheduling change alone can break it without any manifest change at all.

## Interview Follow-Up Questions

- How would you migrate an existing workload relying on this fragile same-node RWO sharing behavior to something more robust?
- What's the practical difference in how you'd design a workload around `ReadWriteOncePod` versus `ReadWriteMany`, given they solve different problems?
- How would you test, before a production incident, whether your cluster's specific CSI driver behaves more strictly than the Kubernetes RWO baseline?

## References

- [Kubernetes: Persistent Volumes — Access Modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes)
