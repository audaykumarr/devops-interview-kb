---
id: scenarios-legacy-systems-understanding-vs-shipping-pressure-001
title: "How do you balance the time investment in fully understanding a legacy system against the pressure to just make the requested change quickly?"
category: scenarios
subcategory: legacy-systems
technologies:
  - devops
difficulty: intermediate
question_type:
  - scenario
tags:
  - scenarios
  - legacy-systems
  - decision-making
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Understanding a legacy system properly takes real time, but there's often real pressure to just make the requested change quickly. How do you actually balance these two competing pressures in practice, rather than defaulting entirely to one or the other?

## Short Answer

Scale investigation depth to the actual risk and reversibility of the specific change being requested, not to a fixed standard applied uniformly — a low-risk, easily-reversible change doesn't need the same investigation depth as a high-risk, hard-to-reverse one, and being explicit about that trade-off (rather than either always rushing or always over-investigating) is what actually resolves the tension, rather than treating it as an unavoidable conflict between "do it right" and "do it fast."

## Detailed Explanation

The tension is often framed as a binary — thorough-but-slow versus fast-but-risky — but in practice it's resolvable by recognizing that not every change carries the same stakes, and investigation depth should track that.

**Match investigation depth to the specific change's risk**: a small, low-risk, easily-reversible change (a config value tweak, a change to a well-isolated, well-understood piece of the pipeline) doesn't need the same deep-dive investigation as a high-risk, hard-to-reverse one (modifying credential scope, changing a step that other systems depend on in ways that aren't fully mapped). Explicitly asking "what's the actual risk and reversibility of *this specific change*" before deciding how much investigation it warrants avoids both over-investigating trivial changes and under-investigating risky ones.

**Make the trade-off explicit to whoever's applying the pressure**: rather than silently either caving to time pressure (risking a mistake in an unfamiliar system) or silently taking longer than requested (creating friction from unmet expectations), stating the trade-off directly — "I can make this change today with limited investigation, accepting some risk given how unfamiliar this system still is, or I can spend a day understanding it better first and reduce that risk — which do you want?" — turns an implicit tension into an explicit decision the requester can actually weigh in on, often resolving the pressure entirely once the actual risk is visible to them.

**Use small, diagnostic changes to build understanding cheaply along the way**: as covered in the original inheriting-a-legacy-pipeline approach, a small, reversible, diagnostic first change (verifying your mental model) is both fast *and* builds real understanding — it's not purely one trade-off or the other, since a well-chosen small step serves both goals simultaneously rather than requiring a full investigation before any progress happens at all.

**Recognize that rushing a genuinely risky change in an unfamiliar system has its own real cost** (the incident, the debugging time, the trust cost of having broken something) that's easy to discount under time pressure but is a real part of the actual trade-off, not a hypothetical — making the case for appropriate investigation depth in terms of that concrete cost, not just an abstract preference for thoroughness, is more persuasive to whoever's applying the pressure.

## Key Takeaways

- Scale investigation depth to the specific change's actual risk and reversibility, not a fixed standard applied to every change uniformly.
- Make the speed-versus-thoroughness trade-off explicit to whoever's applying time pressure, rather than silently caving or silently taking longer than expected.
- A well-chosen small, diagnostic first change can build real understanding while still making visible progress — not purely a choice between one or the other.
- Framing the case for appropriate investigation depth around the concrete cost of a rushed mistake (not an abstract preference) is more persuasive under real pressure.

## Interview Follow-Up Questions

- How would you handle a case where the requester genuinely doesn't understand or care about the risk trade-off, regardless of how you frame it?
- Can you give an example where you deliberately chose to rush a low-risk change, and one where you pushed back and took more time — what made the difference?
- How would you build organizational trust over time so this trade-off conversation becomes easier in future situations?

## References

- [Google SRE Book: Postmortem Culture](https://sre.google/sre-book/postmortem-culture/)
