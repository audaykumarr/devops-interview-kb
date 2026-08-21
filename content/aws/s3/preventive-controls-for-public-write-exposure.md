---
id: aws-s3-preventive-controls-public-write-exposure-001
title: "What preventive controls would make an S3 public-write exposure incident less damaging in the future — bucket policies, Object Lock, or something else?"
category: aws
subcategory: s3
technologies:
  - aws
  - s3
difficulty: intermediate
question_type:
  - practical
tags:
  - aws
  - s3
  - governance
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

After a public-write exposure incident on an S3 bucket, what preventive controls — beyond just fixing the immediate misconfiguration — would you put in place specifically to make this class of incident less damaging if it ever happens again?

## Short Answer

Layer several independent controls rather than relying on any single one: S3 Block Public Access (specifically the write-relevant settings) to prevent public write access from being possible at all, S3 Object Lock in compliance or governance mode to make existing objects immutable even if write access is somehow granted, versioning (so any overwrite is recoverable rather than destructive), and the fast-alerting detection design (covered elsewhere) so that if a misconfiguration does slip through, it's caught in minutes rather than being discovered later — defense in depth specifically aimed at reducing both the likelihood and the blast radius of a repeat.

## Detailed Explanation

**Block Public Access as the primary preventive layer**: enabling Block Public Access's `BlockPublicPolicy` and `BlockPublicAcls` settings (ideally at the account or Organization level, not just per-bucket) prevents a public-write-granting policy or ACL from being applied in the first place — this is the most direct preventive control specifically against the exact class of misconfiguration that caused the incident.

**Object Lock for immutability, independent of access control**: S3 Object Lock (in governance or compliance mode) makes objects immutable for a defined retention period regardless of who has write access — this is a fundamentally different layer of defense than access control, because it protects existing objects even in the scenario where a future misconfiguration does somehow grant write access again, limiting the damage to new/unprotected objects rather than the entire bucket's contents.

**Versioning to make overwrites recoverable, not destructive**: with versioning enabled, an unauthorized overwrite doesn't destroy the original object — the prior version remains recoverable — turning what would otherwise be permanent data loss into a recoverable incident, meaningfully reducing the damage even in the case where write access was actually exploited.

**Fast detection to bound the exposure window**: pairing preventive controls with the fast, event-driven exposure-alerting design (AWS Config plus EventBridge, covered elsewhere) means that even if a misconfiguration does occur despite the preventive layers, the window during which it's actually exploitable is minutes rather than the potentially much longer window before someone happens to notice — detection speed directly bounds the maximum possible damage.

**Least-privilege IAM as a complementary layer, not a replacement**: since public-write exposure can result from either a bucket policy/ACL misconfiguration or from an over-privileged IAM principal being compromised, ensuring IAM policies granting `s3:PutObject` are scoped as narrowly as possible (specific buckets/prefixes, not wildcard) reduces the damage even from a fully authenticated but compromised or over-privileged principal, which is a distinct risk from the "literally public" case but part of the same broader "who can write to this bucket" concern.

**Regular drills validate the controls actually work together**: since these are multiple independent controls, periodically testing that they function together as intended (using the controlled-test-exposure approach covered elsewhere) confirms the defense-in-depth actually holds, rather than assuming each control independently works without verifying their combined effect.

## Key Takeaways

- Block Public Access prevents the specific misconfiguration class from being possible at all — the primary preventive layer.
- Object Lock provides immutability independent of access control, limiting damage even if write access is somehow granted again.
- Versioning turns destructive overwrites into recoverable ones, reducing the damage of an actual exploit.
- Fast detection bounds the exposure window's duration, and least-privilege IAM addresses the complementary risk of a compromised authenticated principal.

## Interview Follow-Up Questions

- How would you decide which buckets need Object Lock versus which are fine with just versioning and Block Public Access?
- What's the operational cost of enabling Object Lock in compliance mode (versus governance mode), and how would that affect your decision?
- How would you validate that these controls, once implemented, actually get applied consistently to new buckets going forward?

## References

- [AWS: Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [AWS: Locking objects using S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [AWS: Using versioning in S3 buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
