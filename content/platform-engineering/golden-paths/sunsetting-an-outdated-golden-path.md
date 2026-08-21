---
id: platform-engineering-golden-paths-sunsetting-outdated-path-001
title: "How would you sunset or retire a golden path that's no longer the right default as the organization's needs have evolved?"
category: platform-engineering
subcategory: golden-paths
technologies:
  - platform-engineering
difficulty: advanced
question_type:
  - scenario
tags:
  - platform-engineering
  - golden-paths
  - migration
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A golden path that was the right default two years ago is now outdated — the organization's needs, scale, or available tooling have evolved past it. How would you sunset it and migrate teams off it, without a disruptive, forced cutover?

## Short Answer

Introduce the replacement as the new default for *new* adoption first, while leaving existing teams on the old path running (not forcibly migrated on day one), then drive migration of existing teams deliberately over a defined timeline with real support (migration tooling, documentation, dedicated help) rather than either an abrupt forced cutover or an indefinite, un-pushed "eventually" that never actually completes.

## Detailed Explanation

Sunsetting a golden path well means avoiding two failure modes: an abrupt forced migration that disrupts many teams simultaneously and burns goodwill, and a passive "it's deprecated" announcement with no real push behind it, which in practice means the old path lingers indefinitely because nobody's actually incentivized to migrate off something that still technically works.

**Stop new adoption first, immediately**: the fastest, lowest-disruption first step is simply making the new approach the default for anyone starting fresh — new services, new teams — while leaving existing users of the old path alone for now. This immediately stops the problem from growing (no new technical debt being added to the old path) without disrupting anyone currently depending on it.

**Communicate the timeline and reasoning clearly, early**: teams still on the old path need to know it's being sunset, why (concretely — what does the new path solve that the old one doesn't), and by when, with enough lead time to plan their own migration around other priorities — a surprise deprecation announcement with a short deadline creates unnecessary crisis and resentment, even for a change that's ultimately reasonable.

**Provide real migration support, not just documentation**: migration tooling (an automated or semi-automated conversion path where feasible), clear step-by-step documentation, and dedicated platform-team support during the migration window meaningfully changes migration from a burden each team has to solve independently into a supported, lower-friction process — directly affecting how quickly and willingly teams actually move.

**Set a real deadline with escalation, not an indefinite window**: an "eventually" migration with no actual deadline tends to never complete, since it's always easier to deprioritize against more urgent work — a concrete deadline, communicated well in advance, with a defined escalation path for teams that haven't migrated as the deadline approaches, is what actually drives completion rather than indefinite lingering.

**Track migration progress visibly**: a dashboard or regular status update showing how many teams have migrated versus remain creates useful visibility for both the platform team (to identify which teams need extra help) and leadership (to see the sunset is actually progressing, not stalled).

## Key Takeaways

- Stop new adoption of the old path immediately, while leaving existing users running, to stop the problem from growing without forcing an abrupt cutover.
- Communicate the sunset timeline and concrete reasoning early, giving teams real lead time to plan their migration.
- Provide real migration support (tooling, documentation, dedicated help), not just a deprecation announcement.
- Set a genuine deadline with escalation — an indefinite "eventually" migration window tends to never actually complete.

## Interview Follow-Up Questions

- How would you handle a team that simply can't meet the migration deadline due to genuine constraints — what's the escalation path?
- How would you decide whether to invest in automated migration tooling versus relying on manual, documentation-guided migration?
- How would you measure whether the sunset is actually succeeding, beyond just tracking migration completion percentage?

## References

- [Team Topologies: Platform Teams](https://teamtopologies.com/key-concepts)
- [platformengineering.org: What is an Internal Developer Platform?](https://platformengineering.org/blog/what-is-an-internal-developer-platform)
