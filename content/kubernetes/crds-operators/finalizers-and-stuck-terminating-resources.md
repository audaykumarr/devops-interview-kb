---
id: kubernetes-crds-finalizers-stuck-terminating-resources-001
title: "A custom resource is stuck in Terminating status indefinitely after being deleted — what's a finalizer, and how does it cause this?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
  - conceptual
tags:
  - kubernetes
  - finalizers
  - operators
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

`kubectl delete` on a custom resource appears to hang — the object stays in the cluster indefinitely with `deletionTimestamp` set, never actually disappearing. Its underlying operator seems otherwise healthy. What's causing this, and what does a "finalizer" have to do with it?

## Short Answer

A finalizer is a string in the object's `metadata.finalizers` list that tells the API server "don't actually remove this object until whatever controller registered this finalizer confirms it's done its cleanup" — the object enters `Terminating` (deletion requested, `deletionTimestamp` set) but genuinely isn't removed from etcd until every finalizer is cleared. This gets stuck indefinitely when the controller responsible for clearing a specific finalizer isn't running, isn't seeing the deletion event, or is erroring during its cleanup logic and never actually removes the finalizer.

## Detailed Explanation

Finalizers exist specifically to let a controller perform external cleanup (deleting a cloud resource the custom resource provisioned, releasing an external lock) before the Kubernetes object itself disappears — this is a deliberate, useful mechanism, but it means the object's actual deletion is entirely dependent on that external cleanup logic succeeding and explicitly acknowledging completion.

## Symptoms

- `kubectl get <resource> <name>` shows the object still present, with `Status: Terminating` (or `deletionTimestamp` set in the raw object).
- `kubectl delete` on the object appears to hang or return without the object actually disappearing.
- The condition persists indefinitely — it doesn't resolve on its own after waiting.

## Possible Causes

- The operator/controller responsible for that finalizer isn't running at all (crashed, scaled to zero, or was uninstalled without properly cleaning up finalizers on existing resources first).
- The controller is running but its cleanup logic (reconciling the deletion, doing whatever external cleanup, then removing the finalizer) is erroring out on every attempt — a permissions issue reaching an external resource, a bug specific to this object's state.
- The finalizer string itself is stale — left over from a controller that used to manage this resource but has since been replaced or removed, with nothing left in the cluster that knows to clear that specific finalizer.

## Investigation Steps

**Inspect the object's actual finalizers list directly**: `kubectl get <resource> <name> -o jsonpath='{.metadata.finalizers}'` shows exactly which finalizer string(s) are blocking deletion — this is the concrete starting point, since the finalizer's name usually indicates which controller/operator registered it (often namespaced like `mycompany.io/cleanup-finalizer`).

**Check whether the responsible controller is actually running**: based on the finalizer's name/domain prefix, identify which operator should be clearing it, and confirm that operator's pods are actually running and healthy (`kubectl get pods -n <operator-namespace>`) — if the operator was uninstalled or scaled down without first cleaning up existing resources' finalizers, this is a direct, common cause.

**If the controller is running, check its logs for errors specifically related to this object's deletion/cleanup**: the controller's reconcile logic for a deletion event (checking `deletionTimestamp` is set, then running cleanup, then removing the finalizer) may be erroring — logs filtered to this specific object's name during the time since deletion was requested often reveal the specific cleanup failure directly.

**Determine whether the finalizer is genuinely stale (no controller will ever clear it)**: if the responsible operator was deliberately removed from the cluster and isn't coming back, the finalizer will never be cleared through the normal mechanism — this is a different situation than a controller that's temporarily broken and will eventually succeed once fixed.

## Resolution

If the controller is broken but recoverable, fix the underlying issue (restore the operator, fix the permissions/bug causing its cleanup logic to fail) and let it clear the finalizer through its normal reconciliation — this is the correct, clean resolution, since it ensures whatever real cleanup the finalizer exists to guarantee actually happens. If the finalizer is genuinely stale (the responsible controller is gone for good, and any external cleanup it would have performed either already happened or is being handled another way), manually removing the finalizer (`kubectl patch <resource> <name> --type=json -p='[{"op": "remove", "path": "/metadata/finalizers"}]'` or via `kubectl edit`) forces the deletion to complete — but this bypasses whatever cleanup the finalizer was meant to guarantee, so it should only be done after confirming that cleanup either already happened or genuinely doesn't matter, not as a routine unblock reflex.

## Key Takeaways

- A finalizer blocks actual object deletion until the responsible controller explicitly clears it, after completing whatever cleanup it's meant to guarantee.
- The finalizer string itself (visible via `metadata.finalizers`) usually indicates which controller/operator is responsible for clearing it.
- The most common cause of a stuck `Terminating` object is the responsible controller not running, or erroring during its cleanup logic — check the controller's health and logs before anything else.
- Manually removing a finalizer force-completes deletion but bypasses whatever real cleanup it existed to guarantee — this should be a deliberate, understood action, not a routine unblock reflex.

## Interview Follow-Up Questions

- How would you design an operator's finalizer-cleanup logic to be idempotent and safe to retry, given it might partially fail and be re-attempted multiple times?
- What would you check to confirm it's actually safe to manually remove a stuck finalizer, versus risking leaving orphaned external resources behind?
- How would you audit a cluster to find every object stuck in `Terminating` due to a finalizer, as part of a broader health check?

## References

- [Kubernetes: Using Finalizers to Control Deletion](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
