---
id: observability-metrics-metrics-vs-logs-vs-traces-boundaries-001
title: "A team wants to log every value they'd normally track as a metric, reasoning logs give more detail. What breaks when metrics and logs' roles get confused?"
category: observability
subcategory: metrics
technologies:
  - prometheus
difficulty: intermediate
question_type:
  - conceptual
tags:
  - observability
  - metrics
  - logging
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team decides to stop maintaining separate Prometheus metrics for request counts and durations, reasoning that they already log every request with its duration, and can compute the same aggregates from logs instead — "more detail, same information." What actually breaks with this substitution, and why do metrics and logs serve genuinely different purposes despite apparent overlap?

## Short Answer

Metrics are pre-aggregated, fixed-cost, and designed for continuous real-time querying (dashboards refreshing every few seconds, alerting evaluating every 15-30 seconds) — computing the equivalent aggregate from logs means running a query over raw log volume every time, which is dramatically more expensive and slower at scale, making real-time dashboards and fast alerting impractical if logs are the only source. Logs give per-event detail metrics don't, but that detail comes with a storage and query-cost structure that doesn't scale the same way for the "give me the current error rate" question metrics answer natively and cheaply.

## Detailed Explanation

**Metrics are pre-aggregated at write time — the cost is paid once, not per query**: a Prometheus counter incrementing on each request has already done its "aggregation" work by the time you query it — computing `rate(http_requests_total[5m])` is a cheap operation over compact, already-aggregated time-series data, regardless of how many actual requests occurred in that window.

**Deriving the same rate from logs means scanning raw events every single time the question is asked**: computing "requests per second over the last 5 minutes" from log data means querying and counting individual log lines matching a pattern, every time a dashboard refreshes or an alert rule evaluates — at meaningful request volume, this is orders of magnitude more expensive (in both compute and query latency) than reading a pre-aggregated metric, and gets worse as volume grows, exactly opposite of how metrics behave.

**This directly breaks real-time dashboards and fast, reliable alerting**: a dashboard panel or alert rule that needs to evaluate every 15-30 seconds against a metrics backend works fine at that cadence; the same query pattern against raw log data, at any meaningful log volume, either becomes prohibitively expensive to run that frequently, or is simply too slow to complete within the evaluation interval — this is the concrete, practical failure mode of trying to substitute logs for metrics' actual job.

**Logs genuinely provide something metrics structurally can't: per-event, arbitrarily-detailed context**: a metric is, by design, a small number derived from many events — it can't tell you about one specific problematic request's full details (its exact input, its specific error message, its user ID) the way a log line for that individual event can. This is exactly the complementary strength logs have that metrics don't, which is why the substitution reasoning ("logs have more detail, so they're strictly better") gets the actual trade-off backwards — the detail comes at a fundamentally different cost structure, not for free.

**The correct model keeps both, each doing the job it's actually suited for**: metrics for continuous, cheap, real-time aggregate questions (current error rate, current latency percentile, current traffic volume) that drive dashboards and alerting; logs for detailed, per-event investigation once an alert (driven by metrics) has already told you *that* something is wrong and roughly *where* to look — trying to make one signal type do both jobs sacrifices real capability in at least one direction.

## Key Takeaways

- Metrics are pre-aggregated at write time, making real-time aggregate queries (dashboards, alerting) cheap and fast regardless of underlying event volume.
- Deriving the same aggregate from raw logs requires scanning events at query time, which is dramatically more expensive and slower, especially at meaningful volume and query frequency.
- This directly breaks the "fast, frequent evaluation" requirement that real-time dashboards and reliable alerting both depend on.
- Logs provide per-event, arbitrarily-detailed context metrics structurally can't — the two are complementary, each suited to a genuinely different kind of question, not substitutes for each other.

## Interview Follow-Up Questions

- How would you use exemplars (a feature linking a specific metric data point to a specific trace) to bridge the gap between "metrics tell you something's wrong" and "logs/traces tell you exactly why"?
- What's the actual cost difference in practice between a Prometheus query and an equivalent Elasticsearch/log-based aggregation query, at realistic production volume?
- How would you design a system that needs both fast alerting and rich per-event detail, using metrics and logs together rather than trying to pick just one?

## References

- [Prometheus: Overview](https://prometheus.io/docs/introduction/overview/)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
