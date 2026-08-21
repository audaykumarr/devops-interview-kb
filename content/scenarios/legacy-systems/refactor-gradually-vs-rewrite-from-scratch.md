---
id: scenarios-legacy-systems-refactor-vs-rewrite-decision-001
title: "How would you decide whether to gradually refactor a legacy pipeline versus rewriting it from scratch?"
category: scenarios
subcategory: legacy-systems
technologies:
  - ci-cd
difficulty: advanced
question_type:
  - scenario
tags:
  - scenarios
  - legacy-systems
  - refactoring
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Once you've understood a legacy pipeline well enough to safely change it, the next real decision is whether to gradually refactor it in place or rewrite it from scratch. How would you decide between the two?

## Short Answer

Gradual refactoring is the right default when the pipeline mostly works and the pain is specific and localized (a few genuinely problematic pieces, not the whole design) — it lets you improve incrementally while the system keeps running, with each change independently verifiable. A rewrite is justified specifically when the underlying design itself is the problem (not fixable piece by piece), when the cost of continuing to work around its limitations exceeds the cost of replacing it, or when the tooling/platform it's built on is itself being deprecated or replaced organization-wide — and even then, a rewrite should usually run in parallel with the old system until proven equivalent, not as a risky big-bang cutover.

## Detailed Explanation

**Favor gradual refactoring when**: the pipeline's overall design is sound and most of it works correctly — the pain is concentrated in specific, identifiable pieces (a particularly gnarly script, an outdated dependency, a fragile manual step) rather than the whole architecture. Refactoring these pieces incrementally, each verified independently before moving to the next, keeps risk low and lets the pipeline keep running throughout — directly building on the incremental, diagnostic approach to understanding the system in the first place.

**Consider a rewrite when**: the underlying design itself is the actual problem — not "this specific script is messy" but "the whole approach this pipeline takes no longer fits how the organization actually deploys software" (e.g. a pipeline built around a deployment model the rest of the organization has moved past). Piece-by-piece refactoring can't fix a fundamentally wrong design; it can only make a wrong design slightly less painful to live with. Similarly, if the platform/tooling the pipeline depends on is itself being organization-wide deprecated (a CI platform being sunset, a scripting language nobody maintains expertise in anymore), continuing to invest in refactoring something built on a foundation that's going away is often wasted effort compared to building fresh on the platform that's actually staying.

**Weigh the cost comparison explicitly**: refactoring's cost is the ongoing, piece-by-piece effort spread over time, with the system remaining functional throughout; a rewrite's cost is a concentrated effort with real risk during the transition (a rewrite that doesn't yet match the original's actual behavior, including undocumented edge cases the original silently handled), but potentially a much better end state. This isn't a decision to make on gut feeling — estimating both paths' realistic effort and risk, even roughly, produces a much more defensible decision than a general preference for one approach over the other.

**Prefer parallel running over a big-bang cutover, if rewriting**: even when a rewrite is justified, running the new pipeline alongside the old one (both producing results, comparing outputs, only cutting over once the new one has proven equivalent or better across real production use) is far safer than replacing the old pipeline outright on a single cutover date — directly mitigating the risk that the rewrite missed some undocumented behavior the original silently handled correctly.

## Key Takeaways

- Gradual refactoring is the right default when the pipeline's overall design is sound and pain is concentrated in specific, fixable pieces.
- A rewrite is justified when the underlying design itself is wrong, or when the pipeline depends on tooling/platform being organization-wide deprecated.
- Explicitly weighing the realistic cost and risk of both paths produces a more defensible decision than a general preference for either approach.
- If rewriting, run the new and old systems in parallel and compare outputs before cutting over, rather than a risky big-bang replacement.

## Interview Follow-Up Questions

- How would you estimate the realistic effort of a rewrite before committing to it, given the original system's behavior isn't fully documented?
- What would you do if leadership wants a rewrite for reasons that don't hold up to this cost/risk analysis (e.g. just wanting something "modern")?
- How would you handle discovering, mid-rewrite, that the parallel-run comparison reveals the original system's behavior was itself buggy in ways nobody knew about?

## References

- [Martin Fowler: StranglerFigApplication (incremental replacement pattern)](https://martinfowler.com/bliki/StranglerFigApplication.html)
