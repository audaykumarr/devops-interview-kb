---
id: sre-error-budgets-defining-slo-and-policy-001
title: "How would you go about setting an SLO and error budget for a service that's never had one, and what should actually happen once that error budget runs out?"
category: sre
subcategory: error-budgets
technologies:
  - sre
difficulty: intermediate
question_type:
  - conceptual
  - scenario
tags:
  - sre
  - slo
  - error-budget
  - reliability
estimated_time_minutes: 9
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You're asked to set an SLO and error budget for a service that's never had one formally defined. How would you approach picking the target, and what should actually happen once the error budget is exhausted for a period?

## Short Answer

Start from what users actually need and what the service has historically delivered, not from an arbitrary "five nines" target — pick an SLI that reflects real user experience (e.g. successful-request ratio or latency under a threshold), set the SLO slightly below current real-world performance so it's achievable but meaningful, and derive the error budget as the inverse (100% − SLO) over a rolling window. Once the budget is exhausted, the agreed consequence should be a policy decided in advance — typically freezing risky releases and prioritizing reliability work until the budget recovers — not an ad hoc argument after the fact about whose incident it was.

## Detailed Explanation

The SLO-setting process has a common failure mode: picking a target that sounds impressive (99.99%) without grounding it in either user need or actual historical performance. The right starting point is the SLI (service level indicator) — the specific, measurable signal that represents whether users are having a good experience, like "proportion of requests completing successfully" or "proportion of requests under 300ms." From there, look at what the service has actually delivered over a recent representative window (say, the last 90 days) as a sanity check, and set the SLO (the target value for that SLI, e.g. 99.9%) somewhere that's both meaningfully better than "just barely acceptable to users" and realistically achievable given the service's actual track record and architecture — not aspirational numbers pulled from what a competitor claims.

The error budget falls out mechanically once the SLO is set: if the SLO is 99.9% successful requests over 30 days, the error budget is the remaining 0.1% — a concrete, spendable quantity of acceptable failure. This reframing is the actual value of the exercise: instead of an implicit expectation of zero failures (which makes every incident feel like a violation), the team now has an explicit, pre-agreed amount of unreliability that's fine to spend on things like risky deploys, planned maintenance, or experiments — and a clear signal for when that spending needs to stop.

That signal only means something if the consequence of exhausting the budget is agreed *before* it happens, not negotiated in the moment when it's politically inconvenient. The standard SRE practice is an error budget policy: when the budget for the current window is exhausted, feature launches and non-essential risky changes pause, and the team's priority shifts to reliability work, until the budget recovers (the rolling window ages out the past incidents) or an explicit exception is granted by whoever owns that trade-off (commonly a joint call between the service owner and SRE/reliability lead). Without this policy agreed in advance, error budgets become a reporting metric instead of an actual behavioral lever.

## Key Takeaways

- SLIs should reflect real user experience; SLOs should be grounded in actual historical performance, not an arbitrary aspirational number.
- The error budget is just 100% minus the SLO over the chosen window — a concrete, spendable quantity of acceptable unreliability, not an abstract target.
- The value of an error budget only materializes if there's a pre-agreed policy for what happens when it's exhausted (typically: pause risky changes, prioritize reliability work).
- Setting an SLO without an enforcement policy behind the error budget turns it into a vanity metric instead of a real decision-making tool.

## Interview Follow-Up Questions

- How would you choose the rolling window length (7 days vs. 30 days vs. 90 days) for an error budget, and what does that choice trade off?
- What would you do if a single catastrophic incident burns the entire quarter's error budget in one day — does the policy still apply the same way?
- How do you handle a service with multiple different user-facing SLIs (latency, availability, correctness) that might have conflicting budget states at the same time?

## References

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: Motivation for Error Budgets](https://sre.google/sre-book/embracing-risk/)
