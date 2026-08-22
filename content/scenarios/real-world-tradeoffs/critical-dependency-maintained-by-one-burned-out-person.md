---
id: scenarios-real-world-tradeoffs-single-maintainer-dependency-001
title: "Your organization depends heavily on an internal tool maintained by exactly one engineer, who's showing clear signs of burnout and has hinted they might leave. How do you handle this before it becomes a crisis?"
category: scenarios
subcategory: real-world-tradeoffs
technologies:
  - devops
difficulty: intermediate
question_type:
  - scenario
tags:
  - scenarios
  - bus-factor
  - team-health
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your organization depends heavily on an internal tool — critical enough that many teams' daily work relies on it — maintained by exactly one engineer. That engineer is showing clear signs of burnout (visibly exhausted, has mentioned feeling overwhelmed, possibly hinting they're considering leaving). How do you address this before it becomes a genuine crisis, on both the human and the operational-risk dimensions?

## Short Answer

This is simultaneously a people problem and a bus-factor risk problem, and addressing only one dimension isn't sufficient — you need to genuinely reduce the burden on this specific person (redistributing work, bringing in help, addressing whatever's driving the burnout) while separately, deliberately building knowledge redundancy so the organization isn't catastrophically exposed if they do leave, whether or not the burnout itself is successfully resolved. Treating this as purely a "how do we document their knowledge before they quit" problem misses the human dimension; treating it as purely a "how do we support this person" problem without addressing the bus-factor risk leaves the organization exposed regardless of how the human situation resolves.

## Detailed Explanation

The two dimensions of this problem — a person's wellbeing and an organization's operational risk — are related but genuinely distinct, and a response that only addresses one leaves a real gap: supporting the person without reducing bus-factor risk means the organization stays exposed if they leave anyway (which burnout makes more likely, not less); reducing bus-factor risk without genuinely supporting the person treats a human being primarily as a knowledge-transfer risk to be mitigated, which is both an ethically poor response and likely to accelerate exactly the departure you're trying to prepare for.

**Address the burnout directly and genuinely, not just its downstream risk**: talk to the person directly about what's actually driving the overwhelm — is it genuinely too much work for one person, unclear expectations, lack of support, or something else — and take real action based on what you learn (redistributing work, bringing in additional help, adjusting expectations) rather than only offering generic wellness messaging while the underlying workload stays the same. This needs to be a genuine response to their actual situation, not a performative gesture while quietly starting succession planning behind their back.

**Simultaneously, and transparently, build knowledge redundancy — this benefits everyone, not just the organization**: pairing another engineer with this person on real work (not just documentation-writing as a separate task, but actually working alongside them) both reduces the sole-maintainer's load in the short term and builds genuine redundant knowledge — this should be framed and actually function as workload relief for the burned-out person, not an extraction exercise that adds documentation-writing to their already overwhelming plate.

**Prioritize based on actual criticality and actual departure risk, not treating this as either fully urgent or fully non-urgent**: if the tool is genuinely critical and the person has explicitly hinted at leaving, this deserves real, prompt organizational attention (reallocating other people's time to help, not just hoping it resolves itself) — but the response should be proportional and genuinely supportive, not a panicked reaction that makes the person feel like a resource being managed rather than a person being supported.

**Address the systemic root cause, not just this one instance**: a single critical tool maintained by one person is often a symptom of a broader organizational pattern (chronic understaffing, a lack of investment in "boring" but critical internal tooling, a culture that lets bus-factor risk accumulate silently) — fixing this one instance without addressing why it happened in the first place risks the same pattern recurring elsewhere.

**If the person does leave despite genuine support efforts, treat it as an outcome to plan for, not a failure to prevent at all costs**: sometimes someone leaves regardless of how well the organization responds, for reasons unrelated to how well-supported they felt — having genuinely tried to both support them and build redundancy means the organization is in a meaningfully better position than if neither effort had been made, even if the departure still happens.

## Key Takeaways

- This is simultaneously a human wellbeing problem and an operational bus-factor risk problem — addressing only one dimension leaves a real gap.
- Genuinely address the burnout's actual cause (redistributing work, real support) rather than only offering generic wellness gestures while the underlying workload stays unchanged.
- Build knowledge redundancy in a way that functions as workload relief for the burned-out person, not an extraction exercise that adds more work to their plate.
- Address the systemic root cause (why was a critical tool ever maintained by just one person) to prevent the same pattern from recurring elsewhere in the organization.

## Interview Follow-Up Questions

- How would you approach this conversation with the engineer without making them feel like they're being treated as a risk to be managed rather than a person to be supported?
- How would you make the business case to leadership for investing additional headcount/time in this tool, given it may not be visibly "broken" yet?
- What would you do differently if you discovered this pattern (critical tool, single maintainer) exists in several places across the organization, not just this one?

## References

- [Google SRE Book: Being On-Call](https://sre.google/sre-book/being-on-call/)
