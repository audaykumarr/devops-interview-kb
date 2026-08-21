---
id: aws-s3-public-bucket-exposure-001
title: "A security scanner just flagged one of your production S3 buckets as publicly readable. Walk through how you'd respond in the first hour and prevent a repeat."
category: aws
subcategory: s3
technologies:
  - aws
  - s3
  - security
difficulty: advanced
question_type:
  - troubleshooting
  - security
tags:
  - s3
  - security
  - incident-response
  - least-privilege
estimated_time_minutes: 10
companies: []
related_questions:
  - aws-iam-least-privilege-migration-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A third-party security scanner just flagged one of your production S3 buckets as publicly readable. You don't yet know how long it's been exposed or what's in it. Walk through how you'd respond in the first hour, and what you'd change afterward to prevent a repeat.

## Short Answer

Contain first, investigate second: lock the bucket down immediately (enable Block Public Access, and tighten the bucket policy/ACL if Block Public Access alone doesn't cover the exposure path), then use S3 access logs or CloudTrail data events to determine what was actually exposed and whether it was accessed by anyone outside your organization. Only after containment and a clear picture of impact do you decide on notification or remediation for any exposed data.

## Detailed Explanation

The instinct to "figure out what happened first" is backwards for an active exposure — every minute the bucket stays public is another minute of potential access, so containment comes before investigation. AWS gives you a fast, blunt containment tool: S3 Block Public Access, settable at the bucket or account level, which overrides public bucket policies and ACLs without you having to first understand exactly which policy statement or ACL grant caused the exposure. Flip it on immediately, then investigate the root cause with the clock no longer running against you.

The investigation itself has two separate questions: what caused the exposure, and was the exposed data actually accessed by anyone untrusted. The cause is usually one of: a bucket policy with a `Principal: "*"` statement, a legacy ACL granting `AllUsers` or `AuthenticatedUsers` read access, or (less obviously) a public access point. The access question requires actual logs — S3 server access logging or, more reliably, CloudTrail S3 data events (which must be explicitly enabled per bucket or via an org-wide trail, and often aren't on by default because of their cost and volume) — filtered to the exposure window, looking at requester IPs and identities that aren't part of your known infrastructure.

If data events weren't enabled before the incident, you genuinely cannot know with certainty whether anyone external accessed the bucket during the exposure window — that uncertainty itself is a finding, and it's exactly the gap that drives the "prevent a repeat" half of the question: exposure detection and access logging need to exist *before* the next incident, not be something you wish you'd turned on afterward.

## Symptoms

- A security scanner, AWS Trusted Advisor, IAM Access Analyzer for S3, or an external report indicates a bucket allows public read (and sometimes write) access.
- No internal alert fired before the external report — meaning existing monitoring didn't catch it.

## Possible Causes

- A bucket policy statement with an overly broad `Principal` (e.g. `"*"`) intended for a narrow use case (like static website hosting) but not scoped with a `Condition`.
- A legacy ACL grant to the `AllUsers` or `AuthenticatedUsers` predefined group, often left over from an old configuration or console misclick.
- Account-level or bucket-level S3 Block Public Access settings were disabled, intentionally or by mistake, allowing an otherwise-blocked public policy to take effect.
- A public access point or cross-account access misconfiguration that isn't visible from the bucket policy alone.

## Investigation Steps

1. Enable S3 Block Public Access on the bucket (and consider the account level) immediately to contain exposure while you investigate.
2. Pull the bucket's current policy and ACL to identify exactly which statement or grant caused the public access.
3. Check whether S3 server access logging or CloudTrail S3 data events were enabled for this bucket before the incident.
4. If logs exist, filter to the likely exposure window and look for requests from IPs/identities outside your known AWS accounts and corporate ranges.
5. Check `git blame`/change history (CloudTrail management events like `PutBucketPolicy`, `PutBucketAcl`, `PutPublicAccessBlock`) to find when and by whom the exposing change was made.
6. Inventory what's actually in the bucket to assess the sensitivity of anything that may have been exposed.

## Commands

```bash
aws s3api put-public-access-block --bucket my-bucket \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api get-bucket-policy --bucket my-bucket
aws s3api get-bucket-acl --bucket my-bucket

aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=my-bucket \
  --start-time 2026-08-01T00:00:00Z --end-time 2026-08-21T00:00:00Z

aws s3api get-bucket-logging --bucket my-bucket
```

## Resolution

Once contained, fix the actual root cause rather than leaving Block Public Access as a permanent band-aid over a still-broken policy: correct the bucket policy to scope access to specific principals (IAM roles, specific AWS accounts, or a CloudFront Origin Access Control if it's meant to serve public web content), and remove any lingering public ACL grants. If the investigation shows genuine external access to sensitive data, follow your incident response and legal/compliance process for breach assessment and any required notification — that decision sits with security/legal, not purely with engineering.

## Prevention

- Enable S3 Block Public Access at the account level by default, and require an explicit, reviewed exception for any bucket that genuinely needs public access (e.g. via CloudFront with Origin Access Control instead of a public bucket policy).
- Turn on IAM Access Analyzer for S3 (or AWS Config rules like `s3-bucket-public-read-prohibited`) so public exposure is detected and alerted on automatically, not discovered externally.
- Enable CloudTrail S3 data events (at least for buckets holding sensitive data) before an incident, so "was this accessed?" has a real answer when you need it.
- Treat any change to a bucket policy or ACL touching public access as requiring review, via infrastructure-as-code and pull requests rather than ad hoc console edits.

## Interview Follow-Up Questions

- How would your approach differ if the bucket also allowed public *write* access, not just read?
- What's the difference between S3 Block Public Access and a restrictive bucket policy, and why is Block Public Access a stronger containment tool during an active incident?
- How would you design alerting so this kind of exposure is caught in minutes rather than discovered by an external scanner?

## Key Takeaways

- Contain first: S3 Block Public Access can shut down exposure immediately without first understanding the exact misconfiguration.
- Whether data was actually accessed depends entirely on whether access logging was already enabled — that's a gap to close before an incident, not during one.
- Distinguish the two investigations: what caused the exposure, and who accessed the data during it.
- Prevention means default-deny at the account level plus automated detection, not relying on scanners to find it first.

## References

- [AWS S3: Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [AWS: Logging Amazon S3 API calls using AWS CloudTrail](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging.html)
- [AWS IAM Access Analyzer for S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-analyzer.html)
