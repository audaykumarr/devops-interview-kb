---
id: aws-lambda-provisioned-concurrency-vs-snapstart-001
title: "What's the difference between Lambda Provisioned Concurrency and Lambda SnapStart, and when would each be the better fit?"
category: aws
subcategory: lambda
technologies:
  - aws
  - lambda
difficulty: intermediate
question_type:
  - comparison
tags:
  - aws
  - lambda
  - cold-starts
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Both Provisioned Concurrency and Lambda SnapStart address cold-start latency, but they work completely differently and fit different situations. What's the actual mechanism difference, and how would you decide between them?

## Short Answer

Provisioned Concurrency keeps a specified number of execution environments permanently initialized and warm (you pay continuously for that reserved capacity), while SnapStart takes a snapshot of an already-initialized execution environment and resumes new invocations from that snapshot (no continuous reserved capacity, and no extra charge beyond normal invocation cost) — SnapStart is generally the better default when it's supported for your runtime, since it removes cold-start latency without ongoing reserved-capacity cost, but Provisioned Concurrency remains necessary for runtimes SnapStart doesn't support, or when you need guaranteed capacity for reasons beyond just cold-start latency (like guaranteed concurrent execution slots during a traffic spike).

## Detailed Explanation

**Provisioned Concurrency: reserved, continuously-warm capacity**: you specify a number of execution environments to keep initialized and ready at all times, and pay for that reserved capacity continuously (whether or not it's actively handling invocations) — this guarantees both no cold starts (up to the provisioned level) and guaranteed available concurrency, but the cost is ongoing regardless of actual traffic.

**SnapStart: snapshot-and-resume, no continuous reservation**: SnapStart initializes a function once, takes a snapshot of the initialized execution environment's memory and disk state (cached, encrypted, and reused), and subsequent cold starts resume from that snapshot rather than running full initialization from scratch — there's no continuously-reserved capacity being paid for, and pricing is based on cache-restore actions plus normal invocation cost, not ongoing reservation.

**Runtime support is a hard constraint**: SnapStart's availability is limited to specific runtimes (initially Java, later extended to Python and .NET, with availability varying by when you're checking) — for a runtime SnapStart doesn't support, Provisioned Concurrency remains the only mechanism available, making the runtime a hard first filter on the decision rather than a preference.

**SnapStart doesn't guarantee available concurrency the way Provisioned Concurrency does**: Provisioned Concurrency reserves actual execution slots, useful when you need guaranteed capacity available at a specific moment (not just fast cold starts) — SnapStart speeds up cold starts when they do happen, but doesn't reserve slots the way Provisioned Concurrency's continuous warm capacity does, a distinction that matters for workloads where guaranteed concurrency (not just latency) is the actual requirement.

**Snapshot state requires care around non-deterministic initialization**: because SnapStart resumes multiple invocations from the same cached snapshot, any state captured during initialization that should be unique per invocation (like a random seed, a UUID generated at init time, or a connection object holding an ID from a source that assumes it was freshly created) needs specific handling (AWS provides runtime hooks for this) to avoid all invocations resuming from the snapshot incorrectly sharing that supposedly-unique state — a correctness consideration that doesn't apply to Provisioned Concurrency's simpler cost/latency trade-off.

**Cost profile favors SnapStart when it's available**: since SnapStart doesn't require paying for continuously-reserved capacity, it's typically meaningfully cheaper than Provisioned Concurrency for the same cold-start-avoidance goal, when the runtime supports it — making it the preferred default choice specifically when both options are actually available for your workload.

## Key Takeaways

- Provisioned Concurrency reserves continuously-warm execution environments and is paid for continuously; SnapStart resumes from a cached snapshot with no continuous reservation cost.
- SnapStart's runtime support is limited (varies over time) and is a hard constraint on whether it's even an option.
- Provisioned Concurrency guarantees available concurrency, not just fast cold starts, which matters for workloads needing guaranteed capacity.
- SnapStart requires care around non-deterministic state captured at initialization time, since multiple invocations resume from the same snapshot.

## Interview Follow-Up Questions

- How would you handle a Lambda function that generates a unique connection ID during initialization, to make it safe for SnapStart's snapshot-and-resume model?
- What would you measure to decide whether a workload actually needs Provisioned Concurrency's guaranteed-capacity property, versus just SnapStart's latency improvement being sufficient?
- How would you validate that a runtime upgrade doesn't silently lose SnapStart support, if a critical function depends on it?

## References

- [AWS Lambda: Improving startup performance with Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html)
- [AWS Lambda: Configuring provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
