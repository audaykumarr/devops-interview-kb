---
id: aws-s3-block-public-acls-vs-restrict-buckets-001
title: "What's the difference between S3's 'block public ACLs' and 'restrict public buckets' as individual Block Public Access settings?"
category: aws
subcategory: s3
technologies:
  - aws
  - s3
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - aws
  - s3
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

S3 Block Public Access is actually four independent settings, not one toggle. What's the specific difference between "block public ACLs" and "restrict public buckets," and why does each matter separately?

## Short Answer

"Block public ACLs" prevents *new* public ACLs from being set (and blocks public ACLs from being applied via API calls going forward), but doesn't affect a bucket's *policy* at all. "Restrict public buckets" is different and complementary — it restricts access to buckets that already have a public bucket policy, blocking public and cross-account access to it, even without changing or removing the policy itself. Together with the other two settings ("block public ACLs" for existing ACLs, and its policy-side equivalent), the four settings independently address ACL-based versus policy-based public access, at both the "prevent new" and "restrict access to existing" layers.

## Detailed Explanation

S3 access control has historically had two independent mechanisms: ACLs (an older, more granular but less commonly recommended mechanism) and bucket policies (the more modern, primary mechanism for most access control today). Block Public Access's four settings map onto this ACL-versus-policy distinction, at two points each — preventing new grants versus restricting effect of existing ones:

**Block public ACLs** (`BlockPublicAcls`): prevents *new* PUT Bucket ACL and PUT Object ACL calls from setting a public ACL going forward — it stops new public ACL grants from being created, but does nothing about ACLs that were already public before this setting was enabled, and has no effect on bucket policies at all (a separate mechanism).

**Ignore public ACLs** (`IgnorePublicAcls`, the ACL-side equivalent of "restrict"): causes S3 to ignore any public ACLs that do exist (whether pre-existing or somehow still set), effectively neutralizing their public-granting effect without needing to actually modify or remove them — the "restrict access to existing" counterpart to "block public ACLs"' "prevent new" role.

**Block public policy** (`BlockPublicPolicy`): prevents *new* bucket policies that grant public access from being applied — analogous to "block public ACLs" but for the policy mechanism instead of ACLs.

**Restrict public buckets** (`RestrictPublicBuckets`): the policy-side equivalent of "ignore public ACLs" — restricts access to a bucket that already has a public policy, blocking public and cross-account access to it even without removing or modifying that policy — the "restrict access to existing" counterpart for policies.

**Why all four matter independently**: a bucket could have a public ACL but a private policy, a public policy but private ACLs, or public grants existing before Block Public Access was ever enabled — the four settings, applied together (which is what enabling "Block Public Access" wholesale typically means in the console, though they can be toggled independently via API), comprehensively cover both mechanisms (ACL and policy) at both points (preventing new grants and neutralizing existing ones), rather than any single setting alone providing complete protection.

**Practical implication**: understanding these as four independent, composable settings (rather than one monolithic toggle) matters when you need fine-grained control — for instance, wanting to prevent any *new* public grants going forward while still allowing an already-existing, deliberately-public bucket's policy to keep functioning as intended, which would mean enabling "block public ACLs"/"block public policy" without "restrict public buckets" for that specific bucket.

## Key Takeaways

- The four Block Public Access settings independently address ACL-based versus policy-based public access, each at two points: preventing new public grants and restricting the effect of existing ones.
- "Block public ACLs"/"block public policy" prevent new public grants going forward; "ignore public ACLs"/"restrict public buckets" neutralize the effect of grants that already exist.
- A bucket's public exposure can come from ACLs, policy, or both — understanding the settings as independent and composable matters for fine-grained control.
- Enabling "Block Public Access" broadly in the console typically toggles all four together, but they can be configured independently via the API for more nuanced cases.

## Interview Follow-Up Questions

- Why does AWS recommend using bucket policies over ACLs for most access control today, even though ACLs are still supported?
- How would you configure a bucket to prevent any new public grants while preserving its existing, deliberately-public policy?
- How would you verify, for a specific bucket, exactly which of the four settings are currently enabled or disabled?

## References

- [AWS: Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [AWS: Access control list (ACL) overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html)
