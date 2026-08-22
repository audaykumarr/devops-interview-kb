---
id: monitoring-metrics-dashboards-rate-vs-increase-001
title: "A dashboard using rate() on a counter metric shows a value that doesn't match what you'd expect from doing the math manually. What's actually going on, and when should you use rate() versus increase()?"
category: monitoring
subcategory: metrics-and-dashboards
technologies:
  - prometheus
difficulty: intermediate
question_type:
  - comparison
  - practical
tags:
  - monitoring
  - prometheus
  - promql
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You have a Prometheus counter metric tracking total requests. A dashboard panel using `rate(requests_total[5m])` shows a number that doesn't match what you'd naively expect from just doing "requests now minus requests 5 minutes ago, divided by 300 seconds." What's actually going on, and when should you use `rate()` versus `increase()`?

## Short Answer

`rate()` calculates the per-second average rate of increase over the given window, automatically handling counter resets (like an application restart, which zeroes the counter) — it's not simply "difference divided by time," it's a more careful calculation that also extrapolates slightly at the edges of the window based on the actual sample spacing, which is why it can look different from a naive manual calculation. `increase()` gives you the total increase over the window (essentially `rate() * window_seconds`), which is more intuitive for "how many requests happened in this period" but is built on the same underlying counter-reset-aware logic as `rate()`.

## Detailed Explanation

Prometheus counters are monotonically increasing values that reset to zero on process restart — this reset behavior is exactly what makes naive "value now minus value then" calculations unreliable, and why `rate()` and `increase()` exist as purpose-built functions rather than expecting users to do this arithmetic manually.

**`rate()` computes a per-second average rate over the window, with counter-reset detection**: internally, it looks at the samples within the specified window, detects any point where the value decreased (interpreting that as a counter reset rather than a real decrease, since counters shouldn't decrease), and adjusts the calculation accordingly rather than producing a nonsensical negative rate — this is exactly the behavior a naive manual calculation wouldn't replicate, and is one reason `rate()`'s output can differ from what you'd compute by hand from just two data points.

**`rate()` also extrapolates at the edges of the window**: because Prometheus samples are taken at discrete intervals (the scrape interval) rather than continuously, the actual first and last samples within your query window rarely land exactly on the window's boundaries — `rate()` extrapolates slightly to estimate the rate across the full requested window based on the available sample spacing, which is another source of difference from a simple two-point manual calculation, and is generally the statistically more correct behavior, not a bug.

**`increase()` is essentially `rate() * window_seconds`**, giving you a total-count-over-the-period answer rather than a per-second rate — more intuitive when what you actually want to know is "how many requests happened in the last hour" rather than "what's the current per-second request rate," but it inherits the same underlying counter-reset handling and extrapolation behavior as `rate()`.

**Practical guidance on window size**: `rate()`'s window should generally be at least 4x your scrape interval, to ensure enough actual samples fall within the window for a statistically meaningful calculation — a `rate()` window too close to (or smaller than) your scrape interval can produce noisy or misleading results, since there may be very few actual data points to calculate from.

**Never apply `rate()` to a gauge**: `rate()` is specifically designed for counters (monotonically increasing values) — applying it to a gauge (a value that can go up or down, like current memory usage) produces a meaningless result, since the counter-reset detection logic assumes monotonic increase, an assumption a gauge doesn't satisfy.

## Key Takeaways

- `rate()` isn't a naive "difference divided by time" — it detects and correctly handles counter resets (process restarts) and extrapolates slightly at window edges based on actual sample spacing.
- `increase()` gives a total count over the window (essentially `rate() * window_seconds`), more intuitive for "how many events happened," while sharing the same underlying reset-handling logic.
- Use a `rate()` window at least 4x your scrape interval, so enough actual data points fall within it for a statistically meaningful calculation.
- Never apply `rate()` (or `increase()`) to a gauge — they're specifically designed for monotonically increasing counters, and the counter-reset logic doesn't apply meaningfully to values that can decrease normally.

## Interview Follow-Up Questions

- How would you debug a `rate()` calculation that looks suspiciously different from your manual expectation, to confirm whether it's a counter reset or something else?
- What's the difference between `rate()` and `irate()`, and when would you use each?
- How does `rate()`'s behavior change if your scrape interval is inconsistent (some scrapes delayed or missed)?

## References

- [Prometheus Docs: Query functions — rate()](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus Docs: Metric types — Counter](https://prometheus.io/docs/concepts/metric_types/#counter)
