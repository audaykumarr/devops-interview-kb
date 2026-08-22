---
id: scenarios-real-world-tradeoffs-two-mediocre-options-001
title: "You have two weeks to ship a solution, and neither option available to you is actually good — one is fast but creates real tech debt, the other is more correct but won't make the deadline. How do you approach this?"
category: scenarios
subcategory: real-world-tradeoffs
technologies:
  - devops
difficulty: advanced
question_type:
  - scenario
tags:
  - scenarios
  - decision-making
  - technical-debt
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You have two weeks to ship a solution for a real deadline, and neither realistic option is actually good: Option A is fast to build but creates real, known technical debt that will need to be paid down later; Option B is architecturally correct but won't realistically be finished in time. How do you approach a decision like this, where every path has a real cost?

## Short Answer

Reframe the question from "which option is good" (neither is) to "which trade-off is more honestly manageable and more visible once made" — this usually means taking the faster option specifically when the debt it creates is well-understood, bounded, and can be explicitly tracked and scheduled for later payoff, rather than treating the decision as a binary of good-versus-bad. The critical part often overlooked under deadline pressure is making the trade-off explicit and documented at the moment it's made, not silently accepting debt that then gets forgotten until it causes a real problem.

## Detailed Explanation

The instinct to look for a third, better option is worth a genuine, honest attempt first — sometimes a deadline reveals unstated flexibility (the deadline itself may be softer than initially presented, or the scope may be narrowable) that neither original option accounted for. But once that's genuinely exhausted and the choice really is between two imperfect options, the decision quality comes from how deliberately and transparently the trade-off is made, not from finding a way to avoid making one.

**Genuinely interrogate the deadline and scope before accepting the binary**: deadlines and scope are sometimes more negotiable than they initially appear, especially once the actual trade-off (fast-and-debt-laden versus correct-but-late) is made explicit to whoever set the deadline — a stakeholder who understands the real choice being forced might accept a short extension, or might help identify a way to narrow scope that makes the correct option achievable after all. This is worth a real, honest attempt before assuming the binary is fixed.

**If the binary genuinely holds, evaluate the debt's actual bounded-ness, not just its existence**: technical debt isn't uniformly bad — the real question is whether the debt from the fast option is well-understood (you know exactly what's being deferred and why) and bounded (it doesn't compound or create risk that grows the longer it's left unaddressed) versus open-ended or actively dangerous debt that gets worse the longer it persists. Debt that's genuinely bounded and well-understood is a much more acceptable trade than debt that's vague or actively risky.

**Make the trade-off explicit and documented at the moment it's made, not after the fact**: the single most important practical action is writing down, at decision time, exactly what shortcut was taken, why, and what needs to happen to pay it down — a ticket, a documented known-limitation, a follow-up task with an owner and rough timeline. This is what prevents the debt from silently becoming permanent, forgotten technical debt that surfaces as a surprise months later.

**Communicate the trade-off to stakeholders, not just the engineering team**: whoever's accountable for the deadline should understand, in terms they can actually evaluate, what's being traded away — this isn't about seeking permission for every technical decision, but about not letting a significant, consequential trade-off happen invisibly, especially one that creates real, ongoing risk or cost.

**Schedule the actual debt-payoff work, don't just note that it should happen someday**: "we'll fix this later" without an actual scheduled follow-up is how technical debt becomes permanent — committing to a specific, realistic timeline (even if it's not immediate) for addressing the deferred work is what separates a genuinely managed trade-off from an unmanaged one that just accumulates.

## Key Takeaways

- Before accepting a binary "both options are bad" framing, genuinely interrogate whether the deadline or scope has more flexibility than initially presented.
- If the binary holds, evaluate the debt's actual bounded-ness — well-understood, contained debt is a much more acceptable trade-off than open-ended or actively dangerous debt.
- Make the trade-off explicit and documented at the moment it's decided, not after the fact, so the deferred work doesn't silently become permanent, forgotten debt.
- Communicate the trade-off to accountable stakeholders in terms they can evaluate, and schedule the actual payoff work with a real timeline, not just a vague future intention.

## Interview Follow-Up Questions

- How would you handle a stakeholder who, once informed of the trade-off, insists on the fast option but then resists prioritizing the follow-up debt-payoff work later?
- What would you do if, after committing to the fast option, you discovered the debt was actually more dangerous or unbounded than initially assessed?
- How do you build organizational trust that "we'll address this later" commitments are actually honored, given this is a common source of accumulating, unaddressed technical debt?

## References

- [Martin Fowler: TechnicalDebt](https://martinfowler.com/bliki/TechnicalDebt.html)
