---
id: observability-metrics-designing-structured-logging-001
title: "How would you design a structured logging convention for a service, so logs are actually usable for debugging production incidents?"
category: observability
subcategory: metrics
technologies:
  - logging
difficulty: intermediate
question_type:
  - architecture
tags:
  - observability
  - logging
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A service currently logs free-text strings (`logger.info("Processing order " + orderId + " for user " + userId)`), which are painful to search and filter during an incident. You're designing a structured logging convention to replace this. What would the design actually include, beyond just "use JSON instead of plain text"?

## Short Answer

Structure isn't just the format (JSON versus plain text) — it's a consistent schema of fields present on every log line (a timestamp, log level, service name, and crucially a set of consistent, queryable context fields like `order_id`/`user_id` as separate structured fields rather than embedded in a message string), plus consistent field naming across the whole service (and ideally the whole organization) so the same concept is always queryable under the same field name, and correlation identifiers (a request ID, and ideally a trace ID) present on every log line touched by a given request.

## Detailed Explanation

The gap between "JSON logs" and "genuinely useful logs" is entirely in the design discipline applied on top of the format — consistent schema, consistent naming, and correlation identifiers are what actually determine whether a specific incident's related log lines can be found with one query or require manual reconstruction.

## Requirements

- Every log line must carry enough structured context to be filtered and correlated without parsing free text.
- Field names for the same concept (a user identifier, a request identifier) must be consistent across the whole service, ideally the whole organization, so queries don't need to account for naming variation.
- Every log line related to a single request/operation must be correlatable to every other log line for that same request, across the service (and ideally across service boundaries).
- The convention must be practical enough that developers actually follow it consistently, not something that gets abandoned under deadline pressure.

## Architecture

**Structured format (JSON, or a similar machine-parseable format) is the baseline, but only the starting point**: switching from free-text to JSON logging is necessary but not sufficient — a JSON log line with an unstructured message field and no consistent context fields is barely more useful than plain text for actual filtering and correlation.

**A consistent base schema applies to every log line, regardless of what generated it**: `timestamp`, `level`, `service`, `environment`, and typically a `message` (still human-readable, but now just one field among several, not the entire payload) form the baseline every log line includes — this baseline alone makes basic filtering (all errors from this service, in this environment, in this time range) possible without any special per-call-site effort.

**Domain-specific context fields need consistent naming across the codebase**: rather than one code path logging `order_id` and another logging `orderId` or `order-id` for the same concept, establishing (and enforcing, via linting or code review convention) consistent field naming means a single query (`order_id: "12345"`) reliably finds every relevant log line, regardless of which part of the codebase generated it — naming inconsistency is one of the most common, avoidable ways structured logging still ends up hard to search in practice.

**A request/correlation ID (and ideally a distributed trace ID) is present on every log line touched by handling one request**: propagating a single identifier through every function, every downstream call, and every log statement involved in processing one request means you can pull every log line related to a specific problematic request with one query — this is the single highest-value field for actual incident debugging, since most real investigations start from "this specific request/user had a problem" and need every related log line, not just the one that happened to log an error.

**Logging structured context as separate fields, not embedded in the message string, is what actually makes filtering possible**: `log.info("order processed", order_id=12345, user_id=678)` (context as structured fields) versus `log.info(f"order {order_id} processed for user {user_id}")` (context baked into a string) — the first is filterable/queryable directly on `order_id`; the second requires string-parsing or regex to extract the same information, which is exactly the pain structured logging is meant to eliminate.

## Trade-offs

Enforcing a consistent field-naming convention and correlation-ID propagation requires real discipline across a codebase (and ideally tooling/linting support, since manual convention alone tends to drift over time) — this upfront design and enforcement cost is what actually determines whether the resulting logs are genuinely useful during a 2am incident, or just JSON-formatted versions of the same unstructured pain. Teams that skip the naming-consistency and correlation-ID propagation work, treating "switched to JSON" as the whole solution, often don't get the full value structured logging is capable of providing.

## Key Takeaways

- Structured format (JSON) is necessary but not sufficient — the real value comes from a consistent base schema, consistent field naming, and correlation IDs.
- Consistent field naming across the entire codebase (not just within one file) is what makes a single query reliably find every relevant log line.
- A propagated request/correlation ID on every related log line is the single highest-value addition for actual incident debugging.
- Context belongs in structured fields, not embedded in a message string — embedding it defeats the purpose of structuring the log in the first place.

## Interview Follow-Up Questions

- What's the relationship between distributed traces and structured logs — should trace IDs actually be injected into log lines, and why?
- How would you enforce field-naming consistency across a large, multi-team codebase without becoming an unreasonable bottleneck on every PR?
- How would you retrofit this convention into an existing, large codebase currently full of free-text logging, without a disruptive big-bang rewrite?

## References

- [OpenTelemetry: Logs](https://opentelemetry.io/docs/concepts/signals/logs/)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
