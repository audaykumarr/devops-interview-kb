---
id: scenarios-real-world-tradeoffs-good-enough-is-enough-001
title: "You've proposed a robust, well-architected solution to a problem, but your manager wants a quick, hacky fix instead because the problem is genuinely minor. Are they wrong, or are you over-engineering?"
category: scenarios
subcategory: real-world-tradeoffs
technologies:
  - devops
difficulty: intermediate
question_type:
  - scenario
tags:
  - scenarios
  - engineering-judgment
  - over-engineering
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You've proposed a robust, well-architected solution to a recurring but genuinely minor operational annoyance — something that happens occasionally and is mildly annoying to work around manually, but isn't causing real business impact. Your manager pushes back, wanting a quick, hacky fix instead, arguing the problem doesn't justify the engineering investment. Are they wrong, or is this actually a sign you're over-engineering the response?

## Short Answer

This is worth taking seriously as a real possibility, not dismissing — engineers have a genuine, well-documented tendency to over-invest in solving problems in the most technically satisfying way, independent of whether that investment is actually proportional to the problem's real impact. The right response isn't to assume either party is automatically correct, but to explicitly quantify the actual cost of the current annoyance (how often it happens, how much time/pain each occurrence costs) against the cost of each proposed fix (the quick hack's ongoing cost of being hacky, versus the robust solution's upfront investment) — and let that comparison, not instinct or preference for elegant engineering, drive the decision.

## Detailed Explanation

The tension here is a specific, common failure mode worth naming honestly: engineers are often drawn to solving problems the "right" way because it's more intellectually satisfying and demonstrates good engineering practice, even when the actual problem doesn't justify that level of investment — this doesn't mean robust solutions are never warranted, but it means the instinct toward the more elegant solution deserves scrutiny rather than being assumed correct by default.

**Quantify the actual cost of the current problem, not just its irritation level**: how frequently does this actually happen, and what's the real cost each time (a few minutes of manual workaround, versus a genuine, painful, hours-long process)? A problem that happens rarely and costs little each time genuinely may not justify significant engineering investment, regardless of how technically interesting a robust fix would be to build.

**Quantify the realistic cost of each option, not just the theoretical one**: a "quick hacky fix" has real ongoing costs too — if it needs periodic manual intervention, or creates confusion for whoever encounters it later without context, those costs should be weighed honestly, not just assumed to be free because the upfront engineering effort is low. Similarly, the "robust solution" has a real upfront cost (engineering time that could go toward other work) that needs to be weighed against what it's actually preventing, not assumed automatically justified because it's the more architecturally sound approach.

**The comparison should be explicit, not left as an unstated disagreement about engineering taste**: rather than the disagreement staying at the level of "I think we should build this properly" versus "I think that's overkill," making the actual cost/benefit comparison explicit (even roughly) turns a values disagreement into a comparison both people can evaluate on shared terms — and often resolves the disagreement once both people are looking at the same numbers rather than talking past each other.

**A hacky fix that's explicitly acknowledged as such, with its limitations documented, is a legitimate engineering choice for a genuinely minor problem**: this isn't settling for bad engineering — it's correctly matching the investment to the actual stakes, which is itself good engineering judgment, not its absence. The failure mode to avoid isn't "choosing the hacky fix," it's choosing it silently, without acknowledging its limitations, in a way that lets it quietly become permanent, forgotten technical debt (the same pattern covered in the two-mediocre-options scenario).

**If, after genuinely quantifying both sides, the numbers still support the robust solution, that's worth articulating clearly, not deferring automatically to the manager's instinct either**: this isn't about always siding with "keep it simple" — if the actual, quantified cost of the recurring problem turns out to be higher than it initially seemed (frequency or impact underestimated), or the "robust" solution's cost is lower than assumed (because it reuses existing patterns or infrastructure), that's a legitimate basis to advocate for it, backed by the same explicit comparison rather than just asserting a preference for good architecture.

**This is also a moment to genuinely reflect on your own motivation**: honestly asking yourself whether you're drawn to the robust solution because it's actually the better trade-off, or because it's more interesting to build, is a useful, humbling check — engineers who can distinguish between these two motivations, and act on the former rather than defaulting to the latter, tend to make better-calibrated engineering decisions over time.

## Key Takeaways

- Engineers have a genuine, common tendency to over-invest in the more technically satisfying solution regardless of whether the problem's actual impact justifies it — this is worth taking seriously as a real possibility in this scenario.
- Quantify the actual cost of the current problem (frequency, real cost per occurrence) against the realistic cost of each proposed fix, rather than letting the disagreement stay at the level of unstated engineering taste.
- A hacky fix, explicitly acknowledged as such with documented limitations, is a legitimate engineering choice for a genuinely minor problem — matching investment to actual stakes is good judgment, not a lapse in it.
- Honestly reflecting on whether you're drawn to the robust solution because it's the better trade-off or because it's more interesting to build is a useful, humbling calibration check.

## Interview Follow-Up Questions

- How would you build a lightweight habit of doing this kind of explicit cost/benefit comparison without it becoming its own bureaucratic overhead for every small decision?
- What would you do if the quick hacky fix, once implemented, turned out to need repeated patching, revealing the problem was actually more significant than initially assessed?
- How do you distinguish "this problem is genuinely minor" from "I'm underestimating this problem because I don't want to deal with it"?

## References

- [Martin Fowler: TechnicalDebt](https://martinfowler.com/bliki/TechnicalDebt.html)
