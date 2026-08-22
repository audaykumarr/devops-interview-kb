---
id: kubernetes-scheduling-topology-spread-constraints-zones-001
title: "How would you design pod topology spread constraints to keep a Deployment's replicas evenly distributed across availability zones?"
category: kubernetes
subcategory: scheduling
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - architecture
  - practical
tags:
  - kubernetes
  - scheduling
  - topology-spread
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Deployment with several replicas needs to survive a single availability zone failure — which requires its pods to actually be spread across zones, not concentrated in one. Anti-affinity rules can express "not on the same node," but you specifically need balanced *zone-level* distribution. How would you design this using topology spread constraints?

## Short Answer

Use `topologySpreadConstraints` with `topologyKey: topology.kubernetes.io/zone`, a `maxSkew` value defining how uneven the distribution is allowed to get, and `whenUnsatisfiable` set to `DoNotSchedule` (hard requirement) or `ScheduleAnyway` (soft preference) depending on whether zone balance is a hard availability requirement or a best-effort optimization — this is a more direct and purpose-built mechanism for balanced distribution than anti-affinity, which only expresses "not co-located," not "evenly spread."

## Detailed Explanation

Balanced distribution across a topology domain is a distinct scheduling problem from simple non-co-location, and Kubernetes provides a purpose-built primitive for it rather than requiring it to be approximated through anti-affinity rules.

## Requirements

- Replicas must be distributed across availability zones such that a single zone's failure doesn't take down more than an acceptable fraction of the Deployment.
- The distribution should be genuinely balanced (not just "not all on one node"), proportional to how many zones and nodes are actually available.
- The constraint needs to interact sensibly with the cluster's actual zone topology and available capacity per zone.

## Architecture

**`topologyKey` defines what "location" means for the spread calculation**: setting it to `topology.kubernetes.io/zone` (the standard well-known label most cloud providers populate on nodes) means the scheduler balances pod count *per zone*, which is exactly the granularity needed here — as opposed to `kubernetes.io/hostname` (per-node balancing, which is what anti-affinity typically targets) or a custom topology key for other groupings.

**`maxSkew` controls how much imbalance is tolerated**: `maxSkew: 1` means the difference between the zone with the most matching pods and the zone with the fewest can be at most 1 — for 3 replicas across 3 zones, this forces exactly 1 per zone; for a replica count that doesn't divide evenly across zones, `maxSkew` needs to be set with that arithmetic in mind, since an overly strict skew value for an uneven replica-to-zone ratio can make some pods unschedulable.

**`whenUnsatisfiable` determines the failure mode when the constraint can't be perfectly met**: `DoNotSchedule` treats the constraint as a hard requirement — pods that would violate it stay `Pending` rather than being scheduled unevenly, which is the correct choice when zone balance is a genuine availability requirement. `ScheduleAnyway` treats it as a soft preference — the scheduler tries to balance but will still schedule pods even if that means violating the skew, which is more appropriate when some imbalance is acceptable rather than leaving pods unschedulable.

**`labelSelector` scopes the constraint to the right set of pods**: matching the Deployment's own pod template labels ensures the spread calculation only considers this Deployment's own replicas when computing balance — without a correctly scoped selector, the constraint could inadvertently balance against unrelated pods sharing an incidental label, producing a distribution that looks wrong relative to what was intended.

**This is a more direct mechanism than anti-affinity for genuinely balanced spread**: anti-affinity rules express relationships between pods ("don't put pod A near pod B"), which can be pushed toward achieving spread but wasn't designed specifically for balance — topology spread constraints were purpose-built for exactly this "distribute N replicas evenly across M topology domains" problem, and are generally the more direct, maintainable choice when balance (not just non-co-location) is the actual goal.

## Trade-offs

A hard (`DoNotSchedule`) constraint provides a genuine guarantee but can leave pods `Pending` if the cluster's actual zone capacity doesn't support the requested balance at a given moment (e.g., one zone temporarily has less spare capacity) — this is the correct trade for an availability-critical workload (visible `Pending` pods are better than silent imbalance), but needs monitoring to catch and act on. A soft (`ScheduleAnyway`) constraint avoids ever blocking scheduling, at the cost of not actually guaranteeing the availability property the constraint was meant to provide.

## Key Takeaways

- `topologyKey: topology.kubernetes.io/zone` targets zone-level balance specifically, distinct from node-level anti-affinity.
- `maxSkew` needs to account for the actual replica-count-to-zone-count ratio — an overly strict value for an uneven ratio can make pods unschedulable unnecessarily.
- `whenUnsatisfiable: DoNotSchedule` provides a genuine hard guarantee at the cost of potential `Pending` pods; `ScheduleAnyway` avoids blocking but doesn't guarantee the balance.
- Topology spread constraints are purpose-built for balanced distribution, making them more direct than anti-affinity when balance (not just non-co-location) is the actual requirement.

## Interview Follow-Up Questions

- How would you combine topology spread constraints with pod anti-affinity, if you need both zone-level balance and node-level separation within each zone?
- What would you monitor to catch a Deployment silently running unbalanced across zones because `whenUnsatisfiable: ScheduleAnyway` allowed it?
- How would this design change for a cluster with an uneven number of nodes per zone, where perfect balance might not even be structurally achievable?

## References

- [Kubernetes: Pod Topology Spread Constraints](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
