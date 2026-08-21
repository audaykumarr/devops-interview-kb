---
id: monitoring-alerting-setting-initial-slo-no-history-001
title: "How would you set an initial SLO for a service that has no historical performance data to base it on at all?"
category: monitoring
subcategory: alerting
technologies:
  - sre
difficulty: intermediate
question_type:
  - practical
  - scenario
tags:
  - slo
  - monitoring
  - sre
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Setting an SLO is supposed to be grounded in a service's actual historical performance, but a brand-new service has no history to look at yet. How would you set an initial SLO in that situation?

## Short Answer

Start from user expectations and comparable systems rather than historical data that doesn't exist yet: estimate a reasonable target based on what similar services (in your organization, or industry-typical benchmarks for the same category of system) achieve, set it as a provisional target explicitly labeled as such, and commit to revisiting it after a real observation window (30-90 days) once actual data exists — treating the initial number as a deliberately temporary estimate to be replaced, not a permanent commitment made without evidence.

## Detailed Explanation

The core problem the historical-data approach solves is avoiding an arbitrary, aspirational number disconnected from reality — but for a new service, there's a genuine chicken-and-egg problem: you need a target for the service before it has run long enough to have real performance data. The solution isn't to skip setting a target, but to be explicit that the initial number is provisional and grounded in the best available proxy for real data, not just guessed.

**Comparable-system benchmarking**: look at similar existing services — same category of workload (an API, a batch job, a UI), similar architecture, similar traffic pattern — and use their actual historical performance as the starting reference point, adjusted for known differences in the new service's specific requirements or constraints. This is meaningfully better than guessing from scratch, since it's grounded in real operational data, just not the new service's own.

**Industry-typical benchmarks as a fallback**: when no internal comparable system exists, industry-published availability/latency benchmarks for the same category of system (a typical web API's expected p99 latency range, for instance) provide a reasonable starting anchor — imperfect, but better than an arbitrary round number chosen with no grounding at all.

**Explicitly provisional, with a committed revisit date**: the key discipline is treating this initial number as a hypothesis to be tested, not a permanent commitment — documenting it as provisional, and setting a concrete date (typically after 30-90 days of real production traffic) to revisit it against actual observed performance, tightening or loosening the target based on what the service has genuinely demonstrated it can do. This avoids the two failure modes of guessing: overcommitting to an unrealistic number that immediately looks bad, or undercommitting to an easy number that never gets revisited once real data would justify tightening it.

**Bias toward a slightly conservative initial target**: since the service is new and its failure modes aren't yet well understood, erring toward a somewhat looser initial SLO (easier to hit) is generally safer than an aggressive one — an aggressive target set without evidence risks looking immediately broken (burning the error budget constantly) in a way that undermines confidence in the SLO framework itself, before there's been a chance to actually tune it against reality.

## Key Takeaways

- Use comparable existing systems' actual historical performance as the grounding reference when the new service itself has none.
- Fall back to industry-typical benchmarks for the same category of system when no internal comparable exists.
- Treat the initial SLO as explicitly provisional, with a committed date to revisit it against real observed data (typically 30-90 days in).
- Bias slightly conservative initially — an aggressive, ungrounded target risks looking immediately broken and undermining confidence in the SLO framework itself.

## Interview Follow-Up Questions

- How would you communicate to stakeholders that an initial SLO is provisional without it seeming like you're avoiding commitment?
- What would you do if, after the revisit window, the service's actual performance is significantly worse than any comparable system's — how would that change your approach?
- How would you handle setting an SLO for a genuinely novel type of service with no meaningful comparable system at all?

## References

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
