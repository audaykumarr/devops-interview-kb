---
id: aws-lambda-tuning-hedge-request-delay-001
title: "How would you tune a hedge-request delay so it targets genuine cold-start tail latency without firing on every normal request?"
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
  - hedging
  - latency
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A hedged-request pattern fires a second attempt if the first hasn't responded within some delay. How would you tune that delay so it actually targets the rare, slow cold-start cases specifically, without doubling load by firing on every normal, fast request?

## Short Answer

Set the hedge delay based on a high percentile (commonly p95 or p99) of the service's normal, warm-request latency distribution — a delay set there means the hedge almost never fires for a normal request (since by definition only the slowest 1-5% of normal requests exceed that threshold), while it fires promptly once a request is taking meaningfully longer than typical, which is exactly the profile of a cold start.

## Detailed Explanation

**Anchor the delay to the observed normal-latency distribution, not a guess**: the hedge delay's entire purpose is distinguishing "this specific request is taking unusually long" from "this is just normal request latency" — that distinction only makes sense relative to what normal actually looks like for this specific service, measured from real production data (or realistic load testing), not an arbitrary round number picked without reference to actual behavior.

**p95 or p99 of warm-request latency is the standard anchor point**: setting the hedge delay at the p95 (or p99, for a more conservative/less-frequently-firing choice) of the service's *warm* request latency means, by construction, only the slowest 5% (or 1%) of otherwise-normal requests would trigger a hedge unnecessarily — a small, controlled, and predictable rate of "unnecessary" hedges, versus a threshold set too low (closer to median latency) that would fire on a much larger fraction of entirely normal requests, defeating the point of targeting the rare tail specifically.

**Distinguish "warm" latency specifically, not overall latency including cold starts**: since cold starts are exactly what you're trying to hedge against, computing the percentile from *overall* latency (cold starts included) would inflate the threshold, making the hedge fire less often than intended, including missing some genuine cold starts that fall just under an inflated threshold — the percentile calculation should be scoped to warm-request latency specifically, requiring the ability to distinguish cold from warm requests in your latency data (via a cold-start indicator in logs/metrics, which many Lambda monitoring setups can provide).

**Account for the specific traffic pattern's variability**: a service with highly consistent, low-variance warm latency can use a tighter threshold (closer to p95) confidently; a service with more naturally variable warm latency (due to varying payload sizes, downstream dependency variability) might need a more conservative p99 threshold to avoid firing on legitimate-but-slower-than-typical normal requests, since a tighter threshold on a more variable distribution would catch more false positives.

**Revisit the threshold periodically as the service's latency profile evolves**: a threshold tuned against today's warm-latency distribution can become miscalibrated as the service's actual behavior changes (a code change affecting typical latency, a change in typical payload size) — treating this as a value to periodically re-measure and re-tune, not a one-time setting, keeps the hedge targeting genuinely accurate over the service's lifetime.

## Key Takeaways

- Anchor the hedge delay to a high percentile (p95/p99) of the service's own warm-request latency distribution, measured from real data, not an arbitrary guess.
- p95/p99 thresholds mean only a small, predictable fraction of normal requests trigger an unnecessary hedge, by construction.
- Compute the percentile from warm-request latency specifically, excluding cold starts, or the threshold gets inflated and misses genuine cold-start cases.
- Revisit and re-tune the threshold periodically as the service's actual latency profile evolves over time.

## Interview Follow-Up Questions

- How would you distinguish cold-start from warm-request latency in your metrics/logs to compute this percentile accurately?
- What would you do for a service with highly variable payload sizes, where "normal" latency itself varies a lot request to request?
- How would you monitor whether the hedge threshold is still well-calibrated over time, without manually re-checking it constantly?

## References

- [AWS Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS: Understanding AWS Lambda cold starts](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
