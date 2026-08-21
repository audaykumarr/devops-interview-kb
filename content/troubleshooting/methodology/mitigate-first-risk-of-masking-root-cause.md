---
id: troubleshooting-methodology-mitigate-first-masking-risk-001
title: "How do you balance \"mitigate first\" against the risk that a rollback or failover masks the real problem, letting it recur later?"
category: troubleshooting
subcategory: methodology
technologies:
  - observability
difficulty: intermediate
question_type:
  - conceptual
tags:
  - troubleshooting
  - incident-response
  - methodology
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Prioritizing mitigation (rollback, failover) over full root-cause diagnosis is generally the right call during an active incident — but a mitigation that just makes symptoms go away risks letting the actual root cause resurface later, undetected. How do you balance these two concerns?

## Short Answer

Mitigate first to stop user impact, but treat the mitigation as provisional, not resolution — explicitly commit to a follow-up root-cause investigation (a scheduled postmortem, not just closing the incident once symptoms disappear) and preserve enough diagnostic evidence *during* the incident, before mitigating, that the investigation is actually possible afterward — mitigating without capturing evidence first often means the transient state that would have explained the root cause is gone by the time anyone looks for it.

## Detailed Explanation

The apparent tension resolves once you separate two different timescales: stopping user impact right now (urgent, time-sensitive) and understanding why it happened (important, but not equally time-sensitive in the same way) — mitigating first correctly prioritizes the first without needing to abandon the second, as long as the second is genuinely committed to rather than implicitly dropped once the immediate pressure is off.

**Capture evidence before mitigating, when feasible**: a rollback or failover often changes or destroys the exact state that would explain the root cause — logs specific to the failing version, the exact resource state at the moment of failure, in-flight request traces. Where it's fast and doesn't meaningfully delay mitigation, capturing this evidence (a quick log export, a state snapshot) *before* rolling back preserves the ability to actually investigate afterward — mitigating blind, with no evidence preserved, often means the root cause is genuinely unknowable later, not just harder to find.

**Treat the incident as open until root cause is understood, not just until symptoms stop**: closing an incident the moment mitigation resolves user-facing symptoms, without a committed follow-up, is exactly how "the same problem recurs later" happens — the practice of a mandatory, scheduled postmortem/follow-up investigation (even if it happens hours or a day after the immediate incident, once there's no more time pressure) keeps root-cause understanding from being implicitly abandoned just because the urgency passed.

**Distinguish mitigations that are genuinely safe rollbacks from ones that might reintroduce a different problem**: a rollback to a previously-stable version is usually safe, since that version was known-good before; a mitigation that's more of a workaround (disabling a feature, scaling around a symptom rather than addressing it) carries more risk of just hiding the problem rather than actually resolving the user-facing impact safely — worth being explicit about which category a given mitigation falls into, since it affects how much the team should trust "the incident is over" versus "the symptoms are suppressed."

## Key Takeaways

- Mitigate first for user impact, but treat mitigation as provisional — commit to a genuine follow-up root-cause investigation, not an implicit close-once-symptoms-stop.
- Capture diagnostic evidence before mitigating where feasible, since a rollback/failover often destroys exactly the state that would explain the root cause.
- A mandatory scheduled postmortem/follow-up prevents root-cause investigation from being silently abandoned once the immediate time pressure is gone.
- Distinguish a genuinely safe rollback (to previously-known-good state) from a mitigation that's more of a symptom-suppressing workaround, since they carry different residual risk.

## Interview Follow-Up Questions

- How would you decide how much time to spend capturing evidence before mitigating, when every minute of delay has real user impact?
- What would you do if the postmortem investigation, done properly, never actually identifies a root cause?
- How would you build organizational habits that make the "committed follow-up" actually happen, rather than being skipped once the pressure is off?

## References

- [Google SRE Book: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook: Effective Troubleshooting](https://sre.google/workbook/incident-response/)
