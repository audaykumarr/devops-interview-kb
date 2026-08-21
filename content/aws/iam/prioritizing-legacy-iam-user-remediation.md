---
id: aws-iam-prioritizing-legacy-user-remediation-001
title: "A detective scan finds dozens of pre-existing IAM users with active keys across many accounts. How would you prioritize remediation?"
category: aws
subcategory: iam
technologies:
  - aws
difficulty: advanced
question_type:
  - scenario
tags:
  - aws
  - iam
  - remediation
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A newly-deployed detective scan for IAM users with active access keys turns up dozens of pre-existing instances across the organization's accounts. Fixing all of them at once isn't realistic. How would you prioritize which to remediate first?

## Short Answer

Prioritize by actual risk exposure, not discovery order: permission breadth (an admin-equivalent user is far more urgent than a narrowly-scoped one), account sensitivity (production accounts before sandbox/dev accounts), and key activity/age (an actively-used key in a production account with broad permissions is the clear top priority; a long-dormant key might be safe to simply deactivate rather than needing a careful migration) — building a simple scoring framework across these dimensions turns a long undifferentiated list into an actionable, ordered remediation plan.

## Detailed Explanation

**Permission breadth as the primary risk axis**: an IAM user with administrator-equivalent or broad permissions represents categorically more risk than one narrowly scoped to a specific, limited task — checking each found user's actual attached policies (not just assuming) and weighting broad-permission users highest is the most direct way to focus effort where a leaked credential would cause the most damage.

**Account sensitivity as a second axis**: the same permission breadth in a production account carrying real customer data or revenue-critical infrastructure is more urgent than in a sandbox or development account with lower stakes — cross-referencing findings against account tagging/classification (if the organization already tags accounts by sensitivity) lets remediation prioritize by actual business impact, not just technical permission scope alone.

**Key activity and age as a practical remediation-approach signal, not just urgency**: an actively-used key (recent CloudTrail activity) needs a careful, coordinated migration to role-based credentials, since something depends on it working — a dormant key with no recent activity might be safe to simply deactivate immediately (low risk of breaking anything, since nothing appears to be using it) without needing the more involved migration process at all. This distinction affects *how* to remediate, not just priority order — dormant keys are often the fastest wins (deactivate, confirm nothing broke, done), while active keys in low-permission accounts might reasonably come after high-permission actively-used keys but before low-priority dormant ones needing no real migration effort at all.

**Combine into a simple scoring framework**: rather than juggling these dimensions ad hoc, a simple weighted score (permission breadth × account sensitivity, with activity status determining remediation approach) turns the dozens of findings into an explicitly ordered list — giving a defensible, explainable prioritization rather than an arbitrary or purely chronological (discovery-order) approach.

**Communicate a realistic timeline, not an unrealistic "fix everything immediately"**: presenting the prioritized list alongside a realistic timeline (top-tier findings this week, second-tier this month, low-risk dormant keys this quarter) sets appropriate expectations with stakeholders and avoids the all-or-nothing framing that can lead to either panic or, worse, the whole effort being deprioritized as "too big to start."

## Key Takeaways

- Prioritize by permission breadth and account sensitivity — these determine actual risk exposure, not the order findings happened to be discovered in.
- Key activity/age affects remediation approach as much as priority — dormant keys are often fast wins (simple deactivation), while active keys need careful, coordinated migration.
- A simple weighted scoring framework across these dimensions turns an undifferentiated list into a defensible, ordered remediation plan.
- Communicate a realistic, tiered timeline rather than an all-at-once expectation, to keep the effort tractable and credible with stakeholders.

## Interview Follow-Up Questions

- How would you verify a key is genuinely dormant (safe to deactivate) versus just infrequently used for a legitimate periodic purpose?
- How would you handle a finding where the account owner pushes back on the priority you've assigned?
- How would you prevent this same accumulation from happening again after the initial remediation effort completes?

## References

- [AWS: IAM access keys best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [AWS: Logging IAM and AWS STS API calls with CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
