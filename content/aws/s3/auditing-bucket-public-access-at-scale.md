---
id: aws-s3-auditing-bucket-public-access-scale-001
title: "How would you audit all S3 buckets in an account for their current Block Public Access and policy configuration, at scale?"
category: aws
subcategory: s3
technologies:
  - aws
  - s3
difficulty: advanced
question_type:
  - practical
tags:
  - aws
  - s3
  - auditing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An organization has hundreds of S3 buckets across many accounts. How would you audit all of them for their current Block Public Access and bucket policy configuration, at scale, rather than checking each one manually?

## Short Answer

Use AWS Config's aggregated view (or a scripted pass using the S3 API's `GetBucketPolicyStatus`/`GetPublicAccessBlock` across every bucket in every account, via AWS Organizations' multi-account access) combined with IAM Access Analyzer's dedicated public-access findings — Access Analyzer specifically flags resources (including S3 buckets) it determines are actually reachable from outside the account, which is a more direct and reliable signal than manually reasoning through each bucket's policy and Block Public Access settings independently.

## Detailed Explanation

**AWS Config's managed rules give a scalable, continuous view**: AWS Config's `s3-bucket-public-read-prohibited` and `s3-bucket-public-write-prohibited` managed rules continuously evaluate every bucket's compliance, and AWS Config's multi-account, multi-region data aggregation feature lets you view compliance status across an entire organization from one place — turning "audit hundreds of buckets across many accounts" into "review one aggregated compliance dashboard," rather than manually visiting each account.

**IAM Access Analyzer's public-access findings are the more semantically precise signal**: Access Analyzer specifically analyzes the *combination* of a bucket's policy, ACLs, and Block Public Access settings together, to determine whether the bucket is actually reachable by an external principal — this is more reliable than checking Block Public Access status in isolation, since a bucket could have Block Public Access correctly enabled but still have some other misconfiguration, or the reverse (public access technically possible via policy but effectively blocked by Block Public Access) — Access Analyzer reasons about the actual net effect, not just individual settings.

**Scripted API-based audit as a direct, customizable alternative**: for a fully custom audit (beyond what Config/Access Analyzer's built-in views provide), a script using the S3 API's `list-buckets` combined with `get-bucket-policy-status` and `get-public-access-block` for each bucket, run across every account via AWS Organizations' cross-account role assumption, produces a complete, custom-formatted inventory — more flexible than the built-in tools' output format, at the cost of building and maintaining the script.

**Combine findings with bucket ownership/purpose context**: a raw list of "these buckets are publicly accessible" isn't itself actionable without knowing whether each one is deliberately public (a legitimate static website) or accidentally exposed — cross-referencing findings against a bucket-ownership/purpose registry (tags, naming conventions, or a maintained inventory) turns the raw audit output into an actionable list of genuinely concerning findings versus expected, deliberate configurations.

**Make this a continuous, not one-time, process**: given how easily a new bucket can be created with an unintended public configuration, running this audit as an ongoing, automated process (Config's continuous evaluation, or a scheduled script run) — feeding into the fast-alerting design covered elsewhere — is what actually prevents new exposures, versus a one-time audit that only catches the current state at the moment it was run.

## Key Takeaways

- AWS Config's managed rules with multi-account aggregation give a continuously-updated, scalable compliance view across an entire organization from one place.
- IAM Access Analyzer's public-access findings reason about the actual net effect of a bucket's policy, ACLs, and Block Public Access together, more reliably than checking any one setting in isolation.
- A custom scripted audit (S3 API + cross-account role assumption) offers full flexibility at the cost of building and maintaining it yourself.
- Cross-reference findings against bucket ownership/purpose context to distinguish deliberate public configuration from genuine accidental exposure, and run the audit continuously, not as a one-time check.

## Interview Follow-Up Questions

- How would you set up the cross-account role assumption needed for a scripted audit across an entire AWS Organization?
- What would you do if a bucket's ownership/purpose is genuinely unknown — how would you investigate and resolve that ambiguity?
- How would this audit integrate with the fast-alerting design for genuinely new exposures, versus a periodic broader compliance review?

## References

- [AWS Config: s3-bucket-public-read-prohibited](https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html)
- [AWS: IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
- [AWS: Multi-Account multi-Region data aggregation for AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html)
