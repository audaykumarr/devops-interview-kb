---
id: aws-lambda-provisioned-concurrency-cost-tradeoff-002
title: "How does Provisioned Concurrency eliminate Lambda cold starts on demand, and what does that actually cost?"
category: aws
subcategory: lambda
technologies:
  - aws
  - lambda
difficulty: intermediate
question_type:
  - conceptual
tags:
  - aws
  - lambda
  - cold-start
  - cost
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Provisioned Concurrency is often described as eliminating Lambda cold starts. Mechanically, how does it actually do that, and what's the real cost trade-off?

## Short Answer

Provisioned Concurrency has AWS pre-initialize and keep warm a specified number of execution environments continuously, ahead of any actual invocation — so requests routed to that reserved capacity always hit an already-warm environment, never triggering the cold-start initialization path at all. The cost is that you pay for this reserved capacity for the entire time it's configured, regardless of whether it's actually handling traffic at any given moment — a fundamentally different billing model from Lambda's normal per-invocation pricing.

## Detailed Explanation

**The mechanism**: normally, Lambda creates execution environments on demand as invocations arrive, and reuses a warm one when a new invocation arrives while it's still available (per the earlier execution-environment-reuse discussion) — but a request arriving when no warm environment is available triggers cold-start initialization. Provisioned Concurrency changes this by having AWS proactively initialize the configured number of execution environments *before* any invocation needs them, and keep them continuously warm and ready — a request routed to this provisioned capacity always finds an already-initialized environment waiting, structurally avoiding the cold-start path for as long as the configured capacity isn't exceeded by concurrent demand.

**The billing model shift**: standard Lambda billing is purely per-invocation (duration × memory, only while actually executing) — you pay nothing for idle time between invocations. Provisioned Concurrency is billed for the entire duration it's configured, regardless of actual usage — if you provision for 10 concurrent executions continuously, you're paying for that reserved capacity every hour, whether it's handling 10 requests or zero at any given moment. This is a genuinely different cost model: standard Lambda's "pay only for what you use" becomes "pay for guaranteed capacity, used or not."

**When the trade-off favors Provisioned Concurrency**: predictable, latency-sensitive traffic (a user-facing API with a strict p99 latency requirement, sized to comfortably cover expected peak concurrency) — the cost of guaranteed warm capacity is justified by the guaranteed elimination of cold-start latency for traffic that genuinely needs it.

**When it doesn't**: sporadic, unpredictable, or low-volume traffic — provisioning for a rare burst means paying continuously for capacity that sits idle the vast majority of the time, which can cost meaningfully more than simply accepting the occasional cold start would, especially if the workload isn't latency-critical enough to justify the guarantee.

**Sizing it correctly matters as much as deciding to use it at all**: over-provisioning wastes money on unused reserved capacity; under-provisioning means traffic exceeding the provisioned amount still falls back to normal on-demand cold-start behavior for the excess — getting the size right (informed by actual observed or projected concurrent traffic patterns, including known peaks) is itself a real tuning exercise, not a one-time set-and-forget decision, especially for traffic with meaningful daily/weekly variation.

## Key Takeaways

- Provisioned Concurrency proactively keeps execution environments warm before invocations arrive, structurally avoiding cold starts for traffic within the provisioned capacity.
- It's billed continuously for the entire configured duration, regardless of actual usage — a fundamentally different model from standard per-invocation billing.
- It's cost-effective for predictable, latency-sensitive traffic sized to real concurrency needs; wasteful for sporadic, low-volume, or non-latency-critical traffic.
- Correct sizing (matching provisioned capacity to actual concurrent demand patterns) is an ongoing tuning exercise, not a one-time decision.

## Interview Follow-Up Questions

- How would you use Application Auto Scaling to adjust Provisioned Concurrency dynamically based on a schedule or actual traffic patterns?
- What's the risk of traffic exceeding the provisioned amount — how does the excess get handled?
- How would you measure whether a given Provisioned Concurrency configuration is actually cost-justified, in ongoing operation?

## References

- [AWS: Configuring provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [AWS: AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
