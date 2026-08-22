---
id: sre-on-call-incident-response-alert-fatigue-001
title: "Your on-call engineers are getting paged 15+ times a week, and they've started treating every page as probably-not-urgent before even looking. How do you fix this?"
category: sre
subcategory: on-call-and-incident-response
technologies:
  - sre
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - sre
  - alerting
  - on-call
  - alert-fatigue
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your on-call engineers are getting paged more than 15 times a week. As a result, they've started treating every page as probably-not-urgent before they've even looked at it — the exact opposite of what a page is supposed to mean. How do you fix this?

## Short Answer

This is a signal-to-noise problem, and the fix is auditing every alert against a real bar — "would a human need to take action on this right now, or can it wait until business hours, or shouldn't it page anyone at all" — then aggressively cutting or downgrading anything that doesn't clear that bar, since the actual danger of alert fatigue isn't the volume itself, it's that it trains people to stop trusting pages, which means the one page that's genuinely critical gets the same delayed, skeptical response as the noise.

## Detailed Explanation

Alert fatigue isn't really a "too many alerts" problem in the abstract — it's a trust problem. A page is supposed to mean "a human needs to act now," and once that stops being reliably true, on-call engineers rationally (if dangerously) start responding slower and more skeptically to every page, including the real ones, because they have no way to distinguish signal from noise without actually investigating each one first.

## Symptoms

- On-call engineers report high page volume and describe most pages as not actually requiring immediate action.
- Response time to pages has been getting slower, or engineers report habitually checking pages "when convenient" rather than immediately.
- Postmortems for genuine incidents sometimes reveal the relevant alert fired but was initially dismissed or delayed, assumed to be more noise.

## Possible Causes

- Alerts are configured on symptoms that don't reliably indicate actual user-facing impact (e.g., paging on a single failed health check rather than a sustained failure rate).
- Alerts lack a severity distinction — everything pages the same way, regardless of whether it's genuinely urgent or something that can wait until business hours.
- Alert thresholds were set once, early on, and never revisited as the system's actual behavior and scale changed.
- Multiple alerts fire for the same underlying root cause (alert storms during a single incident), inflating the perceived page count without representing genuinely distinct problems.

## Investigation Steps

1. Audit every alert that fired over a representative recent period (a month is usually enough), categorizing each as: required immediate human action, didn't require immediate action, or was pure noise/false positive.
2. For each alert configuration, check whether it's actually tied to user-facing impact (an SLO/error-budget-relevant signal) or just an internal system symptom that doesn't necessarily mean users are affected.
3. Identify alerts that commonly fire together during the same incident (alert storming) — these are candidates for consolidation into a single, more informative page rather than several redundant ones.
4. Check whether any alerts are still configured with thresholds from an earlier, different scale or architecture, that may no longer reflect genuinely abnormal behavior.

## Resolution

1. **Cut or downgrade every alert that doesn't require immediate human action** — route "should be looked at eventually" signals to a non-paging channel (a dashboard, a ticket, a daily digest) instead of a page, reserving pages specifically for things that need someone right now.
2. **Tie paging alerts to actual user-facing impact** (SLO burn rate, error-budget-relevant signals) rather than internal system symptoms that don't necessarily correlate with users being affected — this is the same reasoning as the earlier SLO/error-budget discussion, applied specifically to what should page.
3. **Consolidate alert storms into a single incident-level page** where possible, rather than paging separately for every downstream symptom of the same root cause, so on-call sees one clear signal instead of a flood that looks like many separate problems.
4. **Review and re-tune thresholds regularly**, not just once at setup — a threshold that made sense at last year's scale or architecture may be consistently too sensitive (or too loose) today.

## Prevention

- Set an explicit page-volume target (a rough acceptable range per on-call shift) and treat exceeding it as itself an actionable signal requiring alert tuning, not just something to tolerate.
- Require every new paging alert to have a documented answer to "what action should the on-call person take when this fires" before it's enabled — an alert nobody can describe a clear action for is a strong candidate for not paging at all.
- Periodically review alert-to-actual-incident correlation (how often does this alert actually precede or accompany a real user-facing problem) and prune alerts with a poor hit rate.

## Key Takeaways

- Alert fatigue is fundamentally a trust problem, not just a volume problem — the real danger is that it trains on-call engineers to respond slower and more skeptically to every page, including genuine ones.
- Audit every alert against a concrete bar: does it require immediate human action right now? Anything that doesn't clear that bar shouldn't page.
- Tie paging alerts to actual user-facing/SLO-relevant impact, not internal system symptoms that don't necessarily mean users are affected.
- Consolidate alert storms from a single root cause into one clear page, and revisit thresholds regularly rather than treating initial configuration as permanent.

## Interview Follow-Up Questions

- How would you get buy-in from a team that's attached to keeping a specific noisy alert "just in case," despite the data showing it rarely correlates with real incidents?
- How would you measure whether your alert-tuning effort actually improved on-call response quality, not just reduced page count?
- How would you handle the tension between reducing page volume and the risk of cutting an alert that turns out to matter for a rare but serious failure mode?

## References

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
