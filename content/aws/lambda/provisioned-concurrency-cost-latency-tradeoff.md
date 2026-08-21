---
id: aws-lambda-provisioned-concurrency-cost-latency-tradeoff-001
title: "What's the cost/latency trade-off of using Provisioned Concurrency versus just increasing a Lambda function's timeout to absorb cold starts?"
category: aws
subcategory: lambda
technologies:
  - aws
  - lambda
difficulty: intermediate
question_type:
  - comparison
  - conceptual
tags:
  - aws
  - lambda
  - cold-start
  - cost
estimated_time_minutes: 6
companies: []
related_questions:
  - aws-lambda-timeout-troubleshooting-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Cold starts are hurting a Lambda function's tail latency. Provisioned Concurrency keeps execution environments pre-warmed, but simply increasing the function's timeout is a much smaller change. What's the actual trade-off between these two approaches?

## Short Answer

Increasing the timeout doesn't reduce cold start latency at all — it just buys more time for a slow cold start to complete before Lambda kills the invocation as timed out, so callers still experience the full cold-start delay, only now without a timeout error on top of it. Provisioned Concurrency actually eliminates cold starts for the provisioned capacity by keeping execution environments pre-initialized and ready, at the cost of paying for that reserved capacity continuously, whether or not it's actually being used at any given moment.

## Detailed Explanation

These two approaches don't actually address the same problem, which is the first thing worth being clear about. A timeout is a ceiling on how long an invocation is allowed to run before Lambda forcibly terminates it; increasing it doesn't make anything faster, it just tolerates a slower worst case. If cold starts are causing timeout errors specifically (the initialization plus handler execution together exceed the configured timeout), raising the timeout stops the error — but the caller still waits through the full cold-start duration, they just get a slow success instead of a fast failure. This is sometimes the right call if a slow response is acceptable but an outright failure isn't, but it's a tolerance measure, not a fix for the underlying latency.

Provisioned Concurrency addresses the actual cause: AWS pre-initializes and keeps warm a specified number of execution environments continuously, so invocations routed to that provisioned capacity skip cold-start initialization entirely — they hit an already-warm environment every time, within the provisioned count. This genuinely eliminates cold-start latency for however much concurrency is provisioned, not just tolerates it.

The cost trade-off is real and direct: Provisioned Concurrency is billed for the entire time it's configured, regardless of whether it's actually handling invocations at that moment — you're paying for guaranteed warm capacity, not per-invocation. This makes it a good fit for predictable, latency-sensitive traffic (a user-facing API with a strict p99 requirement, sized to expected peak concurrency) and a poor fit for genuinely sporadic, unpredictable traffic (provisioning for a rare burst means paying for idle warm capacity the rest of the time, which can cost more than the occasional cold start it's avoiding). Increasing the timeout costs nothing extra in Lambda pricing itself (billing is by actual execution duration either way), but it doesn't solve the latency problem — it just avoids one specific symptom (timeout errors) while leaving the underlying slow response in place, which may or may not be an acceptable trade-off depending on what the caller actually needs.

## Key Takeaways

- Increasing the timeout doesn't reduce cold-start latency — it only prevents a slow cold start from being terminated as a timeout error.
- Provisioned Concurrency actually eliminates cold starts for its provisioned capacity by keeping environments pre-warmed continuously.
- Provisioned Concurrency is billed continuously for the reserved capacity, making it cost-effective for predictable, latency-sensitive traffic and wasteful for sporadic traffic.
- The two approaches solve different problems: timeout tolerance versus actual latency elimination, and confusing them leads to picking the wrong fix.

## Interview Follow-Up Questions

- How would you size Provisioned Concurrency correctly for a traffic pattern that has a predictable daily peak but is otherwise low-traffic?
- What's the difference between Provisioned Concurrency and Lambda SnapStart, and when would each be the better fit?
- How would you detect, from CloudWatch metrics alone, whether a function's tail latency problem is actually cold-start-driven versus something else entirely?

## References

- [AWS: Configuring provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [AWS: Lambda function timeout](https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html)
- [AWS: AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
