---
id: sre-error-budgets-catastrophic-single-incident-burn-001
title: "A single catastrophic incident burns an entire quarter's error budget in one day. Does the error budget policy still apply the same way?"
category: sre
subcategory: error-budgets
technologies:
  - sre
difficulty: advanced
question_type:
  - scenario
tags:
  - sre
  - error-budget
  - incident-response
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A single catastrophic incident consumes an entire quarter's error budget in one day, well beyond the gradual erosion the policy was really designed around. Does the standard error budget policy (freeze risky releases until the budget recovers) still apply the same, mechanical way in this case?

## Short Answer

The mechanical policy trigger still fires correctly (budget is exhausted, so the freeze applies) — the real question isn't whether the policy applies, but whether a blanket freeze for the rest of the window is actually the right response to a single, already-understood incident versus an ongoing, unresolved reliability problem. Many teams apply judgment here: the freeze is appropriate immediately after the incident (while root cause and fix are still being worked), but a rigid, mechanical freeze for the *entire remaining window* regardless of whether the root cause has already been fixed can be counterproductive — worth distinguishing "budget exhausted, unresolved problem" from "budget exhausted, incident already understood and fixed."

## Detailed Explanation

The error budget policy's underlying purpose is ensuring reliability problems get prioritized appropriately — pausing risky new changes when reliability is degraded, so the team focuses on fixing the problem rather than compounding it with more risk. That purpose is well-served by the policy triggering immediately after a catastrophic incident — freezing risky releases while the incident is fresh, the root cause isn't yet understood, and there's real risk that another change could compound the problem, is exactly the scenario the policy exists for.

The harder question is what happens *after* the root cause is identified and fixed, but the budget (calculated over the full rolling window) remains mechanically exhausted for weeks or months more, simply because the window hasn't rolled past the incident yet. A purely mechanical application of the policy would keep the freeze in place for that entire remaining period, even though the actual problem that caused the exhaustion has already been resolved — this can feel punitive and disconnected from the policy's actual purpose (prioritizing an unresolved reliability problem), since there's no longer an unresolved problem to prioritize, just a budget number that hasn't caught up yet.

**How teams commonly handle this**: some organizations build an explicit exception process for exactly this case — a catastrophic, well-understood, already-remediated incident can be granted an exception to resume normal release velocity before the budget mechanically recovers, based on a judgment call (often from SRE leadership or whoever owns the error budget policy) that the underlying risk has genuinely been addressed, not just that time has passed. Other organizations deliberately keep the mechanical freeze in place regardless, treating it as a forcing function that ensures extra caution for a meaningful period after any severe incident, even after the specific root cause is fixed, on the theory that a service that just had a severe incident warrants extra caution broadly, not just around the specific fixed issue.

**Neither approach is unconditionally correct** — it's a real policy design decision an organization needs to make deliberately (and ideally decide *before* the situation arises, not improvised in the moment under pressure from whoever wants the freeze lifted) about whether error budget policy is meant to be a strict mechanical trigger or a judgment-informed one with a defined exception path.

## Key Takeaways

- The error budget policy's mechanical trigger correctly fires on a catastrophic incident, exhausting the budget and triggering the freeze — that part works as designed.
- The real question is whether a blanket freeze should persist for the entire remaining window even after the specific root cause is identified and fixed.
- Some organizations build an explicit exception process for well-understood, already-remediated incidents; others deliberately keep the freeze as a forcing function regardless.
- This should be decided as a deliberate policy design choice in advance, not improvised under pressure during the actual situation.

## Interview Follow-Up Questions

- Who should have the authority to grant an exception to lift the freeze early, and what should they need to demonstrate before granting it?
- How would you prevent this exception process from being routinely abused to avoid the policy's intended friction?
- How would this decision differ for a catastrophic incident whose root cause is *not* yet fully understood, versus one that is?

## References

- [Google SRE Book: Embracing Risk](https://sre.google/sre-book/embracing-risk/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
