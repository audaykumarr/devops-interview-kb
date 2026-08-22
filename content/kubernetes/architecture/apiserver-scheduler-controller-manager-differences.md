---
id: kubernetes-architecture-apiserver-scheduler-controller-manager-001
title: "What's the difference between kube-apiserver, kube-scheduler, and kube-controller-manager, and what breaks if each is unavailable?"
category: kubernetes
subcategory: architecture
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - control-plane
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

The Kubernetes control plane consists of several distinct components, most centrally kube-apiserver, kube-scheduler, and kube-controller-manager. What does each one actually do, and what specifically stops working — versus keeps working — if just one of them individually became unavailable while the other two stayed healthy?

## Short Answer

kube-apiserver is the single front door for all cluster state — every read and write, from every other component and every client, goes through it, and it's the only one of the three that talks to etcd directly. kube-scheduler's only job is deciding which node a newly-created, not-yet-scheduled pod should run on. kube-controller-manager runs the many reconciliation control loops (Deployment, ReplicaSet, Node, and others) that continuously drive actual cluster state toward each object's declared desired state. Losing the API server breaks essentially everything; losing just the scheduler means new pods pile up unscheduled while everything already running or already scheduled keeps working; losing just the controller-manager means existing objects stop being reconciled (a failed pod won't be replaced, for instance) while already-correct state stays as it is.

## Detailed Explanation

**kube-apiserver: the sole gateway to cluster state**: every other control-plane component, every kubelet, and every `kubectl` command interacts with cluster state exclusively through the API server — it validates, authenticates, authorizes, and persists (via etcd) every request. Because literally everything else depends on it, its unavailability is the most severe of the three: no component can read current state or submit changes, so the effects cascade to essentially every other piece of cluster functionality.

**kube-scheduler: decides node placement for unscheduled pods, and nothing else**: the scheduler watches for pods with no assigned node, runs them through its filtering and scoring logic, and writes the chosen node's name back to the pod object (via the API server) — this is its entire job. It doesn't create pods, doesn't manage their lifecycle, and doesn't affect already-scheduled or already-running pods in any way.

**If only the scheduler is unavailable**: new pods (from new Deployments, scale-up events, replacement pods after a failure) simply accumulate in `Pending` state, since nothing is assigning them to nodes — but every pod that was already scheduled and running continues running completely unaffected, since the scheduler has no ongoing role in a pod's life after the initial placement decision.

**kube-controller-manager: runs the reconciliation loops that keep actual state converging on desired state**: this single binary actually runs many distinct controllers (Deployment controller, ReplicaSet controller, Node controller, and many more) — each one watches a specific type of object and continuously acts to reconcile discrepancies between spec (desired) and status (actual), which is the mechanism behind almost every "Kubernetes automatically fixes this" behavior (a crashed pod gets replaced, a scaled-up Deployment gets its ReplicaSet updated, a node that stops reporting gets its pods marked for eviction after a timeout).

**If only the controller-manager is unavailable**: existing correct state stays correct (nothing actively breaks what's already converged), but nothing gets *newly* reconciled — a pod that crashes won't be replaced by its ReplicaSet controller, a Deployment's rollout won't progress, a Node that goes unresponsive won't have its pods evicted and rescheduled after the normal timeout — the cluster effectively freezes in terms of self-healing and drift correction, even though the API server and scheduler (if still healthy) continue functioning for whatever doesn't depend on active reconciliation.

**These three failure modes are genuinely distinguishable in practice, which matters for triage**: a fleet of pods stuck `Pending` with no scheduling events at all points at the scheduler; a crashed pod that never gets replaced (with the ReplicaSet's replica count visibly not matching reality) points at the controller-manager; anything and everything failing simultaneously, including `kubectl` itself, points at the API server — recognizing which pattern you're observing directly narrows where to look first.

## Key Takeaways

- kube-apiserver is the sole gateway to all cluster state — its unavailability cascades to essentially everything else, since every other component depends on it.
- kube-scheduler's only role is assigning nodes to newly-created, unscheduled pods — its unavailability leaves new pods `Pending` while already-running pods are entirely unaffected.
- kube-controller-manager runs the reconciliation loops behind Kubernetes' self-healing behavior — its unavailability freezes drift correction (crashed pods don't get replaced, rollouts don't progress) without breaking already-converged state.
- The specific failure pattern observed (fleet-wide `Pending`, un-replaced crashed pods, or total API unavailability) directly indicates which of the three components is the actual problem.

## Interview Follow-Up Questions

- What's etcd's actual role in a cluster, and what happens if it becomes unavailable, as a fourth component in this same comparison?
- How does leader election work for kube-scheduler and kube-controller-manager in a highly-available control plane with multiple replicas of each?
- How would you monitor each of these three components independently, to distinguish which one is degraded during a partial control-plane incident?

## References

- [Kubernetes: Kubernetes Components](https://kubernetes.io/docs/concepts/overview/components/)
