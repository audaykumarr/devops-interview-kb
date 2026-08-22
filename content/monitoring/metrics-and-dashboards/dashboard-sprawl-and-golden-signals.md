---
id: monitoring-metrics-dashboards-golden-signals-001
title: "Your team has 40 Grafana dashboards, and during the last incident nobody knew which one to actually look at first. How would you fix this dashboard sprawl?"
category: monitoring
subcategory: metrics-and-dashboards
technologies:
  - monitoring
  - grafana
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - monitoring
  - dashboards
  - golden-signals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your team has accumulated over 40 Grafana dashboards over the past couple of years, built up ad hoc as different engineers needed to visualize different things. During your last incident, nobody knew which dashboard to actually check first, and precious time was lost clicking through several before finding the relevant one. How would you fix this dashboard sprawl?

## Short Answer

Establish one canonical, small "golden signals" dashboard per service — covering latency, traffic, errors, and saturation (the four signals Google's SRE book identifies as the minimum set needed to understand a service's health at a glance) — as the deliberate, well-known first stop during any incident, and treat the other 40 dashboards as secondary, specialized tools for deep investigation once the golden-signals dashboard has pointed you in a direction, not as competing "first places to look."

## Detailed Explanation

Dashboard sprawl happens because dashboards are easy to create and nobody's incentivized to prune or consolidate them — each one made sense in isolation when it was built, but the aggregate effect is that there's no longer one obvious place to start, which is exactly the problem that surfaces at the worst possible time: during an active incident, when speed matters most.

**The four golden signals give a principled, minimal starting point**: latency (how long requests take), traffic (how much demand the service is under), errors (rate of failed requests), and saturation (how "full" the service's resources are, e.g. CPU, memory, connection pool usage) — together, these four signals answer "is this service healthy right now, and if not, roughly what kind of problem is it" for the overwhelming majority of services, without needing to know anything about a specific incident in advance.

**One canonical dashboard per service, not per team or per engineer's preference**: the value of "one obvious first place to look" only holds if it's genuinely singular and well-known — multiple competing "main" dashboards (one person's version, another's slightly different version) recreate the same confusion this exercise is meant to solve, so consolidating to one authoritative golden-signals dashboard per service, linked prominently from wherever engineers would naturally look during an incident (a runbook, an alert's linked dashboard, a service catalog), is the actual fix.

**The other 40 dashboards don't need to be deleted, just properly demoted**: specialized dashboards (deep dives into a specific subsystem, a particular team's custom view) still have real value for focused investigation once the golden-signals dashboard has narrowed down roughly what's wrong — the fix isn't eliminating specialized tooling, it's making sure there's a clear, fast, universally-known entry point before anyone needs to reach for the specialized ones.

**Link directly from alerts to the relevant golden-signals dashboard**: an alert firing should ideally link straight to the dashboard showing the service it's about, removing even the small amount of friction of "which dashboard corresponds to this alert" during the exact moment that friction matters most.

**Periodically prune genuinely unused or duplicate dashboards**: separate from establishing the golden-signals dashboard as the entry point, actually reviewing the 40 existing dashboards for ones that are stale, duplicate, or nobody actually uses reduces ongoing confusion and maintenance burden — a lightweight periodic review (checking dashboard view analytics, if your tooling supports it) is enough to catch the most obviously unused ones without needing an exhaustive audit.

## Key Takeaways

- The four golden signals (latency, traffic, errors, saturation) give a principled, minimal, well-established starting point for understanding any service's health at a glance.
- Establish exactly one canonical golden-signals dashboard per service — multiple competing "main" dashboards recreate the same confusion dashboard sprawl already causes.
- Specialized dashboards remain valuable for deep investigation but should be clearly secondary to the canonical entry point, not competing with it.
- Link alerts directly to the relevant golden-signals dashboard, removing friction exactly when speed matters most during an incident.

## Interview Follow-Up Questions

- How would you adapt the four golden signals for a service that doesn't fit the typical request/response model (a batch job, an event-driven consumer)?
- How would you get team buy-in to consolidate around one canonical dashboard when people have existing habits and preferences around their own custom dashboards?
- How would you measure whether this consolidation actually improved incident response time, rather than just assuming it did?

## References

- [Google SRE Book: Monitoring Distributed Systems (The Four Golden Signals)](https://sre.google/sre-book/monitoring-distributed-systems/#xref_monitoring_golden-signals)
