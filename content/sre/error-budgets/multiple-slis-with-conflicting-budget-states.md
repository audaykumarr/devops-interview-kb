---
id: sre-error-budgets-multiple-slis-conflicting-states-001
title: "How do you handle a service with multiple different user-facing SLIs — latency, availability, correctness — that might have conflicting error budget states at the same time?"
category: sre
subcategory: error-budgets
technologies:
  - sre
difficulty: advanced
question_type:
  - scenario
tags:
  - sre
  - slo
  - error-budget
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A service might have several distinct SLIs — availability, latency, correctness — each with its own SLO and error budget. What happens when they disagree — one budget is healthy while another is exhausted? Does the error budget policy apply per-SLI, or does the whole service freeze if any one of them is exhausted?

## Short Answer

Track and evaluate each SLI's budget independently, but apply the error budget policy's consequence (freezing risky changes) based on the *most exhausted* relevant SLI — a service with a healthy availability budget but an exhausted latency budget should still generally freeze changes that could plausibly affect latency further, since the whole point of the policy is protecting the specific thing that's actually degraded, not requiring every dimension to simultaneously agree before taking action.

## Detailed Explanation

Different SLIs measure genuinely different aspects of user experience, and a service can legitimately be healthy on one axis while struggling on another — a service might be perfectly available (no outages) and perfectly correct (no wrong answers) while still having a real, budget-exhausting latency problem, or vice versa. Treating these as a single combined signal (averaging them, or requiring all of them to agree before triggering policy) loses the specific information about *which* dimension is actually the problem, which matters for deciding what response is appropriate.

**Track and evaluate independently**: each SLI should have its own SLO, its own error budget, and its own burn-rate tracking — this preserves the specific signal about which dimension of user experience is actually degraded, rather than blending them into one number that obscures which problem actually exists.

**Apply policy based on the most-exhausted relevant SLI, not requiring unanimous agreement**: if the latency budget is exhausted while availability and correctness are healthy, the error budget policy's consequence (freezing risky changes) should still apply — specifically to changes that could plausibly affect latency further, since that's the actual degraded dimension. Requiring *all* SLIs to be exhausted before triggering any policy response would mean a genuinely serious, sustained latency problem never triggers the intended response as long as availability happens to be fine — defeating the purpose of tracking latency separately in the first place.

**Consider whether the freeze should be blanket or targeted**: a more sophisticated policy might scope the freeze specifically to changes relevant to the exhausted dimension (freeze latency-affecting changes specifically, while still allowing changes unrelated to latency, like a UI copy change, to proceed) rather than an indiscriminate freeze on all changes regardless of relevance — this requires more nuanced judgment about which changes are actually relevant to which SLI, but avoids unnecessarily blocking unrelated, low-risk work just because a different, unrelated dimension happens to be degraded.

**Weight SLIs by actual user impact, not treat them as equally important by default**: not every SLI necessarily deserves equal policy weight — a correctness SLO breach (users getting wrong answers) is often more severe than a latency SLO breach (users waiting slightly longer), and a well-designed policy might reflect that asymmetry rather than treating every SLI's exhaustion as triggering an identical response.

## Key Takeaways

- Track each SLI's error budget independently to preserve the specific signal about which dimension of user experience is actually degraded.
- Apply the error budget policy based on the most-exhausted relevant SLI, not requiring all SLIs to simultaneously agree before triggering any response.
- Consider scoping the freeze to changes relevant to the specific exhausted dimension, rather than an indiscriminate blanket freeze across everything.
- Weighting different SLIs by actual user impact (correctness versus latency, for instance) reflects that not every dimension necessarily deserves an identical policy response.

## Interview Follow-Up Questions

- How would you determine which changes are "relevant" to a specific SLI for the purposes of a targeted freeze, in practice?
- How would you communicate a multi-SLI error budget state clearly to engineers, rather than an oversimplified single "healthy/unhealthy" signal?
- How would you weight SLIs differently in a policy, and how would you justify that weighting to stakeholders?

## References

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
