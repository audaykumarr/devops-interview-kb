---
id: kubernetes-scheduling-how-scheduler-filters-and-scores-001
title: "How does the Kubernetes scheduler actually decide which node to place a pod on — walk through filtering and scoring?"
category: kubernetes
subcategory: scheduling
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - scheduling
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

When a pod needs a node, the scheduler doesn't just pick the first available one. Walk through what actually happens between a pod being created and a specific node being chosen.

## Short Answer

The scheduler runs each unscheduled pod through two phases: filtering, which eliminates every node that can't legally run the pod at all (insufficient resources, taints without matching tolerations, failed affinity rules), and scoring, which ranks the surviving, legally-eligible nodes against each other using a set of weighted criteria (resource balance, affinity preferences, spreading), then selects the highest-scoring node.

## Detailed Explanation

**Filtering (predicates) produces a set of nodes that are legally eligible, with no ranking yet**: this phase runs a series of hard checks — does the node have enough allocatable CPU/memory to satisfy the pod's requests, does the pod tolerate all of the node's taints, does the node satisfy any required node/pod affinity rules, is the node actually `Ready` and not cordoned — any node failing even one check is eliminated entirely from consideration. The output is a (possibly empty) set of nodes that *could* run the pod, without any notion yet of which is *best*.

**If filtering eliminates every node, the pod stays `Pending` and preemption may be considered**: with zero eligible nodes, the scheduler can optionally attempt preemption (evicting lower-priority pods to free up resources on an otherwise-eligible node) before giving up and leaving the pod `Pending` — this is why `Pending` pods don't automatically fail loudly; they're waiting for either eligibility to change or preemption to succeed.

**Scoring (priorities) ranks the surviving nodes against each other**: for the set of legally-eligible nodes, the scheduler runs a series of scoring plugins — each assigns a numeric score to each node based on criteria like how balanced resource usage would be after placing the pod there, how well the node satisfies *soft* (preferred) affinity rules, and how it affects topology spread — these scores are combined (with configurable weights) into a total per node.

**The highest-scoring node is selected, with ties broken effectively at random among equally-scored candidates**: this is why identical pods scheduled at slightly different times, or under slightly different cluster states, can land on different nodes even when the outcome looks similar — the scoring phase optimizes for a good placement, not a single deterministic "correct" answer.

**This two-phase design is what makes filtering and scoring conceptually separable when debugging**: a `Pending` pod with a `FailedScheduling` event is a filtering-phase problem (nothing passed the hard checks) — there's no scoring involved at all in that failure mode, since scoring only runs on nodes that already passed filtering. Understanding this separation focuses troubleshooting on the right phase: a pod that's `Pending` needs filtering-phase investigation (taints, resources, required affinity), while a pod that scheduled but landed somewhere "unexpected" needs scoring-phase investigation (preferred affinity weights, topology spread, resource-balance scoring).

**Custom scheduling behavior is possible at both phases**: extension points (scheduler plugins, or a completely custom scheduler) can add custom filtering predicates or custom scoring criteria beyond Kubernetes' built-in set, for organizations with scheduling needs the defaults don't cover — this is advanced and uncommon, but explains how tools with custom placement logic (some batch/ML scheduling systems) integrate with or replace parts of the default scheduler.

## Key Takeaways

- Filtering eliminates nodes that can't legally run the pod at all (hard checks); scoring ranks the surviving eligible nodes against each other (soft, weighted criteria).
- A `Pending` pod with a scheduling failure event is exclusively a filtering-phase problem — scoring never runs on nodes that failed filtering.
- A pod that scheduled but landed somewhere unexpected is a scoring-phase question — investigate preferred affinity, topology spread, and resource-balance weighting.
- Ties among equally-scored nodes are broken effectively at random, which is why identical pods can land on different nodes across separate scheduling events.

## Interview Follow-Up Questions

- How would you debug a case where a pod scheduled successfully, but not onto the node you expected, given all candidate nodes passed filtering?
- What's the difference between the default scheduler's behavior and running a completely custom scheduler for a specialized workload type?
- How would you tune scoring plugin weights to prioritize resource balance over topology spread for a specific class of workload?

## References

- [Kubernetes: Scheduler](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/)
- [Kubernetes: Scheduling Framework](https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/)
