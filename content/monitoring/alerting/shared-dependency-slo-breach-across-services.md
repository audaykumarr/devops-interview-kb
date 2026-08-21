---
id: monitoring-alerting-shared-dependency-slo-breach-001
title: "How would you handle an SLO breach caused by a shared dependency affecting multiple services at once?"
category: monitoring
subcategory: alerting
technologies:
  - sre
difficulty: advanced
question_type:
  - scenario
tags:
  - slo
  - incident-response
  - sre
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A shared dependency (a database, a common internal API, a cloud provider service) degrades, and suddenly a dozen services' individual SLOs all start burning error budget simultaneously. How would you handle this — do all dozen teams independently trigger their own error-budget policy response?

## Short Answer

Treat it as one incident with one root cause, not a dozen independent SLO breaches — coordinate response at the level of the shared dependency itself (whoever owns or is closest to fixing it) rather than having every affected team separately mobilize their own error-budget-policy response for what's actually the same underlying problem, while still letting each team's own SLO/error-budget tracking accurately reflect the real impact they experienced for their own historical record and future policy decisions.

## Detailed Explanation

The naive response — every affected team independently triggers their own error-budget policy (pausing their own risky changes, mobilizing their own on-call) — treats symptoms as if they were a dozen unrelated problems, when they're actually one problem observed from a dozen vantage points. This duplicates response effort without addressing the actual root cause, and can create confusing, uncoordinated incident response (a dozen teams independently investigating, potentially reaching different conclusions about the same underlying issue).

**Coordinate at the dependency level**: the effective response is identifying the shared dependency as the actual incident and driving remediation there — whoever owns that dependency (or is closest to being able to fix it) leads the response, with affected teams informed and looped in rather than each independently launching a full separate incident response for what's the same root cause. This is a standard incident-management practice (correlate related alerts into one incident) applied specifically to the SLO/error-budget context.

**Still let each team's own SLO tracking reflect reality**: even though the response is coordinated centrally, each affected team's own SLO measurement should still accurately show the budget consumption they experienced — this isn't about hiding the impact from any individual team's metrics, just about not triggering a dozen *redundant, uncoordinated* response processes for the same root cause. The error budget was genuinely spent for each affected team, and that's real data worth keeping accurate for their own future planning.

**Distinguish "genuinely caused by us" burn from "caused by a shared dependency" burn when applying error-budget policy consequences**: many organizations' error-budget policies (pause risky changes when budget is low) are meant to create accountability for a team's *own* reliability choices — automatically applying the same "pause all changes" consequence to every team whose SLO happened to be affected by an external dependency's outage conflates two different situations (a team's own risky choices burning budget, versus an external event burning budget through no fault of their own) that arguably deserve different policy responses. Some organizations explicitly account for this by tracking dependency-caused burn separately, or applying judgment rather than a purely mechanical policy trigger in this specific case.

**Post-incident, address it at the dependency level too**: the follow-up/postmortem work belongs with the shared dependency's owner, focused on preventing recurrence at the source — fixing the shared dependency's own reliability, rather than a dozen separate postmortems each independently re-diagning the same root cause from their own service's perspective.

## Key Takeaways

- Treat a shared-dependency-caused multi-service SLO breach as one incident with one root cause, coordinated at the dependency level, not a dozen independent breaches each triggering separate response.
- Each affected team's own SLO/error-budget tracking should still accurately reflect the real impact they experienced, even though the response itself is coordinated centrally.
- Consider distinguishing "burn caused by our own choices" from "burn caused by an external shared dependency" when applying error-budget policy consequences, since they arguably deserve different responses.
- Post-incident follow-up belongs primarily with the shared dependency's owner, addressing the actual root cause rather than a dozen redundant, service-specific postmortems.

## Interview Follow-Up Questions

- How would you design your incident-management tooling to automatically correlate related alerts into one incident, rather than relying on humans to notice the pattern?
- How would you decide whether a specific team's error-budget policy should still trigger even though the burn was externally caused?
- How would you handle a shared dependency that's owned by a different organization entirely (a third-party SaaS vendor), where you have no direct ability to drive remediation?

## References

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: Emergency Response](https://sre.google/sre-book/emergency-response/)
