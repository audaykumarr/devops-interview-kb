---
id: kubernetes-crds-designing-status-subresource-001
title: "Why should a CRD's status be a separate subresource from spec, and what belongs in status versus spec?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - kubernetes
  - crd
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

When designing a CRD, `spec` and `status` are conventionally separate, and `status` is typically configured as its own API subresource (`subresources: { status: {} }` in the CRD definition). Why does this separation matter, and how would you decide what belongs in each?

## Short Answer

`spec` represents desired state — what the user (or another system) wants to be true, and is the only thing they should be writing to. `status` represents observed, actual state — what the controller has determined to currently be true, and only the controller should write to it. Making `status` a separate subresource enforces this boundary at the API level: updating `spec` (via the main resource endpoint) and updating `status` (via the `/status` subresource endpoint) are separate operations with separate RBAC permissions, which prevents a user's `spec` update from accidentally clobbering the controller's `status` update (or vice versa) due to a race condition on a single combined object write.

## Detailed Explanation

**`spec` is desired state, written by the user/consumer, read by the controller**: this is the "what should be true" side — a user creates or edits a custom resource's `spec` to declare intent (how many replicas, what configuration), and the controller's reconciliation loop reads it to know what to work toward.

**`status` is observed state, written by the controller, read by the user/consumer**: this is the "what is actually true, as far as the controller currently knows" side — after reconciling, the controller writes back what it actually observed and did (current replica count, conditions like `Ready`/`Progressing`, any error state) so users and other tooling can see the real, current state without needing to inspect the underlying managed resources directly.

**The status subresource enforces this write-boundary at the API level, not just by convention**: without `subresources: { status: {} }` configured, `spec` and `status` are just fields on the same object, and any client with write access to the object can modify either — a user's well-intentioned `kubectl edit` touching `spec` could accidentally include (and overwrite) whatever `status` currently held, especially if working from a slightly stale local copy. With the status subresource enabled, updates to `/status` and updates to the main object (which then excludes `status` from being modifiable) are separate API operations, and RBAC can grant update permission on one without the other — a controller can be granted `status` update rights without also needing (or risking) `spec` write access, and vice versa for a user.

**This separation also avoids a specific race-condition class**: without the subresource split, a controller writing `status` and a user simultaneously editing `spec` on the same object both go through the same object-level optimistic concurrency (`resourceVersion`) check — a controller's frequent status updates competing with a user's occasional spec edit for the same `resourceVersion` can cause unnecessary conflict/retry churn; splitting them into separate subresources means status updates and spec updates don't contend with each other's `resourceVersion` at all.

**Deciding what belongs in `status` versus `spec` for a new field**: if it's something the user is declaring/requesting (an input), it belongs in `spec`; if it's something the controller determined by observing the real world (a fact, a computed result, a current condition), it belongs in `status` — a common mistake is putting computed/observed information in `spec` because it was easier to add there, which then blurs the desired-vs-actual distinction the whole pattern exists to preserve.

**`status.conditions` following the standard Kubernetes conditions pattern is a widely-adopted convention worth following**: an array of typed conditions (`type: Ready, status: "True", reason: ..., message: ..., lastTransitionTime: ...`) gives a consistent, tooling-friendly way to express current state and history, matching the pattern built-in resources like Pod and Deployment already use — following this convention makes a custom resource's status genuinely familiar and easy to consume for anyone already used to reading Kubernetes' own built-in resource statuses.

## Key Takeaways

- `spec` is desired state written by the user/consumer; `status` is observed state written by the controller — the boundary is about who's the intended writer.
- The status subresource enforces this write-boundary at the API level, enabling separate RBAC and avoiding accidental clobbering between spec edits and status updates.
- Splitting status into its own subresource also avoids `resourceVersion` contention between frequent controller status updates and occasional user spec edits.
- Follow the standard `status.conditions` array pattern (type/status/reason/message/lastTransitionTime) for consistency with how built-in Kubernetes resources already express state.

## Interview Follow-Up Questions

- How would you design RBAC so a controller can update a CRD's status but genuinely cannot modify its spec, even accidentally?
- What would you do if a piece of information is genuinely ambiguous about whether it belongs in spec or status — how would you decide?
- How would `kubectl get` and `kubectl describe` behave differently for a CRD with a status subresource configured versus one without it?

## References

- [Kubernetes: CustomResourceDefinition — Subresources](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#status-subresource)
- [Kubernetes API Conventions: Typed Status Conditions](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md#typical-status-properties)
