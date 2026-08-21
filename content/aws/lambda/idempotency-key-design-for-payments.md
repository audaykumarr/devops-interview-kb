---
id: aws-lambda-idempotency-key-design-payments-001
title: "What idempotency key design would you use for a payment-related Lambda function, given the higher stakes of a duplicate execution?"
category: aws
subcategory: lambda
technologies:
  - aws
  - lambda
difficulty: advanced
question_type:
  - practical
tags:
  - aws
  - lambda
  - idempotency
  - payments
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Retry logic on a caller means a payment-processing Lambda function might get invoked more than once for what should be a single logical transaction. Given the real financial stakes of a duplicate charge, how would you design its idempotency key?

## Short Answer

Use a key derived from something genuinely unique to the logical transaction and controlled by the caller, generated once per intended transaction (not per attempt) — commonly a client-generated UUID passed explicitly with the request — and store it in a durable, strongly-consistent store (like DynamoDB with conditional writes) that the function checks before processing, atomically claiming the key so concurrent or retried invocations with the same key are guaranteed to only actually process the payment once, with subsequent duplicate invocations returning the original result rather than reprocessing.

## Detailed Explanation

**The key must represent "one intended transaction," generated once, not once per attempt**: a naive approach generating a new idempotency key inside the Lambda function itself, or based on something that changes between retries (a timestamp), defeats the entire purpose — retries would each get treated as new, distinct transactions. The key needs to be generated once, by the caller, at the moment the transaction is first intended, and passed along unchanged through every retry attempt for that same logical transaction — commonly a client-generated UUID the caller creates before the first attempt and reuses on every retry.

**Atomic claim-and-check via a strongly-consistent store**: the function needs to atomically check "has this key already been processed" and, if not, claim it before doing the actual payment processing — DynamoDB's conditional writes (`PutItem` with a condition that the item doesn't already exist) are a common, correct mechanism for this: attempting to insert a record for the idempotency key, succeeding only if no record already exists, gives an atomic "claim" operation immune to a race between two near-simultaneous duplicate invocations both checking "does this exist" and both concluding "no" before either writes (a classic check-then-act race that a naive read-then-write implementation would be vulnerable to).

**Store the actual result, not just a "processed" flag**: when a duplicate invocation arrives for an already-claimed key, it needs to return the *same result* the original successful processing produced (the same transaction ID, the same confirmation details) — not just detect "already processed" and return a generic error, since the caller genuinely needs the actual outcome of their transaction, and returning an error for what was actually a successful (already-completed) payment would be its own bug.

**Handle the in-progress state explicitly**: between "claimed" and "actually completed," if the function crashes or times out mid-processing, a naive implementation might leave the key claimed but with no valid result, causing a genuine retry to be incorrectly treated as a duplicate of a transaction that never actually completed — the state machine needs at least three states (not-started, in-progress, completed-with-result) with clear logic for what a duplicate invocation does when it finds the key in each state, including safely retrying (not silently succeeding-without-processing) a genuinely stuck in-progress state after some reasonable timeout.

**Set a reasonable TTL on idempotency records**: keeping every idempotency key forever isn't necessary or cost-effective — a TTL matched to the realistic maximum window during which a legitimate retry might occur (accounting for the caller's own retry/backoff policy) balances correctness against unbounded storage growth, using DynamoDB's native TTL feature for automatic expiry.

## Key Takeaways

- The idempotency key must be generated once per intended transaction by the caller, and reused unchanged across every retry — not regenerated per attempt.
- Atomic claim-and-check via conditional writes (e.g. DynamoDB `PutItem` with a condition) avoids the check-then-act race a naive read-then-write approach would be vulnerable to.
- Store and return the actual transaction result for duplicate invocations, not just a generic "already processed" response.
- Handle the in-progress state explicitly (not just claimed-versus-completed) to avoid a crashed mid-processing attempt being mistaken for a genuine duplicate on retry.

## Interview Follow-Up Questions

- How would you handle a legitimate retry arriving while the original attempt is still genuinely in progress, versus one arriving after the original has stalled/crashed?
- What TTL would you choose for idempotency records, and how would you justify that duration?
- How would this design change for a payment system requiring strict, auditable compliance logging of every attempt, not just the final outcome?

## References

- [AWS: Lambda function idempotency](https://docs.aws.amazon.com/lambda/latest/operatorguide/idempotency.html)
- [AWS: DynamoDB conditional writes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.ConditionalUpdate)
