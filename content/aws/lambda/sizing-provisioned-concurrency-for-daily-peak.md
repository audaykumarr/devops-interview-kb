---
id: aws-lambda-sizing-provisioned-concurrency-daily-peak-001
title: "How would you size Provisioned Concurrency for a Lambda function with a predictable daily peak but otherwise low traffic?"
category: aws
subcategory: lambda
technologies:
  - aws
  - lambda
difficulty: intermediate
question_type:
  - practical
tags:
  - aws
  - lambda
  - cost-optimization
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Lambda function has a predictable daily peak (say, a batch window or a business-hours traffic spike) but is otherwise low-traffic the rest of the day. How would you size Provisioned Concurrency for this pattern, given that flat, 24/7 provisioned capacity would waste money during the low-traffic hours?

## Short Answer

Use Application Auto Scaling's scheduled scaling for Provisioned Concurrency, sized from actual observed concurrency during the peak window (via CloudWatch's `ConcurrentExecutions` metric), so provisioned capacity ramps up shortly before the known peak and back down afterward — rather than either provisioning flat 24/7 (wasteful) or leaving it at zero and eating cold starts during the peak (defeats the purpose).

## Detailed Explanation

**Measure actual peak concurrency, don't guess**: CloudWatch's `ConcurrentExecutions` metric for the function, examined over the peak window across several representative days, gives the real number to provision for — sizing from a guess (or from request-rate-per-minute divided by average duration, which undercounts if duration varies) risks either under-provisioning (still eating cold starts at the very peak) or over-provisioning (paying for capacity never used).

**Scheduled scaling via Application Auto Scaling**: Provisioned Concurrency supports being managed by Application Auto Scaling, which includes scheduled scaling actions — defining a schedule that raises Provisioned Concurrency to the measured peak level shortly before the known peak window starts, and lowers it back down (to zero, or a low baseline) once the window ends, directly matches capacity to the predictable pattern instead of provisioning flat.

**Add lead time before the peak, not exactly at it**: since Provisioned Concurrency takes a short time to actually initialize the provisioned execution environments after the scaling action is triggered, scheduling the scale-up to happen several minutes before the peak actually starts (not exactly at the peak's start time) ensures capacity is genuinely warm and ready when real traffic arrives, rather than the scale-up itself still being in progress during the first minutes of the peak.

**Consider target-tracking scaling as a complement for peak-shape uncertainty**: if the peak's exact timing shifts day to day (not perfectly fixed), combining scheduled scaling (for the predictable baseline shift) with target-tracking scaling (which reactively adjusts Provisioned Concurrency based on actual utilization) gives resilience against the peak not landing exactly on schedule, at the cost of somewhat more complex configuration than scheduled scaling alone.

**Re-validate sizing periodically, not just once**: traffic patterns drift over time (organic growth, seasonal changes, a marketing campaign) — periodically re-checking the `ConcurrentExecutions` data against the current scheduled scaling configuration catches a peak that has grown past the originally-sized provisioned level, which would otherwise silently reintroduce cold starts during what's supposed to be the protected window.

## Key Takeaways

- Size Provisioned Concurrency from actual observed `ConcurrentExecutions` during the peak window, not a guess.
- Application Auto Scaling's scheduled scaling raises and lowers Provisioned Concurrency around the known peak, avoiding flat 24/7 provisioning.
- Schedule the scale-up with lead time before the peak actually starts, since provisioning takes a short time to warm up.
- Combine with target-tracking scaling if the peak's exact timing varies, and re-validate sizing periodically as traffic patterns drift.

## Interview Follow-Up Questions

- How would you handle a traffic pattern with two distinct daily peaks of different sizes, rather than one?
- What would you monitor to catch it if the scheduled scale-up window itself becomes misaligned with the actual peak over time?
- How would you decide between scheduled scaling alone versus adding target-tracking scaling as a complement, for a specific workload?

## References

- [AWS Lambda: Managing concurrency for a Lambda function](https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html)
- [AWS: Application Auto Scaling for Lambda provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
