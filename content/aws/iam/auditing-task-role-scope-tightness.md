---
id: aws-iam-auditing-task-role-scope-tightness-001
title: "How would you audit whether an ECS task role or Lambda execution role is actually scoped tightly, versus just copy-pasted from a broader existing role?"
category: aws
subcategory: iam
technologies:
  - aws
difficulty: advanced
question_type:
  - practical
tags:
  - aws
  - iam
  - auditing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An ECS task role or Lambda execution role is supposed to be narrowly scoped to what that specific workload needs. How would you actually audit whether that's genuinely true, versus the role having been copy-pasted from a broader existing role and never actually tightened?

## Short Answer

Compare the role's granted permissions against its actual usage over a representative period via AWS IAM Access Analyzer's policy generation feature (which synthesizes a minimal policy from CloudTrail activity) or direct CloudTrail analysis — any granted permission the workload has never actually exercised is a strong signal of over-broad, uninspected copy-paste scope, giving concrete evidence to tighten rather than relying on reading the policy document and guessing whether it looks reasonable.

## Detailed Explanation

**IAM Access Analyzer's policy generation feature is purpose-built for this**: it analyzes a role's actual CloudTrail activity over a chosen time period and generates a policy reflecting only the actions genuinely used — comparing this generated, evidence-based policy against the role's actual current policy directly surfaces every granted permission that's never been exercised, which is the concrete, empirical signal of over-broad scope this audit needs, rather than relying on subjective judgment about whether a policy "looks" reasonable.

**Direct CloudTrail analysis as a manual/scriptable alternative**: where Access Analyzer's tooling isn't available or a more customized analysis is needed, querying CloudTrail directly for all API calls made using a specific role's credentials over a representative period (long enough to capture infrequent-but-legitimate operations, like a monthly batch job) achieves the same underlying goal — a concrete, evidence-based list of what's actually used, comparable against what's actually granted.

**Look specifically for managed policies attached wholesale**: a role using a broad AWS-managed policy (like `AmazonS3FullAccess`) rather than a tightly-scoped custom policy is an immediate, easy-to-spot signal worth flagging on sight — broad managed policies are convenient but almost never actually match a specific workload's real needs, and their presence is a strong prior indicator of copy-paste-without-tightening even before doing the deeper usage analysis.

**Check resource-level scoping, not just action-level**: a role might correctly restrict *which actions* are allowed (only `s3:GetObject`, not full S3 access) while still granting those actions against overly broad *resources* (`Resource: "*"` instead of a specific bucket ARN) — auditing needs to check both dimensions, since action-scoping alone without resource-scoping still leaves meaningfully more access than the workload actually needs.

**Make this a repeatable, periodic check, not a one-time audit**: a role that's correctly scoped today can drift as the workload evolves (new features needing new permissions get added, but permissions for removed functionality rarely get proactively removed) — running this comparison periodically (quarterly, or triggered by significant workload changes) catches this natural drift rather than assuming a one-time tightening stays accurate indefinitely.

## Key Takeaways

- IAM Access Analyzer's policy generation feature synthesizes an evidence-based minimal policy from actual CloudTrail activity, directly comparable against the role's current policy to find unused, over-broad permissions.
- Direct CloudTrail analysis achieves the same underlying comparison manually where Access Analyzer tooling isn't used.
- Broad AWS-managed policies attached wholesale are an immediate, easy-to-spot signal of likely copy-paste scope, worth flagging before deeper analysis.
- Audit both action-level and resource-level scoping — a role can be correctly action-scoped while still being resource-over-broad.
- This should be a periodic, repeatable check, since correctly-scoped roles can drift as workloads evolve over time.

## Interview Follow-Up Questions

- How would you handle a legitimately infrequent permission (used once a year for an annual process) that Access Analyzer's shorter observation window might flag as unused?
- How would you prioritize which roles to audit first across a large organization with hundreds of IAM roles?
- How would you automate this comparison to run continuously rather than as periodic manual audits?

## References

- [AWS: IAM Access Analyzer policy generation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html)
- [AWS: Logging IAM and AWS STS API calls with CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
