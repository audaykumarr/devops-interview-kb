---
id: observability-metrics-synthetic-vs-real-user-monitoring-001
title: "What's the difference between synthetic monitoring and real user monitoring, and why would you need both rather than just one?"
category: observability
subcategory: metrics
technologies:
  - prometheus
difficulty: intermediate
question_type:
  - comparison
tags:
  - observability
  - monitoring
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A service has real user monitoring (RUM) already instrumented, capturing actual user experience data. A teammate suggests also adding synthetic monitoring — scheduled, artificial probes hitting the same endpoints. Isn't that redundant with data you're already collecting from real users? What does synthetic monitoring actually provide that RUM doesn't?

## Short Answer

RUM only produces data when real users are actually using the service — it has no signal during genuinely low-traffic periods, and it can't detect a problem before real users encounter it. Synthetic monitoring runs on a fixed schedule regardless of actual traffic, giving continuous, predictable coverage (including catching an outage during a low-traffic window, like 3am, before the first real user hits it) and a consistent baseline unaffected by real user variability (different devices, networks, geographic distribution) that can make RUM data noisier to interpret.

## Detailed Explanation

**RUM measures what's actually happening to real users, which is exactly its strength and its limitation**: real user monitoring captures genuine end-user experience — actual load times on actual devices and networks — which is invaluable for understanding real-world performance, but it's entirely dependent on there being real traffic to measure; during a low-traffic window, a genuinely broken service might have RUM data that looks fine simply because too few users have hit it yet to generate a meaningful signal.

**Synthetic monitoring provides continuous, predictable, traffic-independent coverage**: a scheduled probe (hitting a login flow, an API endpoint, a checkout process every minute, say) runs regardless of real traffic — this means a genuine outage during a low-traffic period gets caught by the very next scheduled probe, rather than waiting for the first real user to encounter it and (if RUM is even configured to alert on individual failures, which it often isn't) for that to be noticed.

**Synthetic monitoring gives a clean, controlled baseline unaffected by real-world variability**: RUM data is inherently noisy — it mixes users on fast connections and slow ones, powerful devices and weak ones, different geographic locations with different network paths — synthetic probes run from a consistent, known location/environment, giving a stable baseline that makes genuine service-side regressions easier to detect against, without needing to first account for and filter out real-world variability.

**Synthetic monitoring can proactively test critical user journeys, not just individual endpoints**: a multi-step synthetic check (log in, add an item to cart, complete checkout) validates that an entire critical flow still works end-to-end, which is harder to reliably infer from RUM data alone (which tells you about individual page/request performance but not necessarily that the full journey remains functionally intact) — this is especially valuable for catching a regression in a rarely-used-but-critical path that might not generate enough RUM traffic to surface a problem quickly.

**RUM captures real-world edge cases synthetic monitoring structurally can't**: a synthetic probe, however well-designed, exercises a fixed, predetermined set of paths and conditions — RUM captures the genuine diversity of real usage (unusual browsers, unexpected input combinations, actual user behavior patterns) that a synthetic script simply won't think to test, which is exactly why the two are complementary rather than either one being a strict subset of the other's coverage.

**Together, they cover the gap each one leaves**: synthetic monitoring gives continuous, low-traffic-independent coverage of known-critical paths with a clean baseline; RUM gives genuine, comprehensive real-world coverage but only when and where real traffic actually occurs — using only one means either missing genuine real-world experience data (synthetic-only) or having coverage gaps during low-traffic periods and no clean baseline (RUM-only).

## Key Takeaways

- RUM measures genuine real-user experience but only produces data when real traffic occurs, leaving coverage gaps during low-traffic periods.
- Synthetic monitoring runs on a fixed schedule independent of real traffic, catching outages (including during low-traffic windows) before real users are affected.
- Synthetic probes provide a clean, consistent baseline unaffected by real-world variability, and can validate entire multi-step critical user journeys end-to-end.
- RUM captures genuine real-world diversity and edge cases that a predetermined synthetic script structurally can't anticipate — the two are complementary, not redundant.

## Interview Follow-Up Questions

- How would you decide which specific user journeys deserve synthetic monitoring coverage, given you can't reasonably synthesize every possible real user path?
- How would you set alerting thresholds differently for synthetic monitoring (predictable, low-noise) versus RUM (higher natural variability)?
- How would you use synthetic monitoring specifically to validate a deployment before it reaches real user traffic, as part of a progressive delivery pipeline?

## References

- [Google SRE Workbook: Monitoring](https://sre.google/workbook/monitoring/)
