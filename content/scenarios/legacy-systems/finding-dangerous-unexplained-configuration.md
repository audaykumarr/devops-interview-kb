---
id: scenarios-legacy-systems-dangerous-unexplained-config-001
title: "You find a piece of a legacy pipeline that seems actively dangerous — overly broad credentials, say — but nobody can explain why it's configured that way. What do you do?"
category: scenarios
subcategory: legacy-systems
technologies:
  - security
difficulty: advanced
question_type:
  - scenario
tags:
  - scenarios
  - legacy-systems
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

While investigating a legacy pipeline, you find something that looks actively dangerous — credentials with far broader permissions than anything the pipeline seems to need — but nobody currently on the team can explain why it was configured that way. How do you handle this?

## Short Answer

Don't assume it's safe to fix immediately just because it looks obviously wrong, and don't leave it alone indefinitely just because you can't explain it — investigate empirically what the credential is actually used for (via access logs, not assumptions), narrow its scope in a way that's verifiable and reversible if something breaks, and treat "dangerous but unexplained" as urgent-but-not-reckless: worth prioritizing highly, but still handled with the same careful, empirical approach as any other change to a system you don't yet fully understand.

## Detailed Explanation

The tension here is real: something that looks like an obvious security problem creates pressure to fix it immediately, but the same "oddly specific complexity is often load-bearing tribal knowledge" lesson from understanding legacy systems generally applies here too — the overly broad credential might genuinely be an unnecessary historical mistake, or it might be covering some undocumented, non-obvious need that isn't visible from the pipeline's current visible configuration alone.

**Investigate empirically before changing anything**: check what the credential has actually been used for — access logs (CloudTrail-equivalent for whatever platform this is) showing the actual API calls made using it over a representative period (weeks to months, to catch infrequent-but-legitimate uses like a monthly job) is far more reliable than guessing from the pipeline's visible configuration or asking people who don't remember. This turns "nobody can explain why" into "here's empirically what it's actually being used for," which is a much stronger basis for a decision.

**Narrow scope incrementally and verifiably, not all at once**: rather than immediately replacing the broad credential with a maximally-narrow one (risking breaking something the investigation missed), narrow it to what the access-log investigation actually showed being used, then monitor for a period to confirm nothing broke — if something *was* missed, it surfaces as a specific, investigable failure rather than a mysterious, hard-to-trace one from having changed too much at once.

**Treat "dangerous but unexplained" as high-priority, not reckless-fix-immediately**: the finding itself is worth escalating and prioritizing highly — this isn't a case for "let's understand it fully before touching anything" at the same leisurely pace as a non-security concern — but "high priority" still means investigating empirically first, not skipping straight to a change based on assumption just because the risk of *not* fixing it feels urgent. An overly broad credential that's been sitting there for years is unlikely to be meaningfully more dangerous in the few days it takes to investigate properly than it would be if fixed slightly faster but based on a guess that turns out wrong.

**Document the finding and resolution regardless of outcome**: whether the investigation reveals it was truly unnecessary (the common case) or uncovers some genuine, if undocumented, reason for the breadth, recording what was found and why the eventual scope was chosen prevents the next person from rediscovering the same mystery from scratch.

## Key Takeaways

- Don't assume an overly broad credential is safe to narrow immediately just because it looks obviously wrong — and don't leave it alone indefinitely either.
- Investigate empirically (access logs showing actual usage) rather than guessing or relying on team memory that may not exist.
- Narrow scope incrementally, verified by monitoring afterward, rather than jumping straight to a maximally-narrow credential that risks breaking an undiscovered dependency.
- Document the finding and resolution regardless of outcome, so the next person doesn't have to rediscover the same mystery.

## Interview Follow-Up Questions

- How would you balance the urgency of a security finding against the risk of a hasty, poorly-investigated fix?
- What would you do if the access-log investigation itself is inconclusive (not enough historical data retained to see infrequent legitimate uses)?
- How would you communicate this finding and your remediation plan to a security team that wants it fixed immediately?

## References

- [AWS: IAM access analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
- [AWS: Logging IAM and AWS STS API calls with CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
