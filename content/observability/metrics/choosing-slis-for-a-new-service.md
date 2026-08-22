---
id: observability-metrics-choosing-slis-for-new-service-001
title: "How would you choose the right SLIs for a new service, rather than defaulting to generic latency and error rate for everything?"
category: observability
subcategory: metrics
technologies:
  - prometheus
difficulty: advanced
question_type:
  - architecture
  - scenario
tags:
  - observability
  - sli
  - sre
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team defaults to "latency and error rate" as the SLIs for every new service, regardless of what the service actually does. For a request-serving API this is a reasonable default, but for an asynchronous batch-processing service, or a service whose main job is data freshness, generic latency/error-rate SLIs don't actually capture what users care about. How would you choose SLIs that genuinely reflect a specific service's real user-facing quality?

## Short Answer

Start from what users of the service actually experience and care about — not from a generic template — and pick SLIs that would directly reflect a degradation a user would notice. For a request-serving API, that's often genuinely latency/availability; for a batch/async system, it's more likely to be freshness (how stale is the data/how delayed is processing) and completeness (did the expected work actually get done); for a data pipeline, correctness (is the output actually right) may matter more than either speed metric.

## Detailed Explanation

A generic latency/error-rate template is a reasonable default only when the service's actual value to its users genuinely is speed and success — for many services it isn't, and the SLI design work is specifically about identifying what actually is.

## Requirements

- The chosen SLIs must reflect what the service's actual users/consumers experience, not what's easiest to measure.
- SLIs should directly correlate with real user-facing degradation — an SLI that can look fine while users are actually unhappy (or vice versa) isn't doing its job.
- The SLI set should be small and focused (a handful, not dozens) to remain genuinely actionable for SLO-based alerting.

## Architecture

**Start from the user's actual experience of the service, not a generic metrics template**: the right question is "what would a user of this specific service notice going wrong?" — for a request-serving API, a slow or failed response is directly noticed; for a batch job that runs nightly, a user doesn't notice individual request latency at all, but would very much notice if this morning's report reflects yesterday's data instead of today's, or if some records were silently dropped.

**Freshness/staleness is often the right SLI for asynchronous and batch systems**: measuring "how old is the most recently processed data" (or "how long since the last successful run completed") as an SLI directly captures the actual user-facing concern for a system whose value depends on timely processing, in a way that a latency percentile for individual processing steps wouldn't — a batch job that's individually fast per-record but runs infrequently enough to produce stale results has a freshness problem invisible to a latency-only SLI.

**Completeness/correctness matters distinctly from speed for data-oriented systems**: an SLI measuring "percentage of expected records successfully processed" or "percentage of output that passes a correctness check" captures a failure mode entirely orthogonal to latency — a pipeline that runs fast but silently drops or corrupts a fraction of records is failing its users in a way no latency or even error-rate metric (if the dropped records don't produce an explicit error) would necessarily catch.

**Availability still matters for non-request-driven services, just measured differently**: "is the service doing its job at all" translates for a batch system into something like "did the expected scheduled run actually happen and succeed," which is conceptually similar to availability but measured against expected execution rather than expected request handling.

**Combine multiple SLIs when a single one doesn't capture the full picture, but keep the set deliberately small**: a batch pipeline might reasonably need both a freshness SLI and a completeness SLI, since either one alone misses a real failure mode the other catches — but resist the temptation to track many SLIs "just in case," since a sprawling SLI set becomes hard to reason about and dilutes focus on the ones that actually matter for alerting and error-budget decisions.

## Trade-offs

Non-standard SLIs (freshness, completeness) are often harder to instrument than latency/error-rate, which most frameworks and libraries expose with minimal effort — this upfront instrumentation cost is worth paying specifically because a mismatched SLI (measuring something easy that doesn't reflect real user impact) provides false confidence, which is arguably worse than no SLO at all, since it creates a sense of "this is being monitored" without the monitoring actually catching real problems.

## Key Takeaways

- Start SLI selection from what the service's actual users/consumers would notice degrading, not from a generic latency/error-rate template applied universally.
- Freshness/staleness is often the right SLI for asynchronous or batch systems, where individual processing latency doesn't reflect the real user-facing concern.
- Completeness/correctness captures a failure mode (silently dropped or corrupted data) that latency and even simple error-rate metrics can miss entirely.
- Keep the SLI set small and deliberately chosen — a sprawling set of "just in case" SLIs dilutes focus rather than improving coverage.

## Interview Follow-Up Questions

- How would you instrument a completeness SLI for a data pipeline, in terms of what data you'd actually need to compare against what?
- How would you set an SLO threshold for a freshness SLI, given "how stale is too stale" depends heavily on what the data is used for downstream?
- How would this SLI selection approach change for a service that's a hybrid — partially request-driven, partially batch/async?

## References

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
