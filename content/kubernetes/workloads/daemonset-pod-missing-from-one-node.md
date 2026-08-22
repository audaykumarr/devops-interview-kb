---
id: kubernetes-workloads-daemonset-pod-missing-from-one-node-001
title: "A DaemonSet pod is missing from exactly one node while running fine everywhere else — how do you find out why?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - kubernetes
  - daemonset
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A DaemonSet is supposed to run its pod on every node in the cluster. `kubectl get pods -o wide` shows it running correctly everywhere except one specific node. How do you figure out why that one node is being skipped or failing?

## Short Answer

Check the DaemonSet's own status first (`kubectl get daemonset` desired vs. current vs. ready counts) to confirm whether the pod was never scheduled there at all versus scheduled but failing — then check that specific node's taints against the DaemonSet's tolerations if it was never scheduled, or the pod's own events/logs if it was scheduled but isn't healthy.

## Detailed Explanation

A DaemonSet missing from exactly one node is either a scheduling decision (the node was deliberately or accidentally excluded) or a pod-level failure specific to that node — distinguishing which one it is up front determines the entire rest of the investigation.

## Symptoms

- `kubectl get pods -o wide` shows the DaemonSet's pod running on every node except one.
- `kubectl get daemonset <name>` shows `DESIRED` higher than `CURRENT` or `READY`.
- No pod object exists for that node at all, or one exists but isn't `Running`/`Ready`.

## Possible Causes

- The node has a taint the DaemonSet's pod spec doesn't tolerate (a custom taint added for a specific purpose, or a standard taint like `node.kubernetes.io/unschedulable` from a drain that wasn't reversed).
- A `nodeSelector` or `nodeAffinity` on the DaemonSet excludes that node based on a label it doesn't have.
- The pod was scheduled but is failing to start (image pull failure, resource constraints specific to that node, a node-local dependency the pod needs isn't present).
- The node itself is in a `NotReady` or cordoned state.

## Investigation Steps

**Check whether a pod object exists for that node at all**: `kubectl get pods -o wide -l <daemonset-selector>` — if there's genuinely no pod scheduled there, the cause is a scheduling exclusion (taint/toleration or node selector mismatch); if a pod exists but isn't healthy, the cause is at the pod level instead. This single check divides the investigation into two very different paths.

**If no pod was scheduled, check the node's taints against the DaemonSet's tolerations**: `kubectl describe node <node>` shows the node's `Taints` field — compare it against the DaemonSet's `spec.template.spec.tolerations`. A taint the DaemonSet doesn't tolerate (including ones automatically added during a cordon/drain, or a custom taint someone added for an unrelated reason) is one of the most common causes of exactly this "everywhere except one node" symptom.

**Check for a `nodeSelector`/`nodeAffinity` mismatch**: `kubectl get daemonset <name> -o yaml` for its scheduling constraints, compared against `kubectl get node <node> --show-labels` — if the DaemonSet requires a label the specific node doesn't have (perhaps it was provisioned differently, or a label was manually removed), it's correctly excluded rather than a bug.

**If a pod does exist but isn't healthy, check its events and logs directly**: `kubectl describe pod <pod> -n <namespace>` for scheduling/startup events, and `kubectl logs <pod>` for application-level failures — a node-specific issue (a missing host path the pod depends on, a port conflict with something else running on that specific node, insufficient resources on that particular node) would show up here.

**Check the node's own readiness/cordon state**: `kubectl get node <node>` — a cordoned node (`SchedulingDisabled`) won't receive new DaemonSet pods, and a `NotReady` node's existing DaemonSet pod may be shown as unhealthy purely because the node itself is unhealthy, independent of anything DaemonSet-specific.

## Resolution

If it's a taint/toleration mismatch that shouldn't exist (a leftover cordon taint after a maintenance window, for example), remove the taint or uncordon the node. If it's an intentional taint the DaemonSet genuinely needs to tolerate (a case where this specific node type should run the DaemonSet despite the taint, e.g., a GPU node still needing a monitoring agent), add the corresponding toleration to the DaemonSet spec. If the pod exists but is unhealthy, fix the node-specific underlying issue (resource, host-path, or port conflict) identified in the investigation, then confirm resolution with `kubectl get daemonset` showing `DESIRED == CURRENT == READY`.

## Key Takeaways

- Start by determining whether the pod was never scheduled on that node versus scheduled-but-unhealthy — these point to entirely different investigation paths.
- A node taint the DaemonSet doesn't tolerate (often a leftover cordon taint) is one of the most common causes of a DaemonSet pod missing from exactly one node.
- Compare the DaemonSet's `nodeSelector`/`nodeAffinity` against the specific node's actual labels before assuming it's a bug rather than correct exclusion.
- For a scheduled-but-unhealthy pod, the issue is often genuinely node-specific (a host-path dependency, a port conflict) rather than something that would show up the same way on other nodes.

## Interview Follow-Up Questions

- How would you safely roll out a breaking change to a DaemonSet running a critical node-level agent across a large production cluster?
- How would you write a monitoring check that specifically alerts when a DaemonSet's actual coverage falls short of the cluster's total node count?
- What's the difference between a taint that's automatically applied (like during a cordon) and one that's manually applied for workload isolation, and how would you distinguish them during this investigation?

## References

- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
