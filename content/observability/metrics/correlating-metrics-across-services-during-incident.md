---
id: observability-metrics-correlating-across-services-during-incident-001
title: "During an incident spanning multiple services, how would you quickly correlate metrics across them to find where the problem actually originates?"
category: observability
subcategory: metrics
technologies:
  - prometheus
  - grafana
difficulty: advanced
question_type:
  - scenario
  - practical
tags:
  - observability
  - incident-response
  - metrics
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A latency spike is visible in a customer-facing API's dashboard, but that API calls four downstream services, any of which could be the actual source. Each has its own dashboard. Manually flipping between four separate dashboards trying to spot which one's graph shape matches the timing of the customer-facing spike is slow and error-prone. How would you approach correlating metrics across services faster during a live incident?

## Short Answer

The fastest approach combines two things: a pre-built, unified dashboard that overlays the key RED metrics for the customer-facing service and all its direct dependencies on the same time axis (so visual correlation is immediate rather than requiring manual dashboard-switching), and — if trace data is available — using a single trace from the affected time window to see exactly which downstream call in the request path actually accounted for the added latency, which is a far more direct answer than visual graph-matching across separate dashboards.

## Detailed Explanation

Manually cross-referencing separate dashboards is slow specifically because it requires a human to hold multiple time-series shapes in memory and mentally align them — the fix is either eliminating that manual alignment step (a unified dashboard) or bypassing metrics-based correlation entirely in favor of a mechanism that directly attributes latency to a specific downstream call (distributed tracing). Both are investments made *before* an incident, not something to build live during one.

**Use a pre-built, unified "service map" or "golden signals" dashboard, if one exists, as the first stop**: a dashboard designed in advance to overlay the customer-facing service's RED metrics alongside each direct dependency's RED metrics on the same time axis lets a human visually spot which downstream service's graph shape actually matches the timing of the customer-facing spike, in seconds rather than minutes of dashboard-switching.

**If distributed tracing is instrumented, pull a specific trace from the affected time window directly**: rather than inferring correlation from separately-viewed metric graphs, a single trace spanning the customer-facing request through all its downstream calls directly shows which specific span accounted for the added latency — this is a fundamentally more precise answer than visual metric correlation, since it's showing the actual causal request path, not just two graphs that happen to have similar shapes around the same time.

**If no unified dashboard or tracing exists, use a consistent, synchronized time range across the manually-checked dashboards**: at minimum, ensuring every dashboard being checked is locked to the exact same time window (rather than each one defaulting to "last hour" independently, which can subtly misalign) reduces the chance of missing a genuine correlation due to a visual-alignment mistake under time pressure.

**Check for a shared, single point of failure across multiple "affected" services, rather than assuming a linear call-chain cause**: if several downstream services all show a spike simultaneously, that pattern itself is a clue — it may point toward a shared dependency (a common database, a shared cache, a network segment) rather than any one of the visibly-affected services being the actual root cause, which changes where the investigation should actually focus next.

**Treat this as a preparedness investment, and measure whether it's working**: build and maintain the unified cross-service dashboard, ensure distributed tracing is actually instrumented and its UI is fast to query by time range, and establish the habit (via incident review) of asking "how long did it take to find the actual source" after every multi-service incident, using that as the signal for whether this tooling investment is paying off or needs more work.

## Key Takeaways

- Manual dashboard-switching to visually correlate metrics across services is slow specifically because it requires a human to hold and align multiple time-series shapes from memory.
- A pre-built unified dashboard overlaying the affected service and its direct dependencies' RED metrics eliminates the manual-alignment step — but has to be built before the incident, not during it.
- Distributed tracing, when instrumented, gives a more direct and precise answer than metric correlation — a single trace shows the actual causal path, not just correlated timing.
- Multiple simultaneously-affected downstream services can indicate a shared dependency as the real root cause, rather than any one of them individually.

## Interview Follow-Up Questions

- How would you design and maintain the unified cross-service dashboard so it stays accurate as the service's dependency graph changes over time?
- What's the relationship between distributed traces and structured logs — should trace IDs actually be injected into log lines, and why does that matter for this exact scenario?
- How would you retrofit distributed tracing into a system that doesn't have it yet, specifically to improve this cross-service correlation capability?

## References

- [OpenTelemetry: Distributed Tracing](https://opentelemetry.io/docs/concepts/signals/traces/)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
