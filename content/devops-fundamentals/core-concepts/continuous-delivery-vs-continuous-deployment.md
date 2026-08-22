---
id: devops-fundamentals-core-concepts-cd-vs-cd-001
title: "A job posting says the team practices 'continuous deployment,' but during the interview it turns out every release still requires a manual approval click. Is that actually continuous deployment?"
category: devops-fundamentals
subcategory: core-concepts
technologies:
  - devops
difficulty: beginner
question_type:
  - comparison
tags:
  - devops-fundamentals
  - continuous-delivery
  - continuous-deployment
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A job posting advertises "continuous deployment," but during the interview, it becomes clear every release still requires a human to click an approval button before it goes to production. Is that actually continuous deployment, or is the team's terminology imprecise — and does the distinction actually matter?

## Short Answer

What's being described is continuous *delivery*, not continuous *deployment* — the distinction is precisely whether a human approval gate exists before production release. Continuous delivery means every change is automatically built, tested, and made ready to release at any time, with a human deciding when to actually trigger that release. Continuous deployment goes one step further, removing that human gate entirely — every change that passes automated checks deploys to production automatically, with no manual approval step at all.

## Detailed Explanation

The two terms are often used interchangeably in casual conversation (and job postings), but they describe a meaningfully different point on the automation spectrum, and the distinction is precise, not just semantic pedantry.

**Continuous delivery means "always releasable," with a human deciding when**: every change that passes the automated pipeline (build, test, and any other automated quality gates) is in a state that *could* be deployed to production at any moment — but an actual human makes the decision of *when* to trigger that release, typically via a manual approval step or button click. This is what the team described in the interview.

**Continuous deployment removes the human decision point entirely**: every change that passes the automated pipeline deploys straight to production automatically, with no manual gate — the "decision" to release is made entirely by the automated pipeline's pass/fail result, not by a human choosing the timing.

**The distinction matters practically, not just as terminology trivia**: it reflects a genuinely different level of organizational trust in the automated pipeline and a different risk tolerance — continuous deployment requires enough confidence in automated testing, monitoring, and rollback capability that no human needs to review each release before it reaches real users, which is a meaningfully higher bar than continuous delivery's "ready whenever a human says go."

**Continuous delivery is the more common practice in practice, even among teams with mature CI/CD**: many organizations deliberately keep a human approval gate — sometimes for genuine business reasons (coordinating a release with a marketing announcement, a support team readiness check), sometimes because their automated test/monitoring coverage isn't yet confident enough to trust fully automated production releases — and this is a legitimate, common choice, not an incomplete or lesser version of "real" CI/CD.

**Both sit on top of continuous integration, which is a separate, prerequisite practice**: continuous integration specifically refers to frequently merging code changes into a shared branch with automated build/test on every merge — it's the foundation both continuous delivery and continuous deployment build on, but CI alone says nothing about how or when changes actually reach production, which is exactly the distinction delivery and deployment are about.

**A precise vocabulary matters for accurately describing your own team's practices, including in interviews**: correctly identifying whether your team does continuous delivery or continuous deployment (rather than using the terms interchangeably) signals genuine understanding of the practice, and matters practically when discussing release risk, rollback strategy, or automation maturity with anyone who does understand the precise distinction.

## Key Takeaways

- Continuous delivery means every change is automatically built, tested, and made ready to release — with a human deciding when to actually trigger the release.
- Continuous deployment removes the human approval gate entirely — a passing automated pipeline deploys straight to production with no manual step.
- The distinction reflects a real difference in organizational trust and risk tolerance, not just terminology — continuous deployment requires higher confidence in automated testing/monitoring/rollback.
- Continuous integration is the separate, prerequisite practice both build on (frequent merges with automated build/test), but says nothing on its own about how changes reach production.

## Interview Follow-Up Questions

- What would need to be true about a team's testing and monitoring maturity before they could confidently move from continuous delivery to continuous deployment?
- What's a legitimate business reason a team might deliberately keep a manual approval gate even with full confidence in their automated pipeline?
- How would you measure whether a manual approval gate is actually catching real problems, versus just adding latency without meaningful risk reduction?

## References

- [Martin Fowler: Continuous Delivery](https://martinfowler.com/bliki/ContinuousDelivery.html)
- [AWS: What's the Difference Between Continuous Delivery and Continuous Deployment?](https://aws.amazon.com/devops/continuous-delivery/)
