---
id: observability-tracing-head-based-vs-tail-based-sampling-001
title: "How does trace sampling — head-based versus tail-based — affect whether distributed tracing actually catches the incidents you care about?"
category: observability
subcategory: tracing
technologies:
  - opentelemetry
difficulty: advanced
question_type:
  - comparison
tags:
  - observability
  - tracing
  - sampling
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Collecting every single trace is often too expensive at real production volume, so sampling is necessary. Head-based and tail-based sampling make that decision very differently. How does the choice affect whether tracing actually catches the incidents you'd want it to?

## Short Answer

Head-based sampling decides whether to keep a trace *before* the request even completes (typically a random percentage, decided at the very start) — simple and cheap, but it has no way to know in advance that a request would have been interesting (an error, an unusually slow one), so it discards most of exactly the traces you'd want most often, purely by chance. Tail-based sampling waits until the request completes and decides based on what actually happened (keep it if it errored, or was slow, or matches some other interesting criterion) — directly solving that problem, at the cost of needing to buffer and hold every trace's spans until the request finishes before the keep/discard decision can be made, which is meaningfully more complex and resource-intensive infrastructure.

## Detailed Explanation

**Head-based sampling** makes the sampling decision at the very beginning of a request's trace, typically by a simple probabilistic rule (e.g. "sample 1% of requests"), applied consistently across every service the trace touches (the decision, once made, is propagated so all services agree on whether this particular trace is being sampled). This is simple to implement and cheap to run, since no service needs to hold onto trace data waiting for a final decision — but it has a structural blind spot: the decision is made with zero knowledge of how the request will actually turn out. At 1% sampling, an error that occurs in 0.1% of requests will, on average, only be captured in roughly 1% of *those* error occurrences — meaning the overwhelming majority of the specific traces most valuable for debugging (the ones capturing an actual failure) are simply never kept, purely due to the luck of the random sampling draw, not because they weren't valuable.

**Tail-based sampling** defers the keep/discard decision until *after* the request completes, when the actual outcome (success/failure, actual latency, any other interesting characteristic) is known — meaning the sampling logic can be "keep 100% of traces that errored, keep 100% of traces slower than some threshold, and sample only a small percentage of normal, fast, successful traces." This directly targets what makes a trace valuable in the first place — an incident's actual traces are far more likely to be captured, since the decision is informed by whether something interesting actually happened. The cost: every span from every service involved in a trace needs to be buffered somewhere (typically a collector layer sitting between services and the final storage backend) until the full trace completes and the tail-based decision can be made — this buffering, especially for long-running or high-fan-out requests, requires meaningfully more infrastructure (memory, coordination across a distributed system) than head-based sampling's simple, immediate, stateless decision.

**The practical trade-off**: head-based sampling is simpler and cheaper but systematically under-captures exactly the traces most useful for incident investigation; tail-based sampling directly solves that at real infrastructure and complexity cost. Many production tracing setups use tail-based sampling specifically because the whole point of tracing is investigating exactly the failures/slow-requests that head-based sampling is statistically most likely to miss — a low head-based sampling rate optimized for cost can make tracing nearly useless for exactly the incidents it was adopted to help debug.

## Key Takeaways

- Head-based sampling decides at the start of a request, with no knowledge of the outcome — simple and cheap, but systematically under-captures rare, interesting events like errors purely by chance.
- Tail-based sampling decides after the request completes, informed by the actual outcome — directly targets valuable traces (errors, slow requests) at the cost of needing to buffer all spans until the decision can be made.
- The core trade-off is simplicity/cost (head-based) versus actually capturing the traces you'd want most (tail-based).
- Many production setups favor tail-based sampling specifically because tracing's main value is investigating exactly the rare events head-based sampling is statistically likely to miss.

## Interview Follow-Up Questions

- How would you size the buffering infrastructure tail-based sampling requires for a high-throughput, high-fan-out system?
- Could you combine head-based and tail-based sampling, and what would that hybrid approach look like?
- How does trace sampling interact with cost/storage planning for the tracing backend itself?

## References

- [OpenTelemetry: Sampling](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry Collector: Tail-based sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
