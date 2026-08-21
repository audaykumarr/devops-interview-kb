---
id: aws-lambda-synthetic-load-test-bursty-cold-starts-001
title: "How would you design a synthetic load test to reproduce and measure Lambda's bursty cold-start pattern before it shows up in production?"
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
  - load-testing
  - cold-start
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The bursty-traffic cold-start pattern (many concurrent invocations needing many simultaneous execution environments) is hard to catch with typical steady-state load testing. How would you design a synthetic test to actually reproduce and measure it before it shows up in production?

## Short Answer

Design the load test to send a genuine concurrency spike — many requests arriving within a very short window, not a gradually ramping rate — specifically targeting a function that's been idle long enough beforehand to have no warm environments, and measure the full distribution (not just average) of response latencies during that spike specifically, since the cold-start-affected tail is exactly what a simple average would hide.

## Detailed Explanation

**Steady-state or gradually-ramping load tests don't reproduce this pattern**: many load testing approaches ramp traffic up gradually (increasing request rate over minutes) — this gives Lambda time to scale up execution environments incrementally, generating few concurrent cold starts at any single moment, which doesn't reproduce the specific "50 concurrent requests arrive simultaneously, none of them have a warm environment available" scenario that causes the worst bursty cold-start impact.

**Design for a genuine concurrency spike, not a rate ramp**: the test needs to send a burst of concurrent requests within a very short window (seconds, not minutes) — deliberately simulating the "sudden fan-out" scenario, using a load-testing tool capable of firing many requests near-simultaneously rather than at a steady, predictable rate.

**Start from a genuinely cold state**: the function under test needs to have had no recent invocations for long enough that any previously-warm environments have been recycled — running the spike test against a function that was just invoked moments ago (with warm environments already available) wouldn't reproduce the cold-start-heavy scenario at all; deliberately waiting (or using a dedicated test function with no other traffic) before firing the burst ensures the test actually exercises the cold path.

**Measure the full latency distribution, not just the average**: an average latency across a burst of requests, where most eventually succeed reasonably fast but a meaningful tail hits multi-second cold-start delays, can look deceptively acceptable if you only look at the mean — capturing and reporting the full distribution (specifically p95, p99, and max) during the burst window directly surfaces the tail impact that's the actual concern, rather than being hidden by a moderate average.

**Vary the burst size to find the actual concurrency-scaling behavior**: testing multiple burst sizes (10, 50, 100, 500 concurrent requests) reveals how the cold-start-affected tail latency changes as concurrency grows, and can surface Lambda's own account/function-level concurrency limits being hit at higher burst sizes — a separate, additional failure mode (throttling) worth distinguishing from cold-start latency specifically, since both can degrade the observed distribution but require different fixes.

**Repeat the test to confirm consistency, not just a single run**: a single burst test result could be influenced by transient AWS-side factors — running the burst test multiple times (with cooldown periods between runs to return to a cold state) builds confidence the observed pattern is a consistent, real characteristic of the function's behavior, not a one-off anomaly.

## Key Takeaways

- Reproduce the bursty pattern with a genuine concurrency spike (many near-simultaneous requests), not a gradually ramping load, since ramping gives Lambda time to scale up incrementally.
- Ensure the function is genuinely cold (no recent invocations) before firing the burst, or the test won't exercise the cold-start-heavy scenario at all.
- Measure the full latency distribution (p95/p99/max), not just the average, since the cold-start-affected tail is exactly what an average would obscure.
- Vary burst size to observe how tail latency scales with concurrency, and watch for throttling as a separate, distinguishable failure mode at higher burst sizes.

## Interview Follow-Up Questions

- What load-testing tools would you actually use to generate a genuine near-simultaneous concurrency spike, rather than a rate ramp?
- How would you distinguish cold-start-driven tail latency from concurrency-throttling in your test results?
- How would you use this test's results to decide on an appropriate Provisioned Concurrency sizing?

## References

- [AWS: Understanding AWS Lambda cold starts](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [AWS: Lambda function scaling](https://docs.aws.amazon.com/lambda/latest/dg/invocation-scaling.html)
