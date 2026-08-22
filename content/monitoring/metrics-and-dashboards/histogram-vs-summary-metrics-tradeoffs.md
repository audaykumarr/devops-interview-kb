---
id: monitoring-metrics-dashboards-histogram-vs-summary-001
title: "You need to track request latency percentiles across your fleet. When would you use a Prometheus Histogram versus a Summary metric type, and why can't you just average a Summary's percentiles across instances?"
category: monitoring
subcategory: metrics-and-dashboards
technologies:
  - prometheus
difficulty: advanced
question_type:
  - comparison
tags:
  - monitoring
  - prometheus
  - latency
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You want to track and alert on request latency percentiles (like p95, p99) across a fleet of service instances. Prometheus offers both Histogram and Summary metric types for this. When would you use each, and why is it specifically wrong to average a Summary metric's percentiles together across multiple instances?

## Short Answer

Use Histogram in almost all cases: it records observations into configurable buckets, and because those buckets are aggregatable across instances (you can sum bucket counts from many instances and then calculate an accurate percentile across the whole fleet), Histograms support exactly the kind of fleet-wide percentile queries you actually need. Summary calculates precise percentiles client-side, per instance, but those pre-calculated percentiles are mathematically meaningless to average or combine across instances — averaging percentiles isn't the same as calculating the percentile of the combined underlying data, which is why Summary is the wrong choice whenever you need to aggregate across more than one process.

## Detailed Explanation

The core issue is a specific, common statistical mistake: percentiles don't average correctly. If instance A's p99 latency is 100ms and instance B's p99 latency is 200ms, the actual p99 latency across both instances combined is not necessarily 150ms — it depends entirely on the full underlying distribution of raw observations from both instances, which averaging the two pre-calculated percentile values simply doesn't capture.

**Summary calculates percentiles client-side, at the point of observation**: each instance running a Summary metric computes its own precise percentile values (using a sliding time window) locally, and only exposes those already-calculated percentile values to Prometheus for scraping — this is precise per-instance, but by the time Prometheus sees the data, the underlying raw observations are gone, replaced by already-computed summary statistics that can't be meaningfully recombined.

**Histogram instead exposes bucket counts** (how many observations fell into each configured latency bucket, e.g. "≤10ms," "≤50ms," "≤100ms," and so on) rather than pre-calculated percentiles — because these are just counts, they're straightforwardly aggregatable: summing "count of requests ≤100ms" across every instance gives you the correct total for the whole fleet, and Prometheus's `histogram_quantile()` function can then calculate an accurate (though bucket-resolution-limited, not perfectly precise) percentile from those combined, correctly-aggregated bucket counts.

**The practical trade-off**: Histogram percentiles are an approximation, limited by your chosen bucket boundaries (a percentile falling between two bucket boundaries is interpolated, not exact), while Summary gives you an exact percentile — but only for a single instance in isolation, which is rarely what you actually want to know ("what's our p99 latency across the whole fleet" is almost always the more useful question than "what's this one instance's p99"). This is why Histogram is the standard recommendation for latency tracking despite being technically less precise per-instance — the aggregatability matters more in practice than per-instance exactness.

**Choosing good bucket boundaries for a Histogram matters**: buckets that are too coarse (too few, too widely spaced) reduce the accuracy of the interpolated percentile; buckets that are too fine-grained increase the cardinality/storage cost (each bucket is effectively its own time series) — a reasonable set of buckets should be chosen based on your actual expected latency distribution, concentrating resolution where your percentiles of interest (p95, p99) are actually likely to fall.

## Key Takeaways

- Percentiles don't average correctly — combining pre-calculated per-instance percentiles from a Summary metric doesn't give you a mathematically valid fleet-wide percentile.
- Histogram exposes aggregatable bucket counts rather than pre-calculated percentiles, letting Prometheus correctly compute a fleet-wide percentile via `histogram_quantile()` after summing counts across instances.
- Histogram trades some per-instance precision (bucket-resolution-limited, interpolated) for correct aggregatability across instances — the trade almost always favors Histogram for real fleet-wide monitoring.
- Choose Histogram bucket boundaries deliberately based on your actual expected latency distribution, concentrating resolution around the percentiles you actually care about.

## Interview Follow-Up Questions

- How would you choose appropriate bucket boundaries for a service with a latency distribution you don't yet have good data on?
- What's the cardinality/storage cost trade-off of adding more Histogram buckets, and how would you balance that against percentile accuracy?
- When, if ever, is Summary actually the right choice over Histogram?

## References

- [Prometheus Docs: Metric types — Histogram and Summary](https://prometheus.io/docs/concepts/metric_types/#histogram)
- [Prometheus Docs: Histograms and summaries](https://prometheus.io/docs/practices/histograms/)
