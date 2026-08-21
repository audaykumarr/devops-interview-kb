---
id: monitoring-alerting-multi-window-burn-rate-explained-001
title: "How does multi-window burn-rate alerting actually work mathematically — what does \"burn rate\" mean precisely?"
category: monitoring
subcategory: alerting
technologies:
  - sre
  - prometheus
difficulty: advanced
question_type:
  - conceptual
tags:
  - slo
  - burn-rate
  - alerting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Multi-window, multi-burn-rate alerting is the standard recommended way to alert on SLO error-budget consumption. What does "burn rate" actually mean mathematically, and how do the multiple windows work together?

## Short Answer

Burn rate is the ratio of your *actual* current error rate to the error rate your error budget would allow if spent evenly across the whole SLO window — a burn rate of 1 means you're spending budget exactly on pace to use it all by the end of the period; a burn rate of 10 means you're spending it 10x faster than sustainable, exhausting the whole budget in a tenth of the time. Multi-window alerting evaluates burn rate over both a short window (catching fast, severe burns quickly) and a longer window (confirming the burn is sustained, not a brief blip), requiring both to breach their thresholds before alerting — this combination catches real problems fast while avoiding false alarms from short-lived spikes.

## Detailed Explanation

**Burn rate, precisely**: if your SLO is 99.9% success rate over a 30-day window, your error budget is 0.1% of requests over that period. Burn rate is the ratio: (actual error rate over some observation window) ÷ (error rate implied by evenly spending the whole budget over the full SLO period). A burn rate of 1 means the current error rate exactly matches "spend the budget evenly across 30 days" — sustainable, using exactly 100% of budget by the period's end if it continues at this rate. A burn rate of 10 means the current error rate is 10x that sustainable pace — at this rate, the entire 30-day budget would be exhausted in 3 days (30 days ÷ 10).

**Why a single window isn't enough**: alerting on burn rate over just one window forces an uncomfortable trade-off. A short window (say, 5 minutes) reacts fast to a real problem but is noisy — a brief spike easily produces a high momentary burn rate that self-corrects before it matters, causing false alarms. A long window (say, 6 hours) is stable and avoids false alarms from brief spikes, but reacts too slowly to a genuinely severe, fast-burning problem — by the time a 6-hour window's average catches a severe issue, a large fraction of the budget may already be gone.

**How multi-window solves this**: instead of choosing one window, alert only when **both** a short window and a longer window simultaneously show an elevated burn rate above some threshold. A common pattern (from Google's SRE workbook) uses something like a 5-minute window combined with a 1-hour window for a fast, high-severity alert (both must show a high burn rate, e.g. 14x, confirming the problem is both happening right now and has been sustained long enough to be real, not a single noisy data point), paired with a separate, lower-urgency alert combining longer windows (e.g. 6-hour and 3-day) at a lower burn-rate threshold (e.g. 6x) for a slower, more sustained budget drain that's still worth knowing about even though it's not acute.

**The practical effect**: this combination lets you page immediately on a fast, severe burn (short window confirms "right now," longer window confirms "this isn't just noise") while not paging on brief, self-correcting spikes (which wouldn't sustain long enough to also breach the longer window's threshold) — directly solving the single-window trade-off by requiring corroboration from two different timescales before treating something as alert-worthy.

## Key Takeaways

- Burn rate is the ratio of actual error rate to the sustainable rate implied by spending the error budget evenly across the whole SLO period.
- A burn rate of 1 is sustainable pace; higher multiples mean the budget would be exhausted proportionally faster.
- A single alerting window forces a trade-off between fast reaction and false-alarm avoidance — short windows are noisy, long windows are slow.
- Multi-window alerting requires both a short and a longer window to simultaneously breach their thresholds, catching real fast-burning problems quickly while filtering out brief, self-correcting spikes.

## Interview Follow-Up Questions

- How would you choose the specific burn-rate thresholds and window pairs for a service with a different SLO period than 30 days?
- What's the relationship between the short window's threshold and how much error budget you're willing to lose before the alert fires?
- How would you implement multi-window burn-rate alerting concretely in Prometheus alerting rules?

## References

- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
