---
id: kubernetes-workloads-job-must-never-run-twice-001
title: "How would you design a Job for a task that must never run twice, even if a pod fails partway through (e.g., a billing charge)?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: expert
question_type:
  - architecture
  - scenario
tags:
  - kubernetes
  - jobs
  - idempotency
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Kubernetes Job needs to perform a task with a real, non-reversible side effect — charging a customer's payment method. Kubernetes Jobs retry on failure by design, and a pod can fail *after* the side effect already happened but *before* it successfully reports success (a crash right after the charge API call returns, a node failure mid-execution). How would you design this so the charge genuinely never happens twice, given Kubernetes itself won't guarantee that?

## Short Answer

Don't rely on the Job's pod-retry mechanics to provide exactly-once semantics at all — Kubernetes Jobs guarantee at-least-one-attempt, never exactly-once, so the safety has to come from the task's own design: generate a unique idempotency key for the operation up front, and have the payment provider's API (or an intermediary you control) deduplicate on that key, so a retried attempt with the same key is a safe no-op rather than a second charge.

## Detailed Explanation

The mistake to avoid is looking for a Kubernetes-level setting that provides exactly-once execution — none exists, because the guarantee genuinely can't be provided at that layer (a pod can always fail between performing a side effect and reporting it). The correct design moves the safety property into the task itself, using an idempotency mechanism that makes a retry harmless rather than trying to prevent retries from happening.

## Requirements

- The charge must never be applied twice, regardless of how many times the underlying pod is retried.
- The system must correctly recover and complete the charge even if a retry does occur after a partial failure.
- The solution must not depend on Kubernetes providing a guarantee it doesn't actually make.

## Architecture

**Accept that Kubernetes cannot provide exactly-once execution — design around that, not against it**: no configuration of `backoffLimit`, `completions`, or `restartPolicy` changes the fundamental fact that a pod can fail after performing a side effect but before reporting success — the retry will then re-attempt the same logical operation. The correct fix is entirely at the application/task level, not the Kubernetes configuration level.

**An idempotency key makes retries safe by design**: generating a unique key for the specific logical operation (not per-pod-attempt, but per-intended-charge — e.g., derived from an order ID) and passing it to the payment provider's API (most major payment APIs, like Stripe, support an idempotency key parameter specifically for this purpose) means a retried request with the same key returns the original result instead of creating a second charge — the payment provider's own deduplication, not Kubernetes, is what actually prevents the double-charge.

**If the payment provider doesn't support idempotency keys natively, build a deduplication layer**: recording "operation X with key Y has been submitted" in a durable store (a database with a unique constraint on the key) *before* calling the external API, and checking that record first on any retry, achieves the same effect — the check-then-act sequence needs to be atomic (the unique constraint enforces this) to avoid a race between two near-simultaneous retries both passing the check.

**The Job's own completion signal should reflect the *idempotent operation's* outcome, not just "did the pod run"**: on a retry, the pod should re-check whether the operation already completed (via the idempotency record) before attempting the charge again — if it finds the operation already succeeded, it should report success immediately without re-calling the payment API at all, making the retry itself cheap and safe rather than something to avoid.

**`backoffLimit` and retry behavior become genuinely safe once the underlying operation is idempotent**: with the idempotency design in place, Kubernetes' default retry behavior is no longer a risk to design around — it becomes a legitimate reliability mechanism (recovering from transient node failures, pod crashes) rather than a source of duplicate side effects, which is the more general lesson: making the *task* safely retryable is almost always the right fix, rather than trying to prevent Kubernetes from retrying at all.

## Trade-offs

Building or relying on idempotency-key deduplication adds real design and implementation cost — a durable, atomic record-keeping mechanism if the external API doesn't provide this natively — compared to naively trusting the Job to "just run once." This cost is unavoidable for genuinely non-reversible side effects; for operations that are naturally idempotent already (overwriting a value with the same computed result, for instance) this whole design burden doesn't apply, so it's worth confirming the operation actually needs this level of care before investing in it.

## Key Takeaways

- Kubernetes Jobs guarantee at-least-one-attempt, never exactly-once — this is a fundamental property, not a configuration gap to close.
- An idempotency key, deduplicated by the external system (or a durable store you control), is what actually prevents a duplicate side effect — not any Kubernetes-level setting.
- The check for "has this operation already happened" needs to happen before the pod re-attempts the side effect on a retry, using the idempotency record.
- Once the underlying operation is genuinely idempotent, Kubernetes' default retry behavior becomes a reliability asset rather than a risk — the general lesson extends well beyond payments.

## Interview Follow-Up Questions

- How would you handle the case where the pod crashes after successfully recording the idempotency key but before actually calling the payment API — does that leave the operation in a permanently stuck state?
- What would you do if the operation involves multiple external systems, each with their own idempotency semantics, rather than a single payment API call?
- How would you test that this idempotency design actually works, including simulating a pod crash at the exact moment right after the external call but before recording success?

## References

- [Kubernetes: Jobs — Handling Pod and Container Failures](https://kubernetes.io/docs/concepts/workloads/controllers/job/#handling-pod-and-container-failures)
- [Stripe: Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)
