---
id: platform-engineering-platform-adoption-deprecating-capability-001
title: "Usage data shows one of your platform's supported deployment strategies is used by exactly two teams out of sixty, but maintaining it still consumes real platform-team time. How do you handle deprecating it?"
category: platform-engineering
subcategory: platform-adoption
technologies:
  - platform-engineering
difficulty: intermediate
question_type:
  - practical
  - scenario
tags:
  - platform-engineering
  - deprecation
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Usage data reveals that one of your platform's supported deployment strategies — built a couple of years ago for what seemed like a broadly useful case — is now actually used by only two teams out of sixty across the organization. Maintaining and testing it still consumes real, ongoing platform-team time. How do you handle deprecating it?

## Short Answer

Treat this the same way a product team would deprecate a rarely-used feature: communicate clearly and early with the two affected teams, understand their actual reason for needing this specific capability before assuming it's safe to remove, provide a concrete migration path to a supported alternative, and set a real deprecation timeline rather than removing it abruptly — the goal is freeing up platform-team capacity for higher-leverage work without breaking the two teams that do depend on it.

## Detailed Explanation

Deprecating an underused platform capability is genuinely valuable — every capability maintained consumes ongoing platform-team time (testing, documentation, supporting questions) regardless of how few teams use it, and that time could otherwise go toward capabilities with much broader impact — but doing it well requires the same care a product team would apply to deprecating a feature real customers still use, not just a unilateral removal because the usage number is low.

**Understand why the two remaining teams use this specific capability before assuming it's safe to remove**: low usage doesn't automatically mean the capability is unimportant — it might be solving a genuinely specific need for those two teams that the more commonly-used alternatives don't address, meaning removal without a real replacement path would leave them stuck, not just mildly inconvenienced.

**Communicate early and directly with the affected teams, not via a broad announcement they might miss**: since this only affects two specific teams, a direct conversation (not just a changelog entry or a broad platform announcement that could easily be missed) is both more respectful of their actual stake in the decision and more likely to surface their real underlying need or migration blockers early.

**Provide a genuine migration path, not just a deprecation notice**: if a supported alternative can address the two teams' underlying need, help them actually migrate — this might mean direct platform-team engineering time to support the migration, since asking two teams to independently figure out a substitute for a capability they were told was supported is a worse outcome than the platform team having built it in the first place.

**Set a real, communicated deprecation timeline rather than removing it abruptly**: giving the affected teams a concrete window (not indefinite, but reasonable) to migrate, with clear visibility into when the capability will actually stop being supported, respects their own planning and workload — an abrupt removal risks breaking their systems with no warning, which damages trust in the platform far beyond just this one capability.

**Use this as a broader signal about capability lifecycle management**: a platform capability built for what seemed like a broadly useful case, but that ends up serving very few teams, is a normal, expected outcome, not a mistake to avoid entirely — building a deliberate, repeatable deprecation process (rather than treating each deprecation as a one-off, ad hoc decision) means the platform team can more comfortably build and try new capabilities, knowing there's a known, respectful way to sunset ones that don't end up broadly adopted.

## Key Takeaways

- Low usage doesn't automatically mean a capability is safe to remove — understand the remaining users' actual reason for depending on it before assuming a common alternative covers their need.
- Communicate directly with the specific affected teams rather than relying on a broad announcement they might miss, given how few teams are actually impacted.
- Provide a genuine migration path (potentially with direct platform-team support), not just a deprecation notice, especially when the affected teams are relying on a capability the platform explicitly offered as supported.
- A deliberate, repeatable deprecation process makes the platform team more comfortable building and trying new capabilities, since there's a known, respectful way to sunset ones that don't achieve broad adoption.

## Interview Follow-Up Questions

- How would you handle a case where the two remaining teams push back hard on deprecation, insisting they genuinely can't migrate?
- How would you decide the actual deprecation timeline length — what factors should influence whether it's weeks or months?
- How would you build usage-tracking into new platform capabilities from the start, so this kind of deprecation decision is easier to make with good data next time?

## References

- [platformengineering.org: What is an Internal Developer Platform?](https://platformengineering.org/blog/what-is-an-internal-developer-platform)
