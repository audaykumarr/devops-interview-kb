---
id: kubernetes-crds-operator-reconciliation-loop-pattern-001
title: "How does an operator's reconciliation loop actually work, and why is it designed to be idempotent and level-triggered rather than event-driven?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - operators
  - controllers
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Every Kubernetes controller and operator is built around the same core pattern: a reconciliation loop. What does this loop actually do on each iteration, and why is it designed to compare current-vs-desired state every time (level-triggered) rather than just reacting to individual change events (edge-triggered)?

## Short Answer

A reconciliation loop's core action is: read the object's desired state (spec), read the actual current state of whatever real-world resources that object represents, compute the difference, and take action to close that difference — repeated continuously, not just once when a change event fires. This level-triggered design (always re-deriving action from full current state, not from remembering "what changed") is what makes controllers naturally recover from missed events, restarts, and partial failures, since every reconciliation independently re-derives the correct action from scratch rather than depending on a fragile, ordered sequence of events having all been received.

## Detailed Explanation

**The reconciliation function's job: observe current state, compare to desired state, act to close the gap**: given an object (a Deployment, or a custom resource an operator manages), the reconcile function reads `spec` (what should be true), inspects the actual state of the real resources involved (are the right number of pods running, does the external resource exist and match), and issues whatever create/update/delete actions are needed to make actual state match desired state — this same function runs every time reconciliation is triggered, not just on the specific change that triggered it.

**Level-triggered means reconciliation looks at the whole current state every time, not just "what changed"**: an edge-triggered design would react to a specific delta ("a pod was just deleted, so create one") — a level-triggered design instead asks "given everything I can currently observe, is the world in the state it should be?" every single time, regardless of what specifically triggered this reconciliation. This distinction matters enormously for reliability.

**This design tolerates missed or dropped events gracefully, which an edge-triggered design cannot**: if a controller restarts and misses several events while it was down, a level-triggered reconciler doesn't need to have seen every individual event — the next reconciliation simply observes current state (which already reflects everything that happened while it was down) and acts correctly, with no need to replay or recover a missed event log; an edge-triggered design would need exactly that kind of event-recovery mechanism to behave correctly after any gap.

**Idempotency is what makes running the same reconciliation repeatedly safe**: because reconciliation runs far more often than "only when something actually needs to change" (a periodic resync, in addition to event-triggered runs, is standard practice specifically as a safety net), the reconcile function needs to be safe to run even when nothing is actually wrong — checking "is the desired replica count already met" before creating a new pod, rather than unconditionally creating one every time reconciliation runs, is what idempotency means in this context, and it's what prevents a periodic resync from itself becoming a source of bugs or duplicate resources.

**Reconciliation is triggered by both real change events and a periodic resync, layering reliability**: watch-based event triggers give fast reaction to genuine changes; a periodic full resync (even when nothing appears to have changed) catches any drift or missed-event scenario that the event-driven path alone might have missed — this two-layer triggering is a deliberate reliability pattern, not redundancy for its own sake.

**This pattern generalizes across every controller, built-in or custom**: the Deployment controller, the ReplicaSet controller, and any custom operator's reconciler all follow this exact same shape — observe, compare, act, repeated continuously — which is exactly why understanding this one pattern deeply transfers directly to reasoning about the behavior of any Kubernetes controller, not just a specific one.

## Key Takeaways

- A reconciliation loop reads desired state, observes actual state, and acts to close the gap — repeated continuously, not just once per triggering event.
- Level-triggered design (re-deriving action from full current state every time) tolerates missed events and restarts gracefully, unlike an edge-triggered design that would need to track and replay individual deltas.
- Idempotency is essential because reconciliation runs far more often than strictly necessary (periodic resyncs plus event triggers) — the reconcile function must be safe to run repeatedly even when nothing needs to change.
- This exact pattern underlies every Kubernetes controller, built-in and custom — understanding it transfers directly to reasoning about any controller's behavior.

## Interview Follow-Up Questions

- How would you design a reconcile function to be genuinely idempotent for an operator that provisions an external cloud resource, where "create" isn't naturally a no-op if already created?
- What's the risk of a reconcile function that takes a long time to complete, given the controller is expected to process many objects' reconciliation continuously?
- How would you test a custom operator's reconciliation logic in isolation, without needing a full live cluster for every test run?

## References

- [Kubernetes: Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubebuilder: Controllers](https://book.kubebuilder.io/cronjob-tutorial/controller-overview.html)
