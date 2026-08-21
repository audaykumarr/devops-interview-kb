---
id: aws-s3-public-exposure-fast-alerting-design-001
title: "How would you design alerting so a public S3 exposure is caught within minutes, rather than being discovered by an external scanner or a customer report?"
category: aws
subcategory: s3
technologies:
  - aws
  - s3
difficulty: advanced
question_type:
  - architecture
  - security
tags:
  - aws
  - s3
  - alerting
  - security
estimated_time_minutes: 8
companies: []
related_questions:
  - aws-s3-public-bucket-exposure-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An S3 exposure that's discovered by an external security scanner or a customer report has likely already been live for hours or days. How would you design alerting so the same kind of exposure is caught and acted on within minutes of it happening instead?

## Short Answer

Replace periodic scanning with event-driven detection: wire AWS Config's continuous compliance evaluation (or a direct CloudTrail-based EventBridge rule watching for bucket-policy/ACL changes) to immediately notify someone who can act, with automated remediation for high-confidence cases — the goal is closing the gap between "the change happens" and "someone finds out" from hours/days down to seconds/minutes.

## Detailed Explanation

The reason external-scanner discovery is slow isn't a tooling gap, it's an architectural one: periodic scanning is inherently bounded by its schedule, no matter how good the scanner is. Event-driven detection removes that bound entirely by reacting to the change itself rather than periodically re-checking state.

## Requirements

- Detection must be near-real-time, not dependent on a periodic scan running every few hours.
- Alerts must reach someone who can act, with enough context to act immediately, not just a log entry nobody reviews.
- The system should distinguish a genuine new exposure from a known, intentional public bucket (some buckets are legitimately public, e.g. static website hosting).

## Architecture

**Event-driven detection via AWS Config**: an AWS Config rule (`s3-bucket-public-read-prohibited` / `s3-bucket-public-write-prohibited`, or a custom rule) evaluates bucket configuration on change, not on a fixed schedule — Config's continuous evaluation means a policy change that introduces public access triggers a rule evaluation essentially immediately after the change, rather than waiting for the next periodic scan.

**EventBridge routing to immediate notification**: wire the Config rule's non-compliant finding to an EventBridge rule that triggers a notification (SNS to a paging system, or directly to a Slack/chat webhook via a small Lambda) — the goal is the finding reaching a human (or an automated remediation) within seconds of Config evaluating the change, not sitting in a dashboard waiting to be checked.

**Optional automated remediation**: for high-confidence cases, an EventBridge-triggered Lambda can automatically enable S3 Block Public Access on the offending bucket immediately, then notify — trading a small risk of remediating a legitimately-intended change against the much larger risk of a real exposure sitting live for however long it takes a human to respond. This is a judgment call per organization, but automatic containment with human follow-up review is often preferable to manual containment with automatic exposure.

**Explicit allowlisting for intentional public buckets**: tag or otherwise register buckets that are deliberately public (a static site, a public dataset) so the alerting system can suppress those specific known cases rather than either alerting on them constantly (training the team to ignore alerts) or, worse, disabling the check broadly to avoid the noise.

**CloudTrail as a secondary signal**: independent of Config, a CloudTrail-based EventBridge rule watching specifically for `PutBucketPolicy`, `PutBucketAcl`, and `PutPublicAccessBlock` API calls provides an even faster, more direct signal than waiting for Config's evaluation cycle — catching the change at the moment it's made, which can be combined with the Config-based approach as defense in depth.

## Trade-offs

Automated remediation minimizes exposure window most aggressively but risks reverting a legitimate, intentional change if the allowlisting isn't kept current — this needs a clear, low-friction process for registering new intentional public buckets so people don't route around the safety check out of frustration. A purely alert-and-human-responds approach avoids that risk but has a slower worst-case response time, bounded by whoever's on call actually seeing and acting on the page. CloudTrail-based detection is faster than Config's evaluation cycle but requires building and maintaining the EventBridge rule and Lambda logic directly, versus using Config's built-in managed rules with less custom code.

## Key Takeaways

- Event-driven detection (AWS Config + EventBridge, or CloudTrail-based) catches exposure near-real-time, unlike periodic scanning which can leave a window of hours to days.
- Alerts need to reach a human (or automated remediation) directly, with actionable context — not just a log entry in a dashboard nobody actively watches.
- Explicit allowlisting for intentional public buckets is necessary to avoid alert fatigue or the check being disabled out of frustration.
- Automated remediation trades a small risk of reverting a legitimate change against a much larger risk of prolonged real exposure — a deliberate organizational choice, not a default.

## Interview Follow-Up Questions

- How would you handle the allowlisting process so it doesn't become its own source of friction or forgotten technical debt?
- What would you do differently for an organization with hundreds of AWS accounts, where per-account Config rules alone might not scale operationally?
- How would you measure whether this alerting system is actually working, short of waiting for a real incident?

## References

- [AWS Config: s3-bucket-public-read-prohibited](https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html)
- [AWS: Using EventBridge with AWS Config](https://docs.aws.amazon.com/config/latest/developerguide/monitor-config-with-eventbridge.html)
- [AWS: Logging Amazon S3 API calls with CloudTrail](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html)
