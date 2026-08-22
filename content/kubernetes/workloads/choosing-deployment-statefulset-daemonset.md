---
id: kubernetes-workloads-choosing-deployment-statefulset-daemonset-001
title: "How would you decide between a Deployment, a StatefulSet, and a DaemonSet for three different real services (a stateless API, a database, a node agent)?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - architecture
  - comparison
tags:
  - kubernetes
  - deployments
  - statefulset
  - daemonset
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You're deploying three different services onto a cluster: a stateless REST API, a clustered database, and a node-level metrics-collection agent. Walk through how you'd decide which controller — Deployment, StatefulSet, or DaemonSet — fits each one, and why the other two wouldn't work as well.

## Short Answer

The deciding question for each workload is: does it need per-instance identity/storage, and does it need to run on every node specifically (not just some number of replicas)? The stateless API needs neither, so it's a Deployment; the database needs stable per-instance identity and storage, so it's a StatefulSet; the metrics agent needs to run exactly once per node regardless of cluster size, so it's a DaemonSet — none of the three controllers are interchangeable once you actually examine what property each workload depends on.

## Detailed Explanation

Each Kubernetes workload controller encodes a different assumption about identity and placement: Deployments assume pods are fungible, StatefulSets assume pods have individual identity worth preserving, and DaemonSets assume the unit of scaling is nodes, not an arbitrary replica count. Matching the controller to the workload means identifying which of those assumptions the workload actually depends on.

## Requirements

- The stateless API needs horizontal scalability and fast, unordered replacement of any instance without special handling.
- The database needs stable network identity, stable per-instance storage, and ordered, careful rollout behavior.
- The metrics agent needs exactly one instance per node, automatically adjusting as nodes are added or removed from the cluster.

## Architecture

**Stateless API → Deployment**: no instance has individual identity — any replica can be replaced by any other with zero functional difference, and requests are load-balanced across whichever replicas happen to be healthy. A Deployment's ReplicaSet-based scaling and unordered, parallelizable rolling updates are exactly the right fit, and there's no reason to pay for the ordering/identity guarantees a StatefulSet provides, since nothing in this workload needs them.

**Clustered database → StatefulSet**: each database instance typically has a distinct role (primary, replica) and its own persistent data that must follow it specifically, not just any instance — a StatefulSet's stable network identity (`db-0`, `db-1`, `db-2`, each independently addressable) and per-pod PersistentVolumeClaims (via `volumeClaimTemplates`) give each instance a durable, consistent identity across restarts and rescheduling, which a Deployment fundamentally can't provide (Deployment pods have no stable individual identity or dedicated per-replica storage).

**Node-level metrics agent → DaemonSet**: the requirement is "exactly one instance per node," which is qualitatively different from "N replicas" — a Deployment scaled to match the node count would need manual/external logic to track cluster size and wouldn't automatically place exactly one pod per node (nor guarantee it lands specifically on new nodes as they join). A DaemonSet's entire purpose is this exact guarantee: the controller automatically schedules one pod per eligible node and handles new/removed nodes without any external tracking.

**Why each of the other two controllers would genuinely fail for the wrong workload**: using a StatefulSet for the stateless API would add unnecessary ordering constraints to rollouts (slower, one-at-a-time updates) for a workload that gains nothing from them. Using a Deployment for the database would mean losing stable per-instance identity — a replaced pod could get a new random name and, depending on storage setup, potentially not reliably reattach to the correct instance's data. Using a Deployment for the node agent would require constant manual reconciliation against cluster size, and using a StatefulSet for it doesn't even address the "one per node" requirement at all — neither substitutes for what a DaemonSet actually guarantees.

## Trade-offs

None of these are the "safer default to fall back on" — picking the more complex controller (StatefulSet) for a workload that doesn't need its guarantees adds real operational cost (slower, ordered rollouts) for no benefit; picking the simpler one (Deployment) for a workload that does need per-instance identity risks a genuine correctness problem, not just inefficiency. The right choice always follows from examining the workload's actual dependency on identity, storage, and node-coverage — not from a general preference for simplicity or safety.

## Key Takeaways

- The deciding factors are per-instance identity/storage needs and whether the workload must run exactly once per node — not workload complexity or perceived importance.
- Deployment: no per-instance identity needed, any replica is interchangeable.
- StatefulSet: needs stable per-instance network identity and/or dedicated storage, and ordered rollout behavior.
- DaemonSet: needs exactly one instance per node, automatically tracking cluster size — a qualitatively different requirement from "N replicas."

## Interview Follow-Up Questions

- How would you handle a workload that needs StatefulSet-like per-instance identity but also needs DaemonSet-like one-per-node placement?
- What's the difference between a Deployment and a StatefulSet in terms of what happens to their pods' names and network identity across a restart?
- How would you migrate an existing Deployment-based stateful workload (that was set up incorrectly from the start) to a StatefulSet without data loss?

## References

- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
