---
id: kubernetes-scheduling-pod-pending-untolerated-taint-001
title: "A pod stays Pending with node(s) had untolerated taint — how do you diagnose it and decide toleration vs. removing the taint?"
category: kubernetes
subcategory: scheduling
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - kubernetes
  - taints
  - tolerations
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

`kubectl describe pod` shows an event like `0/8 nodes are available: 3 node(s) had untolerated taint {dedicated: gpu}, 5 node(s) had untolerated taint {node.kubernetes.io/unschedulable: }`. The pod stays `Pending`. How do you diagnose this and decide whether the fix is adding a toleration to the pod, or removing/investigating the taint on the nodes?

## Short Answer

Read the specific taint key/value/effect named in the event, then determine *why* that taint exists — a deliberate workload-isolation taint (like `dedicated: gpu`) usually means the pod genuinely doesn't belong on those nodes and needs to be scheduled elsewhere or explicitly opted in via a toleration if it does belong there; an incidental taint (like a leftover cordon from a maintenance window) usually means the taint itself should be removed, not worked around with a toleration.

## Detailed Explanation

A taint's purpose determines the correct fix — tolerations exist to let specific, deliberately-chosen workloads opt into nodes that are otherwise restricted, not as a generic override to make a scheduling error disappear. Reading the taint's origin and intent is what actually tells you which side of the fix is correct.

## Symptoms

- `kubectl get pods` shows the pod stuck in `Pending`.
- `kubectl describe pod` shows a `FailedScheduling` event explicitly listing untolerated taints, with the specific taint key/value/effect named per affected node group.
- The cluster otherwise has nodes with apparent free capacity.

## Possible Causes

- A deliberate, workload-isolation taint (e.g., a GPU node pool tainted `dedicated: gpu` to keep general workloads off expensive specialized hardware) — the pod correctly doesn't tolerate it, because it isn't meant to run there.
- A leftover taint from a maintenance operation (a manual cordon that added a custom taint instead of using `kubectl cordon`'s standard mechanism, or a taint that should have been removed after a completed operation but wasn't).
- The pod's toleration is present but doesn't actually match the taint's key, value, and effect precisely — tolerations require an exact match (or explicit wildcard) on all three fields.

## Investigation Steps

**Read the exact taint from the event, not just that "a taint" is blocking scheduling**: `kubectl describe pod` names the specific key, value, and effect (`NoSchedule`, `PreferNoSchedule`, `NoExecute`) per affected node group — this is the starting point for understanding what's actually being enforced.

**Check the taint's origin and current justification**: `kubectl describe node <node>` shows the node's current taints — cross-referencing against infrastructure-as-code (is this taint declared in the node pool's Terraform/config, meaning it's intentional and version-controlled) versus absent from any declared config (suggesting a manual, possibly-forgotten addition) helps determine whether it's deliberate.

**If the pod's toleration exists but doesn't match, check the exact fields**: `kubectl get pod <name> -o yaml` for `spec.tolerations` — compare `key`, `value`, `effect`, and `operator` (`Equal` requires an exact value match; `Exists` only checks the key) against the node's actual taint precisely, since a near-match (right key, wrong value, or missing `effect`) silently fails to tolerate the taint.

## Resolution

If the taint is deliberate and the pod genuinely belongs on those nodes, add a matching toleration to the pod spec (and typically pair it with a `nodeSelector`/affinity for that same node group, since a toleration alone only permits scheduling there — it doesn't attract the pod there). If the taint is a leftover or mistaken addition, remove it from the node directly (`kubectl taint node <node> <key>-` to remove) rather than adding a toleration, since tolerating an unintentional taint just masks the underlying cleanup that should have happened.

## Key Takeaways

- A taint's *purpose* (deliberate isolation vs. leftover/accidental) determines whether the correct fix is a toleration or removing the taint — tolerations aren't a generic override.
- Tolerations require an exact match on key, value, and effect (or an explicit `Exists` operator) — a near-match silently fails.
- A toleration alone only permits scheduling on tainted nodes; it doesn't attract the pod there — pair with `nodeSelector`/affinity if the pod should actually prefer those nodes.
- Cross-reference a node's taints against declared infrastructure config to distinguish intentional isolation taints from forgotten manual ones.

## Interview Follow-Up Questions

- How would you dedicate a set of nodes exclusively to one team's workloads, while still letting that team's pods run elsewhere too?
- What's the difference between the `NoSchedule`, `PreferNoSchedule`, and `NoExecute` taint effects, and when would you use each?
- How would you audit an entire cluster to find taints that no longer have any matching toleration anywhere, suggesting they might be safe to remove?

## References

- [Kubernetes: Taints and Tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
