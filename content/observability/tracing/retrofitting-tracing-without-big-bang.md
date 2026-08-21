---
id: observability-tracing-retrofitting-without-big-bang-001
title: "How would you retrofit distributed tracing into a system with no existing context propagation, without a disruptive big-bang migration?"
category: observability
subcategory: tracing
technologies:
  - opentelemetry
difficulty: advanced
question_type:
  - scenario
  - practical
tags:
  - observability
  - tracing
  - migration
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An existing system has dozens of services with no distributed tracing or context propagation at all. Retrofitting it all at once is too risky and slow. How would you introduce tracing incrementally, without a disruptive, all-at-once migration?

## Short Answer

Start with auto-instrumentation on the single highest-value, highest-fan-out request path (not every service at once), let partial coverage coexist with uninstrumented services (a trace that "goes dark" at an uninstrumented hop is still useful for everything before that point), and expand service-by-service from there — prioritizing by where tracing would provide the most debugging value first, rather than treating instrumentation coverage as an all-or-nothing requirement before it's useful at all.

## Detailed Explanation

The instinct to instrument everything before rolling anything out comes from a reasonable-sounding but ultimately mistaken assumption: that a trace is only useful if it's complete end-to-end. In practice, a partial trace — one that correctly shows the first several hops of a request before going dark at an uninstrumented service — is still substantially more useful than no tracing at all, since it still narrows down *where in the known portion* of the request path time is being spent or an error is originating, even if it can't see past the boundary into uninstrumented territory.

**Start with auto-instrumentation on one high-value path**: most modern tracing libraries (OpenTelemetry's auto-instrumentation agents, for common frameworks/languages) can add basic tracing to a service with minimal code changes — often just adding an agent/library and configuration, not rewriting application code. Starting with the single request path that would provide the most debugging value if traced (the one causing the most incident-investigation pain today, or the highest-traffic critical path) gets real value fastest, rather than spreading thin effort across everything simultaneously.

**Propagate context even through not-yet-instrumented services where possible**: even a service that isn't fully instrumented for its own spans can often still forward the incoming trace context headers (`traceparent`, per W3C Trace Context) to whatever it calls downstream, at minimal effort — this keeps the trace "connected" across that hop even without detailed span data for that specific service, which is a meaningfully lower-effort intermediate step than full instrumentation, worth doing broadly even before every service gets its own detailed spans.

**Expand incrementally by priority, not alphabetically or by convenience**: after the first high-value path, prioritize which service to instrument next based on where debugging pain is actually concentrated (frequently-investigated services, services on the critical path for the most incidents) rather than an arbitrary order — this keeps each incremental step delivering real value rather than checking boxes.

**Standardize on OpenTelemetry and W3C Trace Context from the start**: choosing a vendor-neutral standard for both the instrumentation library and the context-propagation format means each service instrumented is a permanent, portable investment regardless of what tracing backend is eventually chosen or changed — avoiding the risk of instrumenting everything against a specific vendor's proprietary format and needing to redo it later.

## Key Takeaways

- A partial trace (correct up to an uninstrumented hop, then dark) is still substantially more useful than no tracing at all — coverage doesn't need to be complete to add real value.
- Start with auto-instrumentation on the single highest-value request path, not a broad simultaneous rollout across every service.
- Even minimal context-propagation forwarding (without full instrumentation) keeps a trace connected across a hop at low effort.
- Standardizing on OpenTelemetry and W3C Trace Context from the start keeps each incremental investment portable regardless of future backend changes.

## Interview Follow-Up Questions

- How would you measure whether the incremental rollout is actually delivering value, to justify continued investment in expanding coverage?
- What would you do about a legacy service that genuinely can't support even minimal context-propagation forwarding?
- How would you handle a service written in a language/framework OpenTelemetry's auto-instrumentation doesn't support well?

## References

- [OpenTelemetry: Getting Started](https://opentelemetry.io/docs/getting-started/)
- [W3C Trace Context specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry: Instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/)
