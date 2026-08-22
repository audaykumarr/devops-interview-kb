---
id: kubernetes-storage-csi-driver-upgrade-breaks-new-attaches-001
title: "A CSI driver upgrade causes new attach operations to fail while already-mounted volumes keep working — how do you investigate, and how would you roll this out more safely next time?"
category: kubernetes
subcategory: storage
technologies:
  - kubernetes
difficulty: expert
question_type:
  - troubleshooting
  - scenario
tags:
  - kubernetes
  - storage
  - csi
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

After upgrading a cluster's CSI storage driver, existing pods with already-mounted volumes continue running fine, but any *new* pod that needs to attach a volume — whether a new PVC or an existing pod being rescheduled — fails. How do you investigate this, and how would you have rolled out the upgrade to catch this before it hit every new attach cluster-wide?

## Short Answer

This split symptom (existing mounts fine, new attaches broken) points directly at the CSI *controller* plugin, not the *node* plugin — attach/provision operations go through the controller, while already-mounted volumes are being served by the node plugin's existing mount, which the controller upgrade doesn't touch. Diagnose by checking the CSI controller pod's own health and logs; prevent recurrence with a staged rollout (canary namespace or cluster) that specifically exercises new attach operations before the upgrade reaches production-wide.

## Detailed Explanation

CSI drivers are split into two independently-running components: a controller plugin (handles provisioning, attaching, detaching — cluster-scoped operations) and a node plugin (handles mounting an already-attached volume into a pod, running per-node as a DaemonSet). This symptom's specific shape — existing mounts unaffected, new attaches broken — is the direct fingerprint of a controller-side regression, since existing mounts don't need the controller at all once they're already attached, while any new attach operation does.

## Symptoms

- Pods with volumes that were already mounted before the CSI driver upgrade continue running without issue.
- Any new PVC provisioning, or any pod attach operation (including a healthy pod simply being rescheduled), fails or hangs.
- `kubectl describe pod` on an affected pod shows a stuck or failing `AttachVolume`/`FailedMount` event.

## Possible Causes

- The CSI controller plugin's new version has a bug, a changed default configuration, or incompatible API version against the cluster's Kubernetes version.
- The controller plugin's ServiceAccount lost a required RBAC permission or cloud IAM permission as part of the upgrade's manifest changes.
- A CRD (`VolumeAttachment`, `CSINode`) version mismatch between the old and new driver version.

## Investigation Steps

**Check the CSI controller plugin's pod status and logs first**: `kubectl get pods -n <csi-namespace>` for the controller deployment/statefulset specifically (not the per-node DaemonSet) — a crashlooping, `ImagePullBackOff`, or otherwise unhealthy controller pod immediately explains why no new attach can succeed, since every attach request depends on it.

**Read the controller's logs for the specific attach failure**: `kubectl logs -n <csi-namespace> <controller-pod> -c <csi-provisioner-or-attacher-container>` — CSI sidecar containers (`csi-provisioner`, `csi-attacher`) log the specific gRPC error returned by the driver, which usually states the exact failure (a permission error, an API incompatibility, a configuration validation failure) rather than requiring guesswork.

**Check for an RBAC or cloud IAM permission regression introduced by the upgrade**: if the new driver version's manifests changed required permissions (a new CRD it needs to read, a new IAM action it calls), and the cluster's applied RBAC/IAM wasn't updated to match, the controller will be running but failing every operation with `Forbidden` — diffing the new version's required RBAC manifests against what's actually applied is a common, specific root cause.

**Confirm the node plugin's version and the controller's version are actually compatible with each other**: some CSI drivers version their node and controller components together and expect them to match — checking both DaemonSet and Deployment/StatefulSet image tags confirms whether a partial rollout (controller upgraded, node plugin not yet, or vice versa) is itself the source of the incompatibility.

## Resolution

Roll back the CSI controller plugin to the previously-working version if the investigation points to a driver bug or incompatibility, restoring new-attach functionality immediately while the actual fix (permission correction, waiting for a patched driver version) is worked out separately. If the cause was a missing RBAC/IAM permission, apply the corrected permissions and re-test a new attach operation directly (not just wait for the next real pod to need one) to confirm the fix actually works before considering the incident resolved.

## Key Takeaways

- The controller-plugin-vs-node-plugin split in CSI's architecture is what explains this exact symptom shape — new operations depend on the controller, already-mounted volumes don't.
- Check the CSI controller's own pod health and sidecar container logs first — the specific gRPC error usually states the actual cause directly.
- A missing RBAC/cloud IAM permission introduced by the upgrade's manifest changes is a common, specific root cause worth diffing explicitly.
- For future rollouts: stage the CSI driver upgrade through a canary namespace or non-production cluster that specifically exercises new PVC provisioning and pod attach operations, not just a general health check, before promoting cluster-wide.

## Interview Follow-Up Questions

- How would you design a synthetic test that continuously exercises new-attach operations, to catch this class of regression within minutes of a rollout rather than waiting for a real pod to need one?
- What would you do if rolling back the CSI controller itself doesn't restore functionality, because the CRDs it manages were also upgraded to an incompatible version?
- How would you coordinate a CSI driver upgrade across a multi-cluster fleet to limit the blast radius of exactly this kind of regression?

## References

- [Kubernetes CSI: Container Storage Interface (CSI) for Kubernetes](https://kubernetes-csi.github.io/docs/)
- [Kubernetes CSI: Deploying a CSI Driver](https://kubernetes-csi.github.io/docs/deploying.html)
