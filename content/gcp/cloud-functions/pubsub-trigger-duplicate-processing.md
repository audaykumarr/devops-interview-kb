---
id: gcp-cloud-functions-pubsub-trigger-duplicate-processing-001
title: "A Pub/Sub-triggered Cloud Function occasionally processes the same message twice — is this a bug, and how do you actually fix it?"
category: gcp
subcategory: cloud-functions
technologies:
  - gcp
  - cloud-functions
  - pubsub
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - gcp
  - cloud-functions
  - pubsub
  - idempotency
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Cloud Function triggered by a Pub/Sub topic occasionally processes the exact same message twice, causing a duplicate side effect (a duplicate database row, a duplicate email sent). No error is visible in the logs — the function appears to run successfully both times. Is this a bug in Cloud Functions or Pub/Sub, and what's the actual fix?

## Short Answer

This isn't a bug — Pub/Sub guarantees at-least-once delivery, not exactly-once, meaning message redelivery under normal operation (network issues, acknowledgment timing) is expected, not exceptional. The fix isn't preventing redelivery (which isn't possible), it's making the function's own processing idempotent — checking, via the message's stable `messageId`, whether it's already been processed before performing the side effect again.

## Detailed Explanation

Pub/Sub's delivery guarantee is at-least-once, not exactly-once, by design — this isn't a bug anywhere in the pipeline, it's a fundamental property of the messaging system that every consumer, including a Cloud Function trigger, has to account for explicitly rather than assume away.

## Symptoms

- The same Pub/Sub message occasionally triggers the function twice (or more), each execution appearing to succeed normally.
- No error, retry indication, or anything unusual is visible in the function's own logs for either execution.
- The duplicate processing produces a visible duplicate side effect (a duplicate write, a duplicate external action).

## Possible Causes

- Pub/Sub's at-least-once delivery guarantee means a message can genuinely be delivered more than once under normal, expected operation — network issues, acknowledgment timing, and Pub/Sub's own internal retry behavior can all cause a message the subscriber already successfully processed to be redelivered.
- The function's acknowledgment deadline was exceeded (the function took longer to process than the configured ack deadline), causing Pub/Sub to consider the message unacknowledged and redeliver it — even though the function's own processing eventually did complete successfully.
- The function's code has no idempotency mechanism at all, meaning it has no way to recognize "I've already processed this specific message" and simply re-executes its full side effect on redelivery.

## Investigation Steps

**Confirm this is genuinely Pub/Sub redelivery, not a different bug producing a similar-looking symptom**: checking the message's `messageId` (which is stable and identical across redeliveries of the same logical message) in the function's logs for both executions confirms whether it's truly the same message delivered twice, versus two genuinely different messages that happen to produce similar-looking duplicate effects.

**Check whether the function's processing time is approaching or exceeding the subscription's acknowledgment deadline**: comparing typical execution duration against the configured ack deadline (default 10 seconds, extendable) reveals whether slow processing is itself triggering unnecessary redelivery — a function that takes 15 seconds against a 10-second ack deadline will be redelivered even though it eventually succeeds, since Pub/Sub already considered the message timed out.

**Confirm no idempotency mechanism currently exists in the function's code**: reviewing the actual processing logic for whether it checks "have I already done this" before performing its side effect (a database uniqueness constraint, a check against a processed-messages log) confirms the gap directly — this is almost always the actual root cause, since Pub/Sub's at-least-once behavior is expected and unavoidable, not something to eliminate.

## Resolution

Implement idempotency in the function's own processing logic, using the message's `messageId` (or an application-level idempotency key extracted from the message content) as the deduplication key — checking a durable store (a database with a unique constraint on this key, or a dedicated deduplication table) before performing the side effect, so a redelivered message is recognized and safely skipped rather than reprocessed. Separately, if slow processing is contributing to unnecessary redelivery, either optimize the processing to complete faster, or explicitly extend the acknowledgment deadline to match realistic processing time. Confirm the fix by deliberately simulating a redelivery (or waiting for a naturally-occurring one) and confirming the side effect isn't duplicated.

## Key Takeaways

- Pub/Sub's at-least-once delivery guarantee means message redelivery is expected, normal behavior, not a bug — every subscriber needs to handle it, not assume it away.
- A message's `messageId` is stable across redeliveries, making it the natural deduplication key for an idempotency check.
- Slow processing relative to the acknowledgment deadline can itself trigger unnecessary redelivery, even for a message the function ultimately processes successfully.
- The actual fix is implementing idempotency in the function's own logic (checking a durable store before performing the side effect), not trying to eliminate Pub/Sub's at-least-once behavior, which isn't possible.

## Interview Follow-Up Questions

- How would you design the deduplication store itself to avoid it becoming an unbounded, ever-growing table of every processed message ID?
- What's the difference between Pub/Sub's standard subscriptions and its exactly-once delivery feature (where available) — would that eliminate the need for application-level idempotency?
- How would you extend the acknowledgment deadline correctly for a function with genuinely variable, sometimes-long processing time, without just setting it arbitrarily high?

## References

- [Google Cloud: Pub/Sub subscriber overview — At-least-once delivery](https://cloud.google.com/pubsub/docs/subscriber)
- [Google Cloud: Exactly-once delivery](https://cloud.google.com/pubsub/docs/exactly-once-delivery)
