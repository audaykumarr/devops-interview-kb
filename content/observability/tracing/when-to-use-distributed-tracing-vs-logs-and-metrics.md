---
id: observability-tracing-logs-metrics-traces-when-001
title: "You already have logs and metrics for your services. When does it actually become worth investing in distributed tracing, and what problem does it solve that the other two don't?"
category: observability
subcategory: tracing
technologies:
  - opentelemetry
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - observability
  - tracing
  - logs
  - metrics
  - opentelemetry
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A team already has centralized logging and a metrics/alerting stack. When does it actually become worth investing in distributed tracing on top of that, and what specific problem does tracing solve that logs and metrics don't?

## Short Answer

Tracing earns its cost once a single user request routinely crosses more than one or two services, because logs and metrics can each tell you *that* something is slow or erroring somewhere, but neither can natively show you *which specific hop* in a multi-service call chain is responsible for a given request's latency or failure — that's a correlation problem across services that tracing solves structurally, by propagating one trace ID through the whole request path.

## Detailed Explanation

Logs, metrics, and traces answer different questions, and the difference matters most as system topology grows:

- **Metrics** answer "is something wrong, and how bad, in aggregate, over time" — they're cheap, always-on, great for dashboards and alerting, but they're aggregated by design and can't tell you about one specific request.
- **Logs** answer "what happened, in detail, at one point" — rich per-event detail, but each service's logs are only aware of that service's own view. Correlating a slow user request across five services means either manually stitching timestamps or already having a shared request ID threaded through every log line by convention.
- **Traces** answer "where, along this specific request's path across services, did the time go or the error originate" — a trace is a tree of spans, each span representing one unit of work (an HTTP call, a DB query, a queue publish) tagged with a shared trace ID, so a single request's full cross-service timeline is reconstructible directly, not inferred.

In a monolith, or a system where a request touches exactly one service, tracing adds little over well-structured logs — there's no cross-service correlation problem to solve. The value shows up specifically in distributed systems: microservices, service meshes, anything where one inbound request fans out into several downstream calls. At that point, "which of these six services added the 800ms" is exactly the question logs and metrics individually can't answer directly, but a trace answers by construction — you look at the trace, see which span is long or errored, and you're already looking at the right service and the right code path, no cross-referencing required.

Adoption is easiest to justify with a concrete before/after: teams that lack tracing typically resolve multi-service incidents by manually correlating timestamps across each service's logs, or by adding ad hoc request-ID logging conventions that only cover what someone remembered to thread through. Tracing replaces that manual correlation with a structural guarantee — as long as every hop propagates the trace context, the full path is reconstructible without any cross-referencing effort at incident time. The main adoption cost is instrumentation consistency: a trace that breaks at the first uninstrumented service is only as useful as the coverage up to that point, so the practical rollout path is starting with the highest-value, highest-fan-out request path rather than trying to instrument every service at once.

## Key Takeaways

- Metrics show that something's wrong in aggregate; logs show detail at one point; traces show a specific request's path across services — they're complementary, not competing.
- Tracing's value is proportional to how many services a typical request crosses; it adds little in a single-service system.
- Partial, inconsistent tracing coverage undermines trust in the tool more than having no tracing at all — instrument the highest-value path first.
- OpenTelemetry plus W3C Trace Context is the standard way to avoid vendor lock-in and ease incremental rollout.

## Interview Follow-Up Questions

- How does trace sampling (head-based vs. tail-based) affect whether tracing actually catches the incidents you care about?
- How would you retrofit distributed tracing into a system with no existing context propagation, without a big-bang migration?
- What's the relationship between traces and structured logs — should trace IDs be injected into log lines, and why?

## References

- [OpenTelemetry: Observability primer](https://opentelemetry.io/docs/concepts/observability-primer/)
- [W3C Trace Context specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry: Distributed tracing](https://opentelemetry.io/docs/concepts/signals/traces/)
