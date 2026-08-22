---
id: observability-metrics-dashboard-design-for-incidents-001
title: "A service's dashboard has 40 panels, and during a real incident nobody can find the signal that actually explains what's wrong. How would you redesign it?"
category: observability
subcategory: metrics
technologies:
  - prometheus
  - grafana
difficulty: intermediate
question_type:
  - practical
tags:
  - observability
  - dashboards
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A service's Grafana dashboard has grown to 40 panels over time, as different engineers added metrics they found individually useful. During a recent incident, the on-call engineer spent several minutes scrolling and squinting at graphs before finding the one panel that actually explained the problem. How would you redesign this dashboard so it's actually useful under incident pressure?

## Short Answer

Design around the RED/USE-style "is something wrong, and roughly where" question first, with a small number of top-level panels answering that immediately — then organize supporting detail into a clear drill-down structure (separate rows or linked dashboards) rather than one flat wall of 40 equally-weighted panels, since under real incident pressure, a person needs to go from "something's wrong" to "here's roughly where" in seconds, not minutes of visual scanning.

## Detailed Explanation

A dashboard optimized for exploratory, unhurried browsing (which is what a 40-panel accretion tends to become) is a fundamentally different design than one optimized for fast triage under pressure — the redesign needs to explicitly prioritize the latter, since that's the actual moment the dashboard needs to work well.

## Symptoms

- The dashboard has accumulated many panels over time, added individually by different people for different reasons.
- During an incident, finding the relevant signal takes noticeably longer than it should.
- Panels have inconsistent time ranges, inconsistent grouping, and no clear visual hierarchy indicating which ones matter most.

## Possible Causes

- Panels were added incrementally by different engineers, each optimizing for their own specific past debugging need, with nobody responsible for the dashboard's overall coherence as a whole.
- No distinction exists between "top-level health signal" panels and "detailed drill-down" panels — everything is visually weighted the same.
- The dashboard was never actually used and refined during a real incident review — nobody asked "did this dashboard help, or did we end up query-ing Prometheus directly instead."

## Investigation Steps

**Identify which panels were actually used during recent real incidents, versus which are unused clutter**: reviewing incident retrospectives (or directly asking the on-call team) for which specific panels were referenced during recent real investigations reveals the small set of genuinely load-bearing panels, versus the larger set nobody actually looks at during a real incident.

**Apply RED/USE as the organizing structure for the top-level view**: a small number of panels at the very top answering "is this service's request handling healthy" (RED: rate, errors, duration) and "are its underlying resources healthy" (USE: utilization, saturation, errors for CPU/memory/disk/network) gives the fastest possible "what's wrong, roughly where" signal, without requiring the viewer to already know which of 40 panels to check.

**Move detailed, investigation-specific panels into a clearly separated drill-down section, not the top-level view**: panels useful for deep investigation of a *specific* already-hypothesized cause (a particular downstream dependency's latency, a specific cache's hit rate) belong below the fold, in a clearly labeled section, or in a linked secondary dashboard — not competing visually with the handful of panels that answer the first, most urgent question.

## Resolution

Redesign the dashboard with a clear top section (RED/USE-derived, small number of panels, immediately answering "is something wrong and roughly where") followed by an explicitly separated drill-down section for detailed investigation — remove or relocate panels that incident review confirms aren't actually used during real triage. Validate the redesign against a subsequent real (or simulated/game-day) incident, watching whether the on-call engineer can actually navigate it faster than the old version, rather than assuming the redesign works based on how it looks when reviewed calmly outside of an incident.

## Key Takeaways

- Design the top-level dashboard view around the fastest possible "is something wrong, roughly where" signal (RED for request handling, USE for underlying resources), not an unstructured accumulation of individually-useful panels.
- Review actual incident history to find which panels were genuinely used during real investigations — this usually reveals the useful set is much smaller than the full panel count.
- Separate detailed, hypothesis-specific drill-down panels from the top-level triage view, so they don't compete visually with the small set that matters first.
- Validate the redesign against a real or simulated incident, not just a calm visual review, since the actual test is whether it's fast to use under pressure.

## Interview Follow-Up Questions

- How would you prevent a redesigned, clean dashboard from gradually accumulating clutter again over the following year?
- How would you design the drill-down structure so it's discoverable during an incident without requiring prior familiarity with where each specific panel lives?
- How would you measure, concretely, whether a dashboard redesign actually improved incident response time, rather than just assuming it did?

## References

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
