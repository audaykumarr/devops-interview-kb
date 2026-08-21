---
id: sre-error-budgets-choosing-window-length-001
title: "How would you choose the rolling window length for an error budget — 7 days, 30 days, or 90 days — and what does that choice actually trade off?"
category: sre
subcategory: error-budgets
technologies:
  - sre
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - sre
  - slo
  - error-budget
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An error budget is measured over some rolling window — commonly 7, 30, or 90 days. How would you choose the right window length for a given service, and what does that choice actually trade off?

## Short Answer

A shorter window (7 days) makes the budget react and reset quickly — a bad incident's effect on the budget fades fast, which keeps the signal responsive to recent behavior but means a team can "forget" a recent incident faster and the budget is noisier week to week. A longer window (90 days) smooths out noise and reflects a more stable, longer-term reliability trend, but a bad incident's effect lingers much longer (a budget-exhausting event early in the quarter keeps constraining releases for the rest of it), and the signal reacts more slowly to genuine, recent improvement or degradation.

## Detailed Explanation

The core trade-off is responsiveness versus stability, and it plays out in a few concrete ways:

**Incident memory**: with a 7-day window, an incident's contribution to the budget calculation rolls off after a week — the team gets a relatively fast "clean slate" even after a bad event, which can be good (not permanently punished for one bad day) or bad (less lasting pressure to actually fix the root cause, since the budget pressure itself fades quickly). With a 90-day window, the same incident's effect lingers for the full quarter, keeping sustained pressure on the team to actually address the root cause (since the budget stays constrained until the window rolls past it), at the cost of a single bad event potentially constraining releases for months even after the actual problem is fixed.

**Noise versus signal**: a short window is more sensitive to normal week-to-week variance — a single unusually bad day can swing a 7-day window's burn rate dramatically, sometimes looking like a crisis that's actually just normal variance concentrated in a small sample. A longer window averages over more data, smoothing out that noise and giving a more stable read on the service's actual underlying reliability trend, at the cost of being slower to reflect a genuine, recent change (either a real improvement or a real new problem).

**Alignment with business/release cadence**: the window length is often chosen to align with something meaningful to the organization — a 30-day window aligning with monthly planning/reporting cycles, a 90-day window aligning with quarterly business reviews, giving the SLO's reporting cadence a natural rhythm that matches how the organization already thinks about time. A 7-day window fits a team that ships frequently and wants fast feedback tightly coupled to recent releases specifically.

**Practical default**: 30 days is the most common default in practice — long enough to smooth out meaningful noise and give a genuinely stable signal, short enough that incident memory doesn't linger unreasonably long, and it aligns naturally with monthly reporting rhythms most organizations already have. Shorter windows suit teams wanting fast feedback tightly coupled to very recent releases; longer windows suit services where a slow-moving, stable reliability trend matters more than reacting quickly to a single incident.

## Key Takeaways

- Shorter windows (7 days) react and reset quickly — fast feedback and quick "clean slate" after an incident, but noisier and less sustained pressure to fix root causes.
- Longer windows (90 days) smooth out noise into a stable trend but let a single incident's effect linger and constrain the budget for much longer.
- Window length is often chosen to align with organizational reporting rhythms (monthly, quarterly), not chosen purely on statistical grounds.
- 30 days is the most common practical default, balancing noise reduction against reasonable incident memory.

## Interview Follow-Up Questions

- How would you handle a service that genuinely needs both fast feedback and long-term trend visibility — could you track multiple windows simultaneously?
- How does window length interact with the multi-window burn-rate alerting approach discussed for SLO alerting specifically?
- What would you do if the organization's release cadence and the chosen SLO window length are meaningfully mismatched?

## References

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
