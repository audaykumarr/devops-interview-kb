---
id: sre-on-call-incident-response-runbooks-vs-tribal-001
title: "Your team resolves most incidents quickly because a few senior engineers just 'know' what to do. What's actually wrong with that, and how would you convert that knowledge into runbooks without slowing the seniors down?"
category: sre
subcategory: on-call-and-incident-response
technologies:
  - sre
difficulty: intermediate
question_type:
  - practical
  - conceptual
tags:
  - sre
  - runbooks
  - documentation
  - on-call
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your team resolves most incidents quickly, but largely because a few senior engineers just intuitively "know" what to do for each common failure mode — there's very little written down. What's actually wrong with relying on this tribal knowledge, and how would you convert it into runbooks without significantly slowing down the senior engineers who'd need to write them?

## Short Answer

The real risk isn't that tribal knowledge is currently working — it's that it's a single point of failure (those specific people being unavailable, leaving, or simply not being the one who happens to be on-call) and it prevents less experienced engineers from ever building the same competence, since there's nothing to learn from except direct exposure to enough incidents. Convert it incrementally: capture a runbook immediately after each incident where tribal knowledge was used, while it's still fresh, rather than trying to document everything upfront in one large effort.

## Detailed Explanation

Tribal knowledge feels efficient because it currently works — the senior engineers really do resolve incidents fast — but that efficiency is masking a structural fragility: the team's actual incident-response capability is bottlenecked on a small number of specific people's availability and memory, which is a real risk (bus factor, burnout, simply being asleep during their own on-call rotation) that doesn't show up until exactly the moment it matters most.

**Capture the runbook immediately after the incident, not as a separate documentation project**: asking a senior engineer to write comprehensive documentation for every failure mode from memory, upfront, is a large, low-priority-feeling task that's easy to keep deferring — instead, make "write or update the runbook" a standard, small step in the postmortem/incident-review process for any incident where the resolution depended on tribal knowledge, while the specific steps are still fresh and the effort is naturally small (documenting what you just did, not reconstructing it from memory later).

**Start with the highest-frequency, highest-impact incidents**: not every failure mode needs a runbook immediately — prioritizing the incidents that recur most often or cause the most impact gives the best return on the documentation effort, and naturally builds runbook coverage for the situations most likely to matter soon.

**Have less experienced engineers write the first draft, with the senior engineer reviewing**: this both reduces the time burden on the senior engineer (review is faster than writing from scratch) and is itself a learning exercise for the less experienced engineer, who has to actually understand the resolution well enough to document it clearly — a good test of whether the tribal knowledge has genuinely transferred, not just been copied down.

**Treat runbooks as living documents, verified periodically**: a runbook that's never revisited can silently go stale as the system changes, becoming actively misleading rather than just incomplete — a lightweight periodic review (does this runbook still match how we'd actually resolve this today) keeps them trustworthy rather than accumulating stale, wrong guidance that erodes trust in runbooks generally.

## Key Takeaways

- Tribal knowledge's real risk isn't that it doesn't work currently — it's a single point of failure and a barrier to less experienced engineers ever building the same competence.
- Capture runbooks as a standard, small step in the post-incident process, right after the incident, rather than as a large separate documentation project that's easy to keep deferring.
- Prioritize documenting the highest-frequency, highest-impact failure modes first, for the best return on effort.
- Have less experienced engineers draft runbooks with senior review — this reduces the senior engineer's time burden and is itself a genuine learning exercise, while also testing whether the knowledge actually transferred.

## Interview Follow-Up Questions

- How would you verify a runbook is actually correct and usable, beyond just having it exist?
- How would you handle a failure mode that's genuinely too complex or context-dependent to reduce to a clear runbook?
- How would you measure whether this effort actually reduced the team's dependency on specific senior engineers over time?

## References

- [Google SRE Book: Being On-Call](https://sre.google/sre-book/being-on-call/)
- [PagerDuty: How to write a runbook](https://www.pagerduty.com/resources/learn/what-is-a-runbook/)
