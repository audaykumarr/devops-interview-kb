---
id: kubernetes-admission-validating-vs-mutating-webhooks-001
title: "What's the difference between a validating and a mutating admission webhook, and in what order do they actually run?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - admission-control
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A cluster has both `MutatingWebhookConfiguration` and `ValidatingWebhookConfiguration` objects registered. Both intercept requests before they're persisted. What's actually different about what each is allowed to do, and does the order they run in matter?

## Short Answer

Mutating webhooks can modify the object being created/updated (injecting a sidecar container, setting a default label); validating webhooks can only accept or reject the request, never change it. Mutating webhooks always run first, all of them, before any validating webhook runs — this ordering is deliberate: validation needs to see the object's *final* form (after every mutation has been applied), not an intermediate, partially-mutated state.

## Detailed Explanation

**Mutating webhooks can change the object; validating webhooks can only allow or deny it**: a mutating webhook's response can include a JSON Patch that modifies the incoming object — this is the mechanism behind sidecar injection (Istio, Linkerd), default value injection, and label/annotation stamping. A validating webhook's response is a simple admit/deny (with an optional message explaining why) — it has no ability to alter what gets persisted, only to accept or reject it as-is.

**All mutating webhooks run before any validating webhook, cluster-wide**: the API server first runs every applicable mutating webhook, in sequence (each one seeing the result of the previous one's mutations), and only after all mutations are complete does it run every applicable validating webhook against the final, fully-mutated object — this ordering guarantee is what lets a validating webhook trust it's checking the object that will actually be persisted, not some intermediate state that a later mutation might still change.

**Multiple mutating webhooks applying to the same request run in a defined but not always obvious order**: when several mutating webhooks match the same request, they're invoked sequentially (ordered by webhook configuration name, alphabetically, unless further constrained) — each one's output becomes the next one's input, meaning the actual final object can depend on this ordering, which is worth being deliberate about if multiple mutating webhooks might touch overlapping fields.

**Both webhook types can specify which operations, resources, and namespaces they apply to**: `rules` (matching on API group/version, resource kind, and operation like CREATE/UPDATE/DELETE) and `namespaceSelector`/`objectSelector` let each webhook scope itself precisely — this scoping matters both for correctness (only intercepting what the webhook is actually meant to act on) and for avoiding accidentally intercepting critical system namespaces or bootstrap-sensitive operations.

**This two-phase design (mutate-then-validate) mirrors a sensible general principle**: normalize/complete the data first, then check that the complete, normalized result is actually valid — checking validity against an incomplete object (before defaults/injections have been applied) would produce confusing, premature rejections for things that were always going to be filled in correctly by a subsequent mutation.

## Key Takeaways

- Mutating webhooks can modify the object (via JSON Patch); validating webhooks can only accept or reject it, unchanged.
- All mutating webhooks run first, cluster-wide, before any validating webhook — validation always sees the final, fully-mutated object.
- Multiple mutating webhooks matching the same request run sequentially, each seeing the previous one's output — ordering can matter if they touch overlapping fields.
- `rules`, `namespaceSelector`, and `objectSelector` let each webhook scope precisely which requests it actually intercepts.

## Interview Follow-Up Questions

- What's the risk of a validating webhook's `failurePolicy` being set to `Fail` versus `Ignore`, and how would you choose between them?
- How would you debug which specific webhook (among several registered) actually mutated or rejected a particular request?
- How would you design a mutating webhook to avoid conflicting with another mutating webhook that touches the same field?

## References

- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
