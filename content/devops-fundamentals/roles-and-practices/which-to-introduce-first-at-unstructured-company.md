---
id: devops-fundamentals-which-practice-to-introduce-first-001
title: "Joining a company with none of DevOps, SRE, or Platform Engineering formalized, which would you introduce first, and why?"
category: devops-fundamentals
subcategory: roles-and-practices
technologies:
  - devops
difficulty: intermediate
question_type:
  - scenario
  - conceptual
tags:
  - devops
  - sre
  - platform-engineering
  - fundamentals
estimated_time_minutes: 7
companies: []
related_questions:
  - devops-fundamentals-devops-vs-sre-vs-platform-engineering-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You join a company that has none of DevOps culture, SRE practice, or Platform Engineering formalized — engineering and operations are still fully separate, with no explicit reliability or platform investment. Which would you introduce first, and why?

## Short Answer

Start with the DevOps cultural shift (breaking down the dev/ops wall, shared ownership of what's shipped) before either SRE or Platform Engineering, because both of those are specific implementations that assume the underlying cultural alignment already exists — introducing SRE's error-budget mechanics or a platform team's paved roads onto an organization that still has adversarial dev/ops incentives tends to just create new friction points rather than actually working, since the mechanisms depend on people already being aligned on shared responsibility.

## Detailed Explanation

The reasoning follows directly from how these three relate (as covered in the base comparison): SRE is a specific, mechanism-heavy implementation of DevOps principles, and Platform Engineering is infrastructure for scaling DevOps/SRE practice across many teams. Both assume the cultural precondition — shared ownership between building and running software — is already somewhat in place; neither is designed to create that precondition itself.

Introducing SRE mechanics (SLOs, error budgets, a formal on-call rotation with defined toil limits) into an organization where dev and ops are still separate, adversarial groups tends to just formalize the adversarial dynamic rather than resolve it — an error budget is only a useful shared decision-making tool if both sides actually feel ownership over the trade-off it represents; introduced onto a team that still sees reliability as "ops's job," it becomes another metric ops is held to rather than a genuinely shared mechanism.

Introducing Platform Engineering (a paved-road internal developer platform) before the cultural shift similarly risks building infrastructure nobody's culturally ready to actually use as intended — a platform team's value depends on product teams wanting to adopt self-service paved roads instead of doing things their own way, which is much more likely to happen once teams already feel real ownership over their own operational outcomes (a DevOps-cultural achievement) than when they're still used to throwing things over the wall to a separate ops team.

The practical sequencing: start with structural and incentive changes that create shared ownership — cross-functional teams, on-call rotations that include the engineers who wrote the code (not just a separate ops team), post-incident reviews that focus on systemic causes rather than blame, deployment ownership moving to the teams building the software. Once that cultural shift has genuine traction, SRE's more rigorous mechanisms (SLOs, error budgets, formal toil tracking) become meaningful tools building on an already-aligned foundation rather than mechanisms imposed on a still-adversarial structure, and Platform Engineering investment becomes worth making once there's real organic demand for self-service tooling from teams that already feel ownership over their operational outcomes.

## Key Takeaways

- SRE and Platform Engineering are both specific implementations that assume DevOps' cultural shift (shared ownership) is already in place, not mechanisms that create it.
- Introducing SRE mechanics onto a still-adversarial dev/ops split tends to formalize the adversarial dynamic rather than resolve it.
- Platform Engineering investment works best once there's genuine organic demand from teams that already feel operational ownership — building it too early risks infrastructure nobody's culturally ready to adopt.
- The practical sequencing is: cultural/structural change first (shared on-call, blameless postmortems, deployment ownership), then SRE rigor, then platform investment as demand emerges.

## Interview Follow-Up Questions

- How would you actually measure whether the cultural shift has "enough traction" to introduce SRE mechanics meaningfully?
- What would you do if leadership wanted to skip straight to hiring an SRE team, bypassing the cultural groundwork?
- How would you handle resistance from an existing, separate ops team that sees this cultural shift as a threat to their role?

## References

- [Google SRE Book: Introduction](https://sre.google/sre-book/introduction/)
- [Google Cloud: DevOps vs SRE](https://cloud.google.com/blog/products/devops-sre/sre-vs-devops-competing-standards-or-close-friends)
