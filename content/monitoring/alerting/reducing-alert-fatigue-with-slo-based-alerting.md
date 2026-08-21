---
id: monitoring-alerting-slo-based-alerting-001
title: "Your on-call team is getting paged 40+ times a week and starting to ignore alerts. How would you redesign the alerting strategy to fix that without missing real incidents?"
category: monitoring
subcategory: alerting
technologies:
  - prometheus
  - monitoring
difficulty: advanced
question_type:
  - architecture
  - practical
tags:
  - alerting
  - slo
  - alert-fatigue
  - observability
estimated_time_minutes: 10
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Your on-call team is getting paged more than 40 times a week, most of them not requiring real action, and people have started treating pages as noise. How would you redesign the alerting strategy to cut that down without missing real incidents?

## Short Answer

Move from threshold-based alerting on individual metrics (CPU over 80%, one failed health check, a single slow request) to SLO-based alerting on user-facing symptoms (error rate and latency against an agreed budget), using multi-window burn-rate alerts so pages fire only when the error budget is actually being consumed fast enough to matter — and demote everything else to a dashboard or a low-urgency ticket instead of a page.

## Detailed Explanation

The 40-pages-a-week problem almost always traces back to alerting on causes instead of symptoms: CPU, memory, disk, and individual health-check failures are all one or more steps removed from whether a user is actually affected, and most of the time they self-correct or don't matter — a brief CPU spike that never touches latency shouldn't wake anyone up. SLO-based alerting inverts this: it alerts on the thing that actually matters (are users experiencing errors or slowness right now, relative to how much of that we've agreed is acceptable) and treats everything upstream of that as diagnostic detail, not a paging trigger on its own.

The reason burn-rate alerting specifically (rather than just "alert when error rate exceeds X%") matters is that a fixed error-rate threshold has the same false-positive problem as any other static threshold — a brief blip crosses it and pages immediately. Burn rate ties the alert to the actual budget: a short burst that would only consume a trivial fraction of the 30-day error budget isn't worth paging over, even if it technically crosses an error-rate number, because at that rate the SLO isn't actually at risk.

## Requirements

- Reduce page volume enough that on-call actually trusts and responds to every page, without increasing time-to-detect for real incidents.
- Distinguish "something is technically abnormal" from "users are actually being affected right now" — most of the 40+ weekly pages are almost certainly the former.
- Any alert that fires as a page needs a clear, actionable response — "just acknowledge and go back to sleep" is itself a sign the alert shouldn't be a page.

## Assumptions

- The team has (or can define) a small number of Service Level Objectives for their most important services — e.g. 99.9% of requests succeed, p99 latency under some threshold — even if not formalized yet.
- Prometheus/Alertmanager or an equivalent metrics + alerting stack is already in place; this is a redesign of alerting strategy, not a new tooling adoption.

## Architecture

The core shift is from cause-based alerting (CPU, memory, individual failed checks — things that are one layer removed from user impact and often self-correct or don't matter) to symptom-based alerting tied to an SLO (error rate and latency, which directly reflect what users experience). Every service gets a small number of SLOs; every SLO has an error budget (e.g. 0.1% of requests over 30 days for a 99.9% availability target); alerts fire based on the *burn rate* of that budget — how fast it's being consumed relative to what would exhaust it — rather than on any single metric crossing a static threshold.

Multi-window burn-rate alerting (the approach popularized by Google's SRE workbook) uses two time windows together: a short window (e.g. 5 minutes) to catch fast, severe burns quickly, and a longer window (e.g. 1 hour) to confirm the short-window spike is real and sustained, not a brief blip. A page fires only when both windows agree that the budget is burning fast enough to threaten the SLO within a meaningful timeframe — this structurally filters out the single-minute blips and self-resolving hiccups that make up most noisy pages, while still catching real incidents quickly because a genuine outage burns budget fast in both windows simultaneously.

Everything that doesn't meet that bar — elevated CPU that hasn't affected latency, a single pod restart, a transient error rate uptick that self-resolves in under a minute — gets routed to a dashboard, a low-urgency Slack notification, or a ticket for daytime investigation, not a page. The goal isn't to stop *tracking* those signals, it's to stop treating all of them as equally urgent.

## Components

- SLO definitions per service (availability and latency targets, expressed as an error budget over a rolling window).
- Recording rules computing burn rate at multiple time windows from raw request metrics.
- Multi-window burn-rate alert rules in Alertmanager (or equivalent), tuned so short+long window agreement is required for a page.
- A clear routing tier: page (SLO burn-rate breach), low-urgency notification (approaching budget exhaustion, worth investigating soon), dashboard-only (raw infrastructure metrics, useful for root-causing a page but not a trigger on their own).
- A regular review process (weekly or per-incident) auditing which alerts actually fired, whether they were actionable, and adjusting thresholds/routing based on real data rather than guessing once and leaving it.

## Trade-offs

- SLO-based alerting requires more upfront design work (defining SLOs, setting error budgets, building burn-rate recording rules) than just alerting on raw thresholds — the investment pays off in signal quality, not in initial setup speed.
- Multi-window burn-rate alerting trades a small amount of detection latency (waiting for the longer window to confirm) for a large reduction in false positives — for most incidents this tradeoff is clearly worth it, but for the most latency-sensitive failure modes it's worth explicitly checking that the short window alone still catches genuinely severe, fast-burning incidents fast enough.
- Moving infrastructure metrics (CPU, memory, disk) off paging entirely means real infrastructure problems need another path to visibility (dashboards, capacity planning review) — they shouldn't just disappear, they should stop being page-worthy on their own while remaining visible for investigation and trend analysis.

## Failure Scenarios

- An SLO is set too loosely (error budget too generous), so genuine user-impacting degradation doesn't burn budget fast enough to page — mitigated by validating SLOs against actual user expectations and past incidents, not picking round numbers arbitrarily.
- A dependency failure causes budget to burn slowly across many services simultaneously without any single one crossing its burn-rate threshold — mitigated by also having service-level dependency health visibility, not relying purely on burn-rate alerts to catch every failure mode.
- The review process for tuning alerts doesn't actually happen regularly, and the new system quietly degrades back into noise over months — mitigated by making the alert-quality review a standing calendar item with a real owner, not a one-time setup step.

## Security

Alert fatigue itself is a security-relevant problem beyond just operational noise — an on-call team trained to reflexively acknowledge and dismiss pages is measurably slower to recognize and respond to a genuine security incident that happens to first appear as an alert. Reducing noise to a trustworthy signal-to-noise ratio is a security control, not just an operational nicety.

## Scalability

SLO-based, burn-rate alerting scales cleanly as services are added — each new service defines its own SLO and gets the same multi-window burn-rate pattern, rather than needing bespoke threshold-tuning per service the way raw metric alerting often accumulates over time. It also scales down page volume specifically as the organization grows, which is the opposite of what pure threshold-based alerting tends to do (more services and more metrics usually means more noisy alerts, not fewer).

## Cost Considerations

The primary cost is engineering time to define SLOs and build the recording/alert rules — not additional infrastructure spend, since this reuses existing metrics rather than requiring new collection. The return is largely in reduced incident response cost (faster real detection, less wasted on-call time and burnout) rather than a direct dollar saving, though burnout-driven attrition and slower real-incident response both have real, if harder-to-quantify, costs.

## Real-World Approach

1. Pick the two or three most important services and define SLOs for them first (availability and latency), rather than trying to SLO everything at once.
2. Build burn-rate recording rules and multi-window alerts for those services, and run them alongside (not instead of) the existing alerts for a trial period to compare.
3. Once confidence is established, cut over paging to the SLO-based alerts for those services and demote the old threshold alerts to dashboard-only.
4. Expand to additional services incrementally, using the same pattern.
5. Establish a recurring alert-quality review (e.g. weekly) that looks at every page from the prior period and asks whether it was actionable — use that data to keep tuning rather than treating the initial setup as final.

## Common Mistakes

- Defining an SLO once and never revisiting it as traffic patterns or user expectations change.
- Using only a single alerting window (just the short one, or just the long one) instead of requiring both to agree, reintroducing either false positives or slow detection.
- Removing infrastructure-level metrics from visibility entirely instead of just removing them from the paging path.
- Treating this as a one-time project instead of an ongoing practice — noisy alerts tend to creep back in as new services and metrics get added without going through the same discipline.

## Interview Follow-Up Questions

- How would you set an initial SLO for a service that has no historical data to base it on?
- How does multi-window burn-rate alerting actually work mathematically — what does "burn rate" mean precisely?
- How would you handle an SLO breach caused by a shared dependency affecting multiple services at once?

## Key Takeaways

- Alert fatigue is usually a symptom of cause-based (metric-threshold) alerting instead of symptom-based (user-impact/SLO) alerting.
- Multi-window burn-rate alerting filters out noise by requiring both a fast and a sustained signal before paging.
- Infrastructure metrics still matter — they should stay visible for investigation, just not trigger pages on their own.
- This needs to be an ongoing practice with regular review, not a one-time redesign.

## References

- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Prometheus docs: Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Google SRE Book: Practical Alerting](https://sre.google/sre-book/practical-alerting/)
