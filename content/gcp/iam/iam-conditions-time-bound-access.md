---
id: gcp-iam-conditions-time-bound-access-001
title: "How would you grant a contractor temporary access to a GCP project that automatically expires, without manually revoking it later?"
category: gcp
subcategory: iam
technologies:
  - gcp
difficulty: intermediate
question_type:
  - practical
tags:
  - gcp
  - iam
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A contractor needs access to a GCP project for a two-week engagement. Granting a role manually and relying on someone remembering to revoke it in two weeks is exactly the kind of process that gets forgotten, leaving stale access behind. How would you grant time-bound access that expires automatically?

## Short Answer

Use an IAM Condition on the role binding — GCP IAM supports attaching a Common Expression Language (CEL) condition to a role grant, including a `request.time` expiration condition, so the binding is only valid until a specific timestamp and stops granting access automatically after that, with no manual revocation step required.

## Detailed Explanation

**IAM Conditions attach a CEL expression to a specific role binding, evaluated at request time**: rather than an unconditional "this principal has this role," a conditional binding is only actually in effect when its CEL expression evaluates true — for time-bound access, the expression checks the current request's timestamp against a specified expiration.

**A time-based condition looks like `request.time < timestamp("2026-09-05T00:00:00Z")`**: binding a role to the contractor's identity with this condition attached means the grant is only effective before that timestamp — after it, GCP's IAM evaluation simply stops honoring the binding, with no separate revocation action needed, since the condition itself becomes false.

**This is meaningfully more reliable than a process relying on a human remembering to revoke access later**: manual revocation depends on someone (a ticket, a calendar reminder, an offboarding checklist) actually executing the revocation on time — a time-bound IAM Condition removes that dependency entirely, since the access technically stops being valid automatically, regardless of whether anyone remembers to do anything.

**Conditions can express more than just time — resource-based and other conditions are also supported**: the same mechanism (a CEL expression attached to a binding) can restrict a grant to specific resources matching a naming pattern, or other request attributes — time-bound expiration is one common, high-value use case, but the underlying mechanism is more general than just "temporary access."

**This doesn't replace the need to actually track and follow up on temporary grants organizationally**: while the technical access does expire automatically, it's still worth having a record of who was granted temporary access and why (for audit purposes, and to catch a case where someone might request the grant be extended right as it's about to expire) — the IAM Condition solves the "forgot to revoke" failure mode specifically, not the broader access-governance process around temporary grants.

## Key Takeaways

- IAM Conditions attach a CEL expression to a role binding, letting the grant be conditionally valid rather than unconditionally in effect.
- A time-based condition (checking `request.time` against an expiration timestamp) makes a grant automatically stop being effective after a specific point, with no manual revocation step required.
- This removes the "someone forgot to revoke it" failure mode that a purely process-based (manual) temporary-access approach depends on.
- Conditions can express more than time-bound expiration (resource-based restrictions, other request attributes), making this a more general mechanism than just "temporary access."

## Interview Follow-Up Questions

- How would you audit a project to find all currently-active conditional IAM bindings and confirm none have an unexpectedly distant or missing expiration?
- What would you do if the contractor's engagement gets extended right before the condition expires — how would you handle that gracefully?
- How would you combine a time-bound condition with a resource-based restriction, for a contractor who should only access specific resources for a specific time window?

## References

- [Google Cloud: IAM Conditions overview](https://cloud.google.com/iam/docs/conditions-overview)
- [Google Cloud: Common Expression Language (CEL) syntax reference](https://cloud.google.com/iam/docs/conditions-overview#cel)
