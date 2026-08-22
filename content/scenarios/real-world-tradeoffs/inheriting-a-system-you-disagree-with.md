---
id: scenarios-real-world-tradeoffs-inheriting-disagreement-001
title: "You inherit ownership of a system whose fundamental architecture you think was the wrong call — not a small detail, a core design decision. How do you handle this, given the system is already in production?"
category: scenarios
subcategory: real-world-tradeoffs
technologies:
  - devops
difficulty: advanced
question_type:
  - scenario
tags:
  - scenarios
  - technical-decision-making
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You inherit ownership of a system whose fundamental architecture you genuinely believe was the wrong call — not a stylistic disagreement, but a core design decision (a data model, a technology choice, a service boundary) that you think creates real, ongoing problems. The system is already in production and working, more or less. How do you handle this, both technically and in terms of how you communicate your disagreement?

## Short Answer

Separate "this was probably the wrong call" from "therefore it needs to be fixed now" — the system working in production, however imperfectly, has real value that a disagreement about the original decision doesn't automatically override, and the right first step is genuinely understanding *why* the original decision was made (constraints, information, or trade-offs that may not be obvious in hindsight) before concluding it was actually a mistake rather than a reasonable call given what was known at the time. If, after that understanding, the disagreement holds, the path forward is building a concrete case (real costs the current design imposes, a credible alternative, a realistic migration plan) rather than either quietly living with frustration or unilaterally starting a rewrite.

## Detailed Explanation

The instinct to immediately want to "fix" a design you disagree with is understandable but risks two real failure modes: dismissing a decision that actually made sense given constraints you don't fully understand yet, or correctly identifying a real problem but pursuing a fix in a way that's disruptive, poorly justified to stakeholders, or underestimates the real cost of change to a system already working in production.

**Understand the original decision's context before concluding it was wrong**: architectural decisions are usually made under real constraints — a tight deadline, incomplete information about future scale, technology limitations at the time, organizational pressures — that aren't always visible from the outside or in hindsight; investigating the actual history (talking to anyone who was involved, if possible, or reviewing whatever historical context exists) often reveals the original decision was a reasonable trade-off given what was known then, even if it looks wrong given what's known now. This doesn't mean every disagreement dissolves on investigation, but it's a necessary step before concluding the original choice was actually a mistake rather than a defensible call under different constraints.

**Distinguish "imperfect but working" from "actively broken"**: a system that's working in production, even if architecturally imperfect by your judgment, has real, demonstrated value — the disagreement alone doesn't automatically justify disruption, and the actual bar for pursuing a change should be a concrete, articulable cost the current design is imposing (real operational pain, a demonstrated scaling ceiling, a security or reliability risk) rather than an aesthetic or theoretical preference for a different approach.

**Build a concrete case if the disagreement genuinely holds after investigation**: rather than raising abstract architectural disagreement, articulate the actual, specific costs the current design imposes (recurring operational toil, specific incidents traceable to the design, a genuine scaling limitation approaching), propose a credible alternative, and be honest about the realistic cost and risk of migrating — this mirrors the same refactor-versus-rewrite cost/benefit reasoning covered in the related legacy-systems question, applied here to a design you disagree with rather than one that's simply unfamiliar.

**Communicate the disagreement constructively, echoing the earlier technical-disagreement behavioral guidance**: raising the concern with concrete reasoning, being open to being wrong if new context emerges, and being willing to commit to the current design (working within it effectively) if the team decides not to change it — even having raised a legitimate concern — is what separates constructive engagement from someone who's just difficult to work with about decisions they didn't make.

**Avoid unilaterally starting a rewrite based on personal conviction alone**: even if your technical judgment is correct, a significant architectural change to a production system affecting other people's work deserves the same deliberate process (stakeholder buy-in, a real cost/benefit case, a safe migration plan) as any other major change — being right about the underlying technical assessment doesn't grant license to skip the process of getting the team and stakeholders aligned before acting.

**Consider whether the disagreement is worth pursuing at all, proportional to its actual impact**: not every architectural imperfection is worth the organizational and engineering cost of changing — the same proportionality judgment from the technical-disagreement behavioral question applies here: is this significant enough to be worth real effort and disruption, or is it something to note, live with, and perhaps revisit if circumstances change (the system needs to scale further, a natural rewrite opportunity arises)?

## Key Takeaways

- Understand the original decision's context and constraints before concluding it was actually a mistake — decisions that look wrong in hindsight are often reasonable given what was known and constrained at the time.
- A system working in production, even if architecturally imperfect, has real value that disagreement alone doesn't override — the bar for pursuing change should be a concrete, articulable cost, not just a preference for a different approach.
- If the disagreement genuinely holds, build a concrete case (specific costs, a credible alternative, a realistic migration plan) rather than either silently living with frustration or unilaterally starting a rewrite.
- Communicate constructively and be willing to commit to the team's decision if they choose not to change the design, even after having raised a legitimate concern.

## Interview Follow-Up Questions

- How would you handle a situation where you've built a strong case for change, but leadership still decides not to prioritize it?
- What would you do if, during your investigation into the original decision's context, you discovered it actually was a clear, avoidable mistake with no good justification?
- How do you calibrate how much of your own time to invest in building a case for a change you believe in, given uncertainty about whether it'll ultimately be approved?

## References

- [Martin Fowler: TechnicalDebt](https://martinfowler.com/bliki/TechnicalDebt.html)
