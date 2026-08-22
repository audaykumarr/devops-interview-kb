---
id: kubernetes-crds-owner-references-garbage-collection-001
title: "A custom resource is deleted, but the Deployments and Services an operator created for it are left orphaned in the cluster — why doesn't Kubernetes clean them up automatically?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - kubernetes
  - operators
  - garbage-collection
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An operator creates several child resources (a Deployment, a Service, a ConfigMap) for each custom resource instance it manages. When the custom resource is deleted, those child resources are supposed to be cleaned up automatically — but they aren't; they're left behind as orphans. Why doesn't Kubernetes' garbage collection handle this automatically, and what would need to be true for it to work?

## Short Answer

Kubernetes' garbage collector only removes dependent objects that carry a correctly-set `ownerReferences` entry pointing back to the deleted owner — it has no inherent, implicit knowledge that "this operator created this Deployment for that custom resource." If the operator's code never set that field when creating the child resources, the garbage collector has no relationship to act on, and the children are simply left behind as ordinary, unrelated objects.

## Detailed Explanation

Kubernetes' garbage collector cleans up dependent objects automatically based on `ownerReferences` — a field explicitly linking a child object to its owner — this isn't automatic based on "this operator happened to create this object for that custom resource" reasoning; it only works if the owner reference was actually, correctly set on the child object at creation time.

## Symptoms

- Deleting a custom resource instance removes the custom resource itself, but leaves the Deployment/Service/ConfigMap it caused to be created still present in the cluster.
- No error is raised — the orphaned resources just silently continue existing.
- This may only become apparent later, when someone notices unexpected resources with no obvious owner.

## Possible Causes

- The operator's code never set `ownerReferences` on the child resources it creates, so Kubernetes has no recorded relationship between the custom resource and its children at all — from the garbage collector's perspective, they're entirely unrelated objects.
- The `ownerReference` was set but with an incorrect `UID` (owner references match on UID, not just name — a stale or incorrect UID means the reference doesn't actually resolve to the real owner object).
- `blockOwnerDeletion`/cascading deletion settings, or the deletion propagation policy used (`Foreground`, `Background`, `Orphan`) when the custom resource was deleted, affected whether cleanup actually happened as expected.

## Investigation Steps

**Check whether the orphaned resources actually have an `ownerReferences` entry at all**: `kubectl get deployment <name> -o jsonpath='{.metadata.ownerReferences}'` — if this is empty or absent, the operator's code simply never established the relationship Kubernetes' garbage collector depends on, which is the direct explanation.

**If an owner reference exists, verify its `uid` actually matches a real (or the intended) object**: an owner reference with a `uid` that doesn't correspond to any existing object (because the custom resource was recreated with a new UID, for instance, after this child was originally created) means the garbage collector has nothing valid to key off — Kubernetes UIDs are unique per object *instance*, not per name, so a resource recreated with the same name gets a new UID.

**Check the operator's source code (or its documentation) for how it creates child resources**: confirming whether `controllerutil.SetControllerReference` (or the equivalent in whatever framework the operator is built with) is actually called when creating child resources reveals whether owner-reference-setting was ever implemented at all — this is a common omission, especially in early or less mature operators.

**Check what deletion propagation policy was used when deleting the custom resource, if owner references are correctly set but cleanup still didn't happen**: `kubectl delete` defaults to `Background` propagation for most resources (delete the owner immediately, clean up dependents asynchronously) — if an unusual `--cascade=orphan` flag was used (deliberately or by habit/muscle memory from a different context), children would be deliberately left behind by design, not due to any owner-reference problem at all.

## Resolution

If owner references were never set, this requires a code fix in the operator itself (setting `ownerReferences` correctly when creating each child resource going forward) — existing already-orphaned resources from before the fix need to be manually identified and either cleaned up or retroactively given correct owner references, since the fix only prevents the problem for newly-created resources. If it was a deletion-propagation-policy issue, using the correct default (or explicit `Foreground`/`Background`, avoiding `Orphan` unless genuinely intended) resolves it going forward. Confirm the fix by deleting a fresh test custom resource instance and verifying its children are automatically removed.

## Key Takeaways

- Kubernetes' garbage collector only cleans up dependents based on explicitly-set `ownerReferences` — it has no inherent knowledge that "this operator created this for that resource" beyond what's recorded in that field.
- An owner reference matches on the owner's UID, not just its name — a recreated object gets a new UID, silently breaking any reference still pointing at the old one.
- This is a common omission in operator code, especially early or less mature operators that forget to call the equivalent of `SetControllerReference` when creating child resources.
- `kubectl delete --cascade=orphan` deliberately leaves dependents behind by design — worth ruling out as an intentional (or habitual, mistaken) choice before assuming a code bug.

## Interview Follow-Up Questions

- How would you write a script to find and clean up already-orphaned resources left behind before an operator's owner-reference bug was fixed?
- What's the difference between `Foreground` and `Background` cascading deletion, and when would you deliberately choose one over the other?
- How would you test that an operator correctly sets owner references on every type of child resource it creates, as part of its test suite?

## References

- [Kubernetes: Owners and Dependents](https://kubernetes.io/docs/concepts/architecture/garbage-collection/#owners-dependents)
- [Kubernetes: Garbage Collection](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
