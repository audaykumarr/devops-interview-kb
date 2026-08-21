---
id: aws-iam-measuring-governance-change-effectiveness-001
title: "How would you measure whether an IAM governance change (like an SCP blocking user creation) actually worked, six months later?"
category: aws
subcategory: iam
technologies:
  - aws
difficulty: intermediate
question_type:
  - practical
tags:
  - aws
  - iam
  - governance
  - metrics
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Six months after rolling out an SCP-based governance change to prevent new IAM users with static keys, how would you actually measure whether it worked, rather than just assuming it did because nothing obviously went wrong?

## Short Answer

Track the actual rate of new IAM user creation (via CloudTrail) across the organization since the change, the number of denied `CreateUser`/`CreateAccessKey` calls the SCP has blocked (direct evidence it's actively doing something, not just theoretically present), the number of legitimate exceptions granted (and whether that count is reasonable or suspiciously high), and whether the detective scan (the backstop layer) is finding new instances despite the preventive control — a genuinely working governance change should show near-zero new unauthorized IAM users, a visible (not zero) count of denied attempts confirming the SCP is actually intercepting real attempts, and a small, reviewed set of legitimate exceptions.

## Detailed Explanation

**New IAM user creation rate, trending toward zero for non-exception cases**: querying CloudTrail (or AWS Config) for `CreateUser`/`CreateAccessKey` events across the organization since the SCP rollout, excluding accounts/principals covered by an approved exception, directly measures whether the practice has actually stopped — if this number isn't near zero, the SCP either has a gap (not applied everywhere it should be) or is being circumvented somehow, and needs investigation regardless of what other metrics show.

**Denied-attempt count as evidence the control is actively working, not just present**: CloudTrail also logs *denied* API calls — a non-zero count of SCP-denied `CreateUser`/`CreateAccessKey` attempts is actually a positive signal, confirming people are still occasionally trying the old pattern and the SCP is genuinely intercepting it (rather than the SCP being misconfigured or not actually in effect, which a zero-attempts, zero-denials picture wouldn't distinguish from "everyone stopped trying" versus "the SCP isn't actually applied").

**Exception count and trend, reviewed for reasonableness**: a small, stable number of legitimate exceptions (matching genuinely known constraints, like the earlier third-party-vendor case) is expected and healthy; a growing or unexpectedly large exception count suggests either the exception process is too easy to get through (undermining the governance change's purpose) or the SCP's default is genuinely too restrictive for real organizational needs, both worth investigating specifically.

**Whether the detective scan (the backstop layer) still finds anything new**: if the preventive SCP is working, the detective scan (checking for IAM users with active keys, from the earlier detection design) should find very few *new* instances after the SCP rollout — any new detective-scan findings post-rollout point to a specific gap (an account the SCP doesn't cover, a way around it not yet understood) worth root-causing directly, since the detective layer catching something is exactly the signal the preventive layer has a real hole.

**Report this as a combined picture, not any single metric alone**: no single number tells the whole story — near-zero unauthorized creation, some denied attempts (confirming active enforcement), a small reasonable exception count, and a quiet detective scan together build genuine confidence the governance change worked, in a way any one of them alone couldn't.

## Key Takeaways

- New unauthorized IAM user creation trending to near-zero (via CloudTrail, excluding approved exceptions) is the primary direct measure.
- A non-zero denied-attempt count is a positive signal confirming the SCP is actively intercepting real attempts, not just theoretically present.
- Exception count and trend should stay small and reviewed — an unexpectedly large or growing count suggests either a too-easy exception process or a genuinely too-restrictive default.
- The detective-scan backstop finding no new instances post-rollout confirms the preventive layer is genuinely closing the gap it was meant to close.

## Interview Follow-Up Questions

- How would you distinguish a genuine SCP gap from someone finding a legitimate, unanticipated way to bypass it?
- How would you present this combined metric picture to leadership in a way that's credible and actionable?
- What would you do if six months in, the metrics show the change clearly isn't working as intended?

## References

- [AWS: Service control policies (SCPs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [AWS: Logging IAM and AWS STS API calls with CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
