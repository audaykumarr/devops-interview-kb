---
id: kubernetes-networking-migrating-cni-plugin-without-rebuild-001
title: "How would you migrate a cluster from one CNI plugin to another without a full cluster rebuild — what's actually risky about it?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: expert
question_type:
  - scenario
  - architecture
tags:
  - kubernetes
  - cni
  - migration
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A cluster needs to move from one CNI plugin to another (perhaps to gain NetworkPolicy enforcement, better performance, or a feature the current plugin lacks) — but rebuilding the entire cluster from scratch isn't acceptable given the workloads already running on it. How would you approach an in-place migration, and what makes this genuinely risky compared to most other cluster changes?

## Short Answer

CNI plugins generally aren't designed to be hot-swapped on a live cluster — every running pod's network configuration was set up by the old plugin, and most CNI plugins use fundamentally incompatible underlying mechanisms (different overlay encapsulation, different IP allocation schemes), so a true in-place migration typically requires a node-by-node rolling replacement: draining nodes, reconfiguring or reprovisioning them with the new CNI plugin, and letting pods reschedule onto the migrated nodes, rather than a single cluster-wide cutover.

## Detailed Explanation

A CNI plugin is foundational infrastructure every running pod already depends on, which is exactly why it can't be swapped the way a typical application component can — the migration strategy has to work around that constraint rather than through it, accepting a longer, staged process in exchange for avoiding a full-cluster outage.

## Requirements

- Existing workloads must continue running (with acceptable, planned disruption per node, not a full cluster outage) throughout the migration.
- The cluster must not end up in a inconsistent state with two incompatible CNI plugins both partially active in a way that breaks pod-to-pod connectivity.
- The migration must be reversible or have a clear rollback path if something goes wrong partway through.

## Architecture

**Node-by-node rolling migration is the standard approach, since CNI plugins can't typically coexist on the same node**: rather than attempting a cluster-wide cutover, nodes are migrated in batches — drain a node (evicting its pods, which reschedule onto still-on-old-CNI nodes), remove the old CNI plugin's configuration from that node, install and configure the new CNI plugin, uncordon the node, and let new pods schedule onto it under the new plugin. This is inherently slower than a cluster-wide change but keeps the cluster functional throughout.

**The genuinely risky part: cross-CNI pod-to-pod connectivity during the transition period**: for the duration of the migration, the cluster has pods running under two different CNI plugins simultaneously (some nodes on the old plugin, some on the new) — if the two plugins use incompatible networking mechanisms (different overlay protocols, non-overlapping IP ranges that aren't properly routed between them), pods on old-CNI nodes may not be able to reach pods on new-CNI nodes at all during this window, which is a serious, potentially outage-causing risk if not planned for carefully.

**IP address range planning needs to account for both plugins simultaneously during the transition**: if the new CNI plugin uses a different pod CIDR allocation scheme than the old one, both ranges need to coexist and be mutually routable for the migration's duration — this sometimes requires careful IP address planning to avoid range conflicts, and may require both plugins to be configured to know about and route to each other's ranges, which not every plugin pair supports cleanly.

**NetworkPolicy behavior can change mid-migration if the plugins differ in enforcement capability**: if migrating specifically to gain NetworkPolicy enforcement the old plugin didn't have, policies that previously existed but did nothing (per an earlier discussion of non-enforcing CNI plugins) will suddenly start being enforced on migrated nodes but not yet on old-CNI nodes — this needs to be anticipated, since traffic that was previously silently allowed everywhere could start being blocked inconsistently across the cluster during the transition, in ways that are hard to predict without care.

**Test the full migration procedure in a non-production environment first, including the mixed-CNI transition state specifically**: because the riskiest part of this migration is the temporary mixed state (not the before or after states, which are each individually well-understood), a staging environment test needs to specifically exercise cross-node, cross-CNI-plugin connectivity during a simulated migration, not just validate the final fully-migrated state.

## Trade-offs

A node-by-node rolling migration is slower and operationally heavier than a hypothetical instant cutover, but is the only approach that avoids a full-cluster outage — the alternative (draining the entire cluster, reconfiguring, and restarting everything at once) is faster in wall-clock time but carries a much higher blast radius if anything goes wrong, since there's no partially-working intermediate state to fall back to. For clusters where even a brief full outage is unacceptable, the rolling approach's added complexity and duration is the necessary cost.

## Key Takeaways

- CNI plugins generally can't coexist on the same node, making a node-by-node rolling migration the standard safe approach rather than a cluster-wide cutover.
- The genuinely risky window is the transition period where some nodes run the old plugin and some run the new one — cross-CNI pod connectivity during this window is not guaranteed and needs explicit planning.
- Both plugins' IP address ranges need to coexist and remain mutually routable throughout the migration.
- Test the mixed-CNI transition state specifically in a non-production environment, since it's the riskiest part of the migration, not just the well-understood before/after states.

## Interview Follow-Up Questions

- How would you design a rollback plan if the migration needs to be aborted partway through, with some nodes already migrated?
- How would you sequence which nodes to migrate first, to minimize risk to the most critical workloads during the mixed-CNI transition window?
- How would you validate, with confidence, that the migration is fully complete and no node is still silently running the old CNI plugin's configuration?

## References

- [Kubernetes: Network Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
- [Kubernetes: Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
