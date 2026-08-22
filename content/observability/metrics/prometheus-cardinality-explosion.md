---
id: observability-metrics-prometheus-cardinality-explosion-001
title: "A Prometheus instance's memory usage keeps growing and query performance is degrading — how do you diagnose a cardinality explosion?"
category: observability
subcategory: metrics
technologies:
  - prometheus
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - observability
  - prometheus
  - metrics
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Prometheus instance's memory usage has been steadily climbing for weeks, and query latency (especially for dashboards) has gotten noticeably worse. No obvious single cause stands out. How do you determine whether this is a cardinality explosion — too many unique time series — and find which metric(s) are actually responsible?

## Short Answer

Query Prometheus's own `prometheus_tsdb_head_series` metric to confirm the total active series count is genuinely growing over time (confirming the cardinality hypothesis), then use `topk` against `count by (__name__)({...})` (or the `/api/v1/status/tsdb` endpoint's cardinality stats, which directly ranks metrics and label combinations by series count) to identify exactly which metric names and label combinations are contributing the most series — cardinality problems are almost always concentrated in a small number of specific metrics with an unbounded or high-cardinality label (a user ID, a request ID, a raw URL path).

## Detailed Explanation

Prometheus's memory usage scales directly with the number of unique time series (a unique combination of metric name and label values) it's actively tracking — a "cardinality explosion" means some metric is generating far more unique label combinations than intended, usually from a label that should never have been used as a label at all.

## Symptoms

- Prometheus memory usage grows steadily over time, without a corresponding intentional increase in monitored infrastructure.
- Query latency, especially for dashboards aggregating across many series, degrades noticeably.
- `prometheus_tsdb_head_series` (Prometheus's own metric for its currently active series count) shows sustained growth.

## Possible Causes

- A label using a high-cardinality or effectively unbounded value — a user ID, a request/trace ID, a raw (non-templated) URL path, a timestamp, or any other value with many-to-unlimited distinct values — attached to a metric, multiplying that metric's series count by however many distinct values that label takes on.
- A new application or metrics exporter was deployed with a label design that wasn't reviewed for cardinality risk before rollout.
- An existing, previously-bounded label's actual value range grew over time (e.g., a label based on customer ID as the customer base grew), gradually pushing what was once fine into a genuine cardinality problem.

## Investigation Steps

**Confirm the trend with Prometheus's own self-monitoring metric**: querying `prometheus_tsdb_head_series` over the growth period directly confirms whether active series count is genuinely climbing, ruling in (or out) cardinality growth as the actual explanation before investigating further.

**Rank metric names by series count to find the concentrated source**: `topk(10, count by (__name__)({__name__=~".+"}))` (or Prometheus's `/api/v1/status/tsdb` endpoint, which directly reports the top metrics and label names by cardinality contribution) identifies which specific metric(s) are responsible — cardinality problems are almost always dominated by one or a small number of offending metrics, not spread evenly across everything.

**For the identified metric, find which specific label is driving the cardinality**: examining the actual label set on the offending metric (via `/api/v1/status/tsdb`'s label-cardinality breakdown, or manually inspecting a sample of that metric's series) reveals which label has an unexpectedly large number of distinct values — this is almost always the actual root cause, once identified.

**Check when the growth started, and correlate against deployment history**: if the series count growth has a clear inflection point, correlating that timestamp against recent deployments or metric-exporter changes often directly identifies which specific change introduced the problematic label.

## Resolution

Remove or redesign the offending label — either drop it entirely if it isn't genuinely needed for the metric's purpose, or replace a high-cardinality raw value with a bounded, categorical one (a URL path template like `/users/:id` instead of the raw path with the actual ID embedded, a status/tier category instead of a raw customer ID). For values that genuinely need to be queryable per-instance (a specific user's activity, for instance), that data belongs in logs or traces, which are designed for high-cardinality data, rather than in metrics, which are not. Confirm the fix by watching `prometheus_tsdb_head_series` stabilize or decline after the offending metric's label is corrected and old series eventually age out.

## Key Takeaways

- Cardinality explosion means too many unique time series (metric name + label value combinations), and Prometheus memory usage scales directly with that count.
- `prometheus_tsdb_head_series` confirms the trend; `topk`/`/api/v1/status/tsdb` cardinality stats identify exactly which metric and label are responsible.
- Cardinality problems are almost always concentrated in one or a few specific metrics with a high-cardinality label (user ID, raw URL, request ID), not spread evenly.
- High-cardinality per-entity data belongs in logs or traces, which are designed for it — not in metrics, where each unique value multiplies stored series count.

## Interview Follow-Up Questions

- How would you design a review process to catch a high-cardinality label before it ships to production, rather than discovering it after the fact?
- What's the difference in how this problem manifests for Prometheus versus a metrics backend designed for higher cardinality, like a dedicated time-series database with different storage characteristics?
- How would you set up an alert on cardinality growth itself, to catch a regression early rather than waiting for memory/performance symptoms to appear?

## References

- [Prometheus: Instrumentation Best Practices — Do not use labels for high cardinality dimensions](https://prometheus.io/docs/practices/instrumentation/#do-not-use-labels-to-store-dimensions-with-high-cardinality)
- [Prometheus: TSDB status API](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats)
