---
id: kubernetes-scheduling-anti-affinity-not-preventing-colocation-001
title: "Two pods that should never co-locate keep landing on the same node — what's wrong with the anti-affinity rule?"
category: kubernetes
subcategory: scheduling
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - affinity
  - scheduling
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Deployment has a `podAntiAffinity` rule meant to guarantee its replicas never land on the same node (for availability — surviving a single node failure). Despite the rule being present, two replicas end up scheduled on the same node anyway. What's wrong with the rule, and how do you fix it?

## Short Answer

The almost-certain cause is that the rule uses `preferredDuringSchedulingIgnoredDuringExecution` (a soft preference the scheduler tries to honor but can override under pressure) instead of `requiredDuringSchedulingIgnoredDuringExecution` (a hard constraint the scheduler will never violate) — "preferred" is often chosen by default or copy-pasted from an example without realizing it's not actually a guarantee, and under node-capacity pressure the scheduler will co-locate pods rather than leave one `Pending`.

## Detailed Explanation

Kubernetes affinity rules come in two enforcement strengths that are easy to conflate, and the difference between them is exactly the difference between "this is a hard guarantee" and "this is a best-effort hint the scheduler can and will override when it has to."

## Symptoms

- A `podAntiAffinity` rule exists on the Deployment, intended to spread replicas across different nodes.
- `kubectl get pods -o wide` shows two or more replicas actually running on the same node.
- No scheduling error or warning is visible — the pods scheduled successfully, just not the way intended.

## Possible Causes

- The rule uses `preferredDuringSchedulingIgnoredDuringExecution` rather than `requiredDuringSchedulingIgnoredDuringExecution` — "preferred" allows the scheduler to violate it under capacity pressure rather than leave a pod unschedulable.
- The `topologyKey` used doesn't actually mean what was intended (e.g., using a zone-level topology key when node-level separation was the actual goal).
- The `labelSelector` in the anti-affinity rule doesn't actually match the intended pods (a label mismatch, or matching too broad or too narrow a set).

## Investigation Steps

**Check which affinity type is actually configured**: `kubectl get deployment <name> -o yaml` — look specifically at whether the rule sits under `preferredDuringSchedulingIgnoredDuringExecution` or `requiredDuringSchedulingIgnoredDuringExecution` in `spec.template.spec.affinity.podAntiAffinity` — this single check resolves the most common cause immediately.

**Check the `topologyKey` value against what was actually intended**: a rule using `topologyKey: topology.kubernetes.io/zone` spreads pods across zones but says nothing about individual nodes within a zone — two pods in the same zone but on different nodes would satisfy a zone-level rule while still not achieving node-level separation, if node-level was actually the goal. Confirm `topologyKey: kubernetes.io/hostname` is used if the intent is genuinely per-node separation.

**Verify the `labelSelector` actually matches the intended pods**: `kubectl get pods --show-labels` compared against the anti-affinity rule's `labelSelector.matchLabels`/`matchExpressions` confirms the rule is actually being evaluated against the pods it's meant to apply to — a mismatched selector means the rule silently applies to the wrong (or no) pods, evaluating successfully but accomplishing nothing.

**Check cluster capacity at the time of scheduling, if `required` was already in use**: if the rule genuinely is `required` and co-location still happened, check whether there simply wasn't enough spare capacity elsewhere at the time — a `required` anti-affinity rule that can't be satisfied results in a `Pending` pod, not a violated constraint, so if pods are actually co-located with a `required` rule in place, that points to one of the other causes (selector or topology key), not a capacity issue.

## Resolution

Switch the rule to `requiredDuringSchedulingIgnoredDuringExecution` if a hard guarantee is genuinely needed, understanding the trade-off that this can leave a pod `Pending` if the cluster doesn't have enough separately-schedulable capacity at that moment — which is the correct behavior for an availability-critical guarantee (better to be `Pending` and visible than silently co-located). Correct the `topologyKey` or `labelSelector` if either was the actual mismatch. Confirm the fix by watching a fresh rollout and verifying `kubectl get pods -o wide` shows genuine node-level separation.

## Key Takeaways

- `preferredDuringSchedulingIgnoredDuringExecution` is a soft hint the scheduler can override under pressure — it's not a guarantee, despite often looking like one at a glance.
- `requiredDuringSchedulingIgnoredDuringExecution` is the actual hard constraint, at the cost of potentially leaving a pod `Pending` if it can't be satisfied.
- `topologyKey` determines what "same location" actually means (node, zone, region) — a mismatch between the intended and configured topology level produces a rule that's technically satisfied but doesn't achieve the actual goal.
- A mismatched `labelSelector` makes a rule evaluate successfully against the wrong (or no) pods, silently accomplishing nothing.

## Interview Follow-Up Questions

- What's the trade-off of using `required` anti-affinity for an availability-critical workload, given it can leave pods `Pending` during a capacity crunch?
- How would you design pod topology spread constraints to keep a Deployment's replicas evenly distributed across availability zones, as an alternative to anti-affinity for this use case?
- How would you test that an anti-affinity rule actually works as intended, before relying on it for a production availability guarantee?

## References

- [Kubernetes: Affinity and Anti-Affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity)
