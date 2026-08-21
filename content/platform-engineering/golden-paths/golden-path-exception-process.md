---
id: platform-engineering-golden-paths-exception-process-001
title: "How do you handle a team that has a legitimate reason to deviate from a golden path — what does a good exception process actually look like?"
category: platform-engineering
subcategory: golden-paths
technologies:
  - platform-engineering
difficulty: intermediate
question_type:
  - practical
  - scenario
tags:
  - platform-engineering
  - golden-paths
  - governance
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A team has a genuinely good reason their use case doesn't fit the golden path — a real technical constraint, not just resistance to change. What does a well-designed exception process for this actually look like?

## Short Answer

A good exception process makes deviation possible and reasonably fast to get, requires the team to briefly articulate the actual reason (not just "we don't want to"), and is tracked centrally so the platform team can see patterns across exceptions over time — a process that's either impossible to get through (pushing teams toward silent, untracked workarounds) or trivially rubber-stamped (undermining the whole point of having a golden path) both fail in different ways.

## Detailed Explanation

The failure modes on either extreme are both real and instructive. A process that's too hard (weeks of approval, a committee, heavy justification burden) doesn't actually prevent legitimate deviations — it just pushes teams toward quietly working around the golden path without going through the formal process at all, which is worse than an exception, since now the platform team doesn't even know it's happening and can't track or learn from it. A process that's too easy (a checkbox, no real review) undermines the golden path's entire value proposition, since if exceptions are trivial to get, the golden path stops being a meaningful default and just becomes optional guidance nobody takes seriously.

**A lightweight, fast approval path for the common case**: the exception process itself should be quick — a short written justification (what's the specific constraint, why doesn't the golden path fit) reviewed by the platform team or a designated approver, turned around in days, not weeks, for genuinely well-articulated cases. Speed matters because a slow process is exactly what pushes teams toward silent workarounds instead.

**A real, if brief, justification requirement**: requiring the team to actually articulate the specific reason (not just "we prefer to do it differently") serves two purposes — it filters out cases that are really just resistance to change from cases with a genuine technical constraint, and it creates a record of *why* deviation was needed, which is valuable data for the platform team.

**Central tracking of exceptions over time**: every approved exception should be logged somewhere the platform team can see the aggregate pattern — if the same specific limitation keeps generating exception requests from different teams, that's a strong signal the golden path itself has a real gap worth fixing, not that each individual team's reason is coincidentally similar. Exceptions, tracked well, are actually valuable product feedback for evolving the golden path itself, not just individual one-off accommodations.

**Time-bounded or reviewed exceptions where appropriate**: for some categories of exception, treating the approval as time-bounded (revisit in 6 months — has the golden path evolved to cover this need, or is the exception still necessary) keeps exceptions from silently becoming permanent, forgotten technical debt that never gets reconsidered even after the underlying platform capability improves.

## Key Takeaways

- An exception process that's too slow/heavy pushes teams toward silent, untracked workarounds instead — worse than a tracked exception.
- An exception process that's too easy undermines the golden path's value as a meaningful default.
- Requiring a real, brief justification filters resistance-to-change from genuine technical constraints and creates useful data.
- Central tracking of exceptions over time surfaces patterns worth fixing in the golden path itself, and time-bounding exceptions prevents them from becoming forgotten, permanent technical debt.

## Interview Follow-Up Questions

- How would you handle a team that repeatedly requests exceptions for the same recurring reason — at what point does that become a golden path gap rather than a one-off exception?
- Who should have approval authority for exceptions, and how would you avoid that becoming a bottleneck as the organization grows?
- How would you communicate an exception's rationale to other teams, so it doesn't look like arbitrary special treatment?

## References

- [Team Topologies: Platform Teams](https://teamtopologies.com/key-concepts)
- [platformengineering.org: What is an Internal Developer Platform?](https://platformengineering.org/blog/what-is-an-internal-developer-platform)
