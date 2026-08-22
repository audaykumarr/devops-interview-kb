---
id: monitoring-metrics-dashboards-cardinality-explosion-001
title: "A team added a 'user_id' label to a metric to debug a specific customer's issue, and now your Prometheus instance is running out of memory and queries are timing out. What happened?"
category: monitoring
subcategory: metrics-and-dashboards
technologies:
  - prometheus
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - monitoring
  - prometheus
  - cardinality
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team added a `user_id` label to an existing request-counter metric, wanting to debug one specific customer's issue more easily. Shortly after, your Prometheus instance starts running out of memory, and queries against completely unrelated metrics start timing out. What happened, and how do you fix it?

## Short Answer

This is a cardinality explosion: every unique combination of label values creates a separate time series internally, and `user_id` (with potentially millions of distinct values) turns one metric into millions of separate time series — each consuming its own memory for indexing and storage, which can overwhelm Prometheus entirely and degrade performance for every other metric sharing the same instance, not just the one that got the new label.

## Detailed Explanation

Prometheus (and most time-series databases with a similar label-based model) stores data as a separate time series per unique combination of metric name and label values — a metric with labels `method` and `status_code` might have a manageable few dozen actual time series (a handful of methods times a handful of status codes), but adding a label with unbounded or very high cardinality (a user ID, a request ID, a raw IP address) multiplies that by however many distinct values that label can take, often by orders of magnitude.

## Symptoms

- Prometheus memory usage spikes and continues climbing after a specific metric change, without a corresponding increase in actual traffic or scrape targets.
- Queries — including ones unrelated to the newly-labeled metric — become slow or start timing out.
- Prometheus may eventually OOM (out-of-memory) crash or become unresponsive entirely.

## Possible Causes

- A label was added to a metric using a value with effectively unbounded cardinality (user ID, request ID, session token, raw IP address, or similar) rather than a bounded set of categorical values (a handful of status codes, environment names, or service names).
- The high-cardinality label was added to an already-high-volume metric (a request counter incremented on every request), multiplying the cardinality problem by the metric's already-high base scrape/ingestion rate.
- Nobody reviewed the change for cardinality impact before deploying it — this is a common gap, since the change looks completely reasonable from an application-code perspective ("just add a label for debugging") without visibility into its systemic cost on the metrics backend.

## Investigation Steps

1. Identify the metric(s) with recently and dramatically increased cardinality — Prometheus itself exposes internal metrics (`prometheus_tsdb_head_series`, and per-metric cardinality can be checked via tools like `promtool` or specific cardinality-analysis queries) that reveal which metric is responsible.
2. Confirm the timing correlation between the cardinality spike and the specific label change (checking recent deployment/config history for the affected metric).
3. Estimate the actual cardinality the new label introduces (how many distinct `user_id` values realistically exist and are actively generating requests) to understand the scale of the problem.
4. Check whether the same instance serves other, unrelated metrics/teams, confirming that the blast radius extends beyond just the team that made the change (which it typically does, since cardinality issues affect the whole TSDB instance's memory, not just the offending metric).

## Resolution

1. **Immediately remove or revert the high-cardinality label** from the metric — this is the fast, direct fix, stopping further cardinality growth from that specific change.
2. **Confirm Prometheus recovers** after the offending series stop being actively written to (existing high-cardinality series will eventually age out per your retention configuration, though this can take time depending on retention settings).
3. **Redesign the actual debugging need differently**: if the team genuinely needs to debug a specific customer's issue, that's usually better served by structured logging or tracing (which are designed for high-cardinality, per-request data) rather than metrics (designed for aggregatable, bounded-cardinality data) — logs/traces can carry a `user_id` without the same systemic cost, since they're not stored as continuously-indexed time series the way metrics are.
4. **Consider `exemplars`** (a Prometheus feature linking specific metric data points to a trace ID) if the actual goal was connecting an aggregate metric spike to specific request-level detail — this achieves the debugging goal without embedding high-cardinality data directly into the metric's labels.

## Prevention

- Establish a clear team convention (and ideally automated linting/review) distinguishing what belongs in metric labels (bounded, categorical values) from what belongs in logs or traces (high-cardinality, per-request identifiers).
- Set up cardinality monitoring/alerting on your metrics backend itself, so an unexpected cardinality spike from any team's change is caught quickly, before it degrades the shared instance for everyone.
- Document and share this specific failure mode with engineering teams, since "add a label for easier debugging" is an intuitive, easy mistake to make without visibility into its systemic cost.

## Key Takeaways

- Cardinality explosion happens because each unique combination of label values becomes a separate time series — a high-cardinality label (user ID, request ID) can multiply one metric into millions of series.
- The blast radius extends beyond the offending metric — a shared Prometheus instance's memory and query performance degrade for everyone, not just the team that added the label.
- High-cardinality, per-request debugging data belongs in logs or traces, not metric labels — metrics are designed for bounded, aggregatable dimensions.
- Prometheus exemplars can link an aggregate metric to a specific trace for debugging, achieving the same goal without embedding high-cardinality data in labels.

## Interview Follow-Up Questions

- How would you set up automated cardinality monitoring/alerting to catch this kind of issue before it causes an outage?
- What's an example of a label that seems reasonable but is actually a hidden high-cardinality risk?
- How would you recover a Prometheus instance that's already in a bad state (OOMing repeatedly) due to an existing cardinality explosion?

## References

- [Prometheus Docs: Instrumentation Best Practices](https://prometheus.io/docs/practices/instrumentation/#do-not-overuse-labels)
- [Grafana: Cardinality is key](https://grafana.com/blog/2022/10/20/how-to-manage-high-cardinality-metrics-in-prometheus-and-kubernetes/)
