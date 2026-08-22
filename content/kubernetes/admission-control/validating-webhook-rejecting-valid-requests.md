---
id: kubernetes-admission-webhook-rejecting-valid-requests-001
title: "A validating webhook is rejecting pod creations that look completely valid — how do you diagnose what it's actually objecting to?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - admission-control
  - webhooks
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

`kubectl apply` on a pod spec fails with an admission webhook denial, but the pod spec looks completely reasonable — nothing obviously violates any policy you're aware of. The webhook's rejection message is generic or unhelpful. How do you actually figure out what the webhook object to, given you can't directly read its internal logic from the error alone?

## Short Answer

Check the webhook's own pod logs first — a well-built validating webhook logs the specific reason for each denial internally, even when the message returned to the client is generic, and this is almost always more informative than the client-facing error. If the webhook was applied to the object *after* other mutating webhooks ran, also check what the object actually looked like post-mutation, since the webhook may be objecting to a mutated field the original manifest never explicitly set.

## Detailed Explanation

The client only sees whatever message the webhook's code chose to return — a poorly-implemented webhook returns a generic "denied" message even when its internal logic determined something quite specific, meaning the investigation has to go around the client-facing error to the webhook's own internals.

## Symptoms

- `kubectl apply` (or an equivalent create/update) fails with an admission webhook denial message.
- The returned message is generic, unhelpful, or doesn't clearly indicate what specifically about the request was rejected.
- The submitted manifest appears, on inspection, not to violate any known policy.

## Possible Causes

- The webhook's denial message code path genuinely doesn't include specific detail, even though its internal logic evaluated a specific condition — this is a webhook implementation quality issue, not something wrong with your request.
- The object being validated isn't actually what you submitted — a mutating webhook that ran earlier modified it (added a label, injected a container, changed a value) in a way that then triggers the validating webhook's rejection, even though your original manifest was fine.
- The webhook's policy logic has a bug or an overly broad condition that's incorrectly matching your legitimate request.

## Investigation Steps

**Check the webhook's own pod logs directly**: `kubectl logs -n <webhook-namespace> <webhook-pod>` around the timestamp of the failed request — a reasonably well-built webhook logs the specific field/condition it evaluated and rejected, which is typically far more informative than the generic message returned to the API client.

**Reconstruct what the object actually looked like at validation time, accounting for prior mutations**: since validating webhooks run after all mutating webhooks, the object being checked may differ from what you submitted — using `kubectl apply --dry-run=server` (which exercises the full admission chain, including mutating webhooks, without persisting) and inspecting the response can reveal the actual post-mutation object the validating webhook was evaluating.

**Check the webhook's own configuration for exactly what it's supposed to validate**: if you have access to the webhook's source or documentation, understanding its actual intended policy (rather than guessing from the generic error) narrows down which specific field or condition is likely responsible — comparing your object's fields against that documented policy directly.

**Test with a minimal, deliberately simplified manifest to isolate the triggering field**: if the webhook's logic and logs are both unhelpful, incrementally simplifying the manifest (removing fields one at a time, or starting from a known-working minimal manifest and adding fields back one at a time) until the rejection stops (or starts) isolates the specific triggering field empirically, even without visibility into the webhook's internals.

## Resolution

Once the specific triggering condition is identified (a mutated field, a specific policy rule, a webhook bug), the fix follows directly: adjust your manifest to comply with the actual policy if it's legitimate, escalate to whoever owns the webhook if its logic has a bug or overly broad condition incorrectly matching valid requests, or fix the interaction with an upstream mutating webhook if that's the actual source of the unexpected post-mutation state. Confirm the fix by successfully applying the corrected manifest.

## Key Takeaways

- Check the webhook's own pod logs first — they're almost always more informative than whatever generic message reaches the client.
- Validating webhooks see the object *after* all mutations have already been applied — the object being checked may differ from what you originally submitted.
- `kubectl apply --dry-run=server` exercises the full admission chain (including mutations) without persisting, letting you inspect the actual post-mutation object.
- If logs and dry-run don't clarify it, incrementally simplifying the manifest to isolate the specific triggering field is a reliable empirical fallback.

## Interview Follow-Up Questions

- How would you improve a webhook's own denial messages to make this exact investigation faster for whoever hits it next?
- How would you audit which specific mutating webhooks touched an object, if several are registered and you're not sure which one caused an unexpected mutation?
- How would you design a webhook's own test suite to catch a policy bug like this before it reaches production and affects real users?

## References

- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: kubectl apply --dry-run](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
