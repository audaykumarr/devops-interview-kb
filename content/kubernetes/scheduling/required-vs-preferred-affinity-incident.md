---
id: kubernetes-scheduling-required-vs-preferred-affinity-incident-001
title: "What's the difference between requiredDuringSchedulingIgnoredDuringExecution and preferredDuringSchedulingIgnoredDuringExecution, and what incident does confusing them cause?"
category: kubernetes
subcategory: scheduling
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - comparison
tags:
  - kubernetes
  - affinity
  - scheduling
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Both node and pod affinity rules can be declared with `requiredDuringSchedulingIgnoredDuringExecution` or `preferredDuringSchedulingIgnoredDuringExecution`. The names are long and easy to gloss over. What's the actual behavioral difference, and what real incident results from assuming one when the config actually specifies the other?

## Short Answer

`required` is a hard constraint — the scheduler will never place the pod in violation of it, even if that means leaving the pod `Pending` indefinitely. `preferred` is a soft hint — the scheduler tries to honor it but will violate it rather than leave a pod unschedulable, silently accepting a placement that doesn't fully satisfy the rule. Assuming `preferred` behaves like `required` leads to false confidence in a guarantee that was never actually enforced; assuming `required` behaves like `preferred` leads to unexpected `Pending` pods during a capacity crunch that a team wasn't prepared for.

## Detailed Explanation

**`required` — a hard gate evaluated during filtering**: a pod with a `required` affinity/anti-affinity rule that can't be satisfied by any node simply isn't scheduled — it stays `Pending`, and (depending on scheduler configuration) may trigger preemption attempts, but will never be placed in a way that violates the rule. This is what actually provides a guarantee.

**`preferred` — a soft signal evaluated during scoring, with a weight**: a `preferred` rule contributes to a node's score (higher score for nodes satisfying it, using the specified `weight`) but doesn't eliminate non-satisfying nodes from consideration at all — if every legally-eligible node fails to satisfy the preference, the scheduler still picks the best-scoring one among them and schedules the pod there, silently not satisfying the preference.

**The incident from assuming `preferred` acts like `required`**: a team configures pod anti-affinity intending "our replicas must never co-locate, for availability" but uses `preferred` (perhaps from a copied example, or because it seemed like the safer/less-restrictive choice at the time) — during a later capacity crunch, the scheduler co-locates two replicas on the same node to avoid leaving one `Pending`, silently violating the team's actual availability intent with no error or warning anywhere. The team only discovers this when that one node fails and takes down more replicas than expected.

**The incident from assuming `required` acts like `preferred`**: the reverse mistake — a team uses `required` for what was meant as a soft preference (e.g., "prefer SSD nodes"), and during a period where no SSD-labeled node has spare capacity, pods that could have run perfectly well on non-SSD nodes stay `Pending` instead, causing an availability problem for a preference that was never meant to be a hard blocker.

**Reading the exact field name in the manifest is the only reliable way to know which is configured**: because both fields share a very similar name and structure, differing only in the `required`/`preferred` prefix, a quick visual scan of a manifest can easily miss which one is actually in effect — `kubectl get <resource> -o yaml` and reading the exact key name is the reliable way to confirm, rather than assuming based on what "feels like" it should be configured for a given workload.

## Key Takeaways

- `required` is a hard constraint enforced during the scheduler's filtering phase — the pod is never placed in violation, potentially staying `Pending` instead.
- `preferred` is a soft signal used during scoring, with a configurable weight — it can be silently violated if no eligible node satisfies it, with no error raised.
- Assuming `preferred` provides a guarantee it doesn't is a common, dangerous mistake specifically for availability-critical anti-affinity rules.
- Assuming `required` is flexible when it's actually a hard gate causes unexpected `Pending` pods during capacity pressure for what was meant as just a preference.

## Interview Follow-Up Questions

- How would you monitor for a `preferred` anti-affinity rule silently being violated in production, given it produces no error?
- How would you decide which of the two to use for a new affinity rule, as a general rule of thumb?
- What's the `weight` field's role for `preferred` rules when multiple soft preferences are configured simultaneously, and how are they combined?

## References

- [Kubernetes: Affinity and Anti-Affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity)
