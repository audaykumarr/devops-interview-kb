---
id: observability-metrics-red-vs-use-methodology-001
title: "What's the difference between the RED and USE monitoring methodologies, and which resources should each actually be applied to?"
category: observability
subcategory: metrics
technologies:
  - prometheus
difficulty: intermediate
question_type:
  - comparison
tags:
  - observability
  - metrics
  - sre
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team is setting up dashboards for both their request-serving services and their underlying infrastructure (nodes, disks). RED and USE are two commonly-cited monitoring methodologies for deciding what to measure. What's the actual difference between them, and which one fits which kind of resource?

## Short Answer

RED (Rate, Errors, Duration) is designed for request-driven services — measuring how many requests are happening, how many are failing, and how long they take. USE (Utilization, Saturation, Errors) is designed for resources — measuring how busy a resource is, whether work is queuing up waiting for it, and whether it's producing errors. Applying RED to a service and USE to the infrastructure it runs on gives complementary, non-overlapping coverage of both the request-serving layer and the resource layer underneath it.

## Detailed Explanation

**RED targets anything that serves discrete requests**: Rate (requests per second), Errors (rate of failed requests), Duration (how long requests take, typically as a distribution/percentiles) — this framework is designed for services: an HTTP API, a queue consumer processing messages, a database handling queries. It answers "is this service doing its job well, from the perspective of what it's being asked to do."

**USE targets finite, saturable resources**: Utilization (percentage of time the resource is busy, or percentage of its capacity in use), Saturation (how much work is queued waiting for the resource, beyond what it can immediately handle), Errors (error events specific to that resource) — this framework is designed for infrastructure-level resources: CPU, memory, disk I/O, network interfaces. It answers "is this resource a bottleneck, and how close is it to becoming one."

**The two are complementary because they answer different questions at different layers**: RED tells you whether a service is meeting its callers' needs; USE tells you whether the underlying resources a service depends on are healthy and have headroom. A service can look fine on RED metrics while a USE metric (disk saturation, for instance) is quietly approaching a limit that will soon start affecting RED metrics — which is exactly why comprehensive monitoring typically applies both, at their respective layers, rather than picking one methodology universally.

**Applying RED to infrastructure, or USE to a request-serving service, doesn't fit naturally**: "the rate of CPU" or "the duration of a disk" aren't meaningful RED-style measurements — CPU isn't a discrete request being served, it's a saturable resource, which is exactly USE's domain. Conversely, "the utilization of an HTTP API" is a less natural framing than its request rate, error rate, and latency distribution — matching each methodology to the kind of thing actually being measured is what makes either one useful rather than forced.

**Both feed directly into incident diagnosis by narrowing where to look**: a RED-metric anomaly (latency spike, error rate increase) tells you *that* a service is degraded; correlating it against USE metrics for the resources that service depends on (is the node's CPU saturated, is disk I/O queuing) is often the fastest way to find *why* — this is a common, practical triage pattern combining both methodologies together, not choosing one over the other even within a single incident.

**Neither methodology alone constitutes complete observability**: both are specifically about *what metrics to collect and dashboard as a starting baseline* — they don't replace the need for logs (for detailed root-cause context) or traces (for understanding request flow across services), which answer different kinds of questions RED/USE metrics alone can't.

## Key Takeaways

- RED (Rate, Errors, Duration) fits request-driven services; USE (Utilization, Saturation, Errors) fits finite, saturable infrastructure resources.
- The two are complementary, covering different layers — RED answers "is the service meeting demand," USE answers "is the underlying resource a bottleneck."
- Forcing RED onto infrastructure or USE onto a request-serving service produces awkward, less-meaningful metrics, since each methodology matches a specific kind of monitored thing.
- Combining both is a common, effective incident-triage pattern: a RED anomaly signals degradation, correlating against USE metrics for dependent resources often reveals the cause.

## Interview Follow-Up Questions

- How would you design dashboards that combine both RED (for a service) and USE (for its underlying node/resources) in a way that makes correlation during an incident fast?
- What's the relationship between RED metrics and the SLIs typically used for SLO-based alerting?
- How would you apply USE methodology to a resource that doesn't map cleanly onto Utilization/Saturation/Errors, like a distributed cache?

## References

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Brendan Gregg: The USE Method](https://www.brendangregg.com/usemethod.html)
