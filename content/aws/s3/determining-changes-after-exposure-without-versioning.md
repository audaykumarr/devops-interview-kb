---
id: aws-s3-determining-changes-after-exposure-without-versioning-001
title: "How would you determine, after an S3 public-write exposure, exactly which objects were added, modified, or deleted if versioning wasn't enabled?"
category: aws
subcategory: s3
technologies:
  - aws
  - s3
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - aws
  - s3
  - incident-response
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A bucket was briefly writable by the public, and versioning wasn't enabled at the time. How would you determine, after the fact, exactly which objects were added, modified, or deleted during the exposure window, given that unversioned overwrites and deletes leave no trace in the bucket itself?

## Short Answer

Reconstruct the timeline from whatever external record of bucket activity exists outside the bucket's own current state — primarily S3 server access logs or CloudTrail data events (if either was enabled), cross-referenced against the exposure window's exact start and end timestamps — since an unversioned bucket's current object listing alone cannot distinguish pre-existing objects from exposure-window changes, or reveal what was deleted or overwritten.

## Detailed Explanation

Without versioning, S3 simply doesn't retain any record of a prior object state once it's overwritten or deleted — the bucket itself is not a source of truth for "what changed." Reconstructing the exposure window's activity therefore depends entirely on whatever external record of requests existed at the time: server access logs, CloudTrail data events, or, failing both, indirect evidence like `LastModified` timestamps on whatever objects still happen to exist.

## Symptoms

- Public write access to a bucket existed for some window of time before being discovered and closed.
- Versioning was not enabled during that window, so overwritten or deleted objects left no recoverable prior version.
- The bucket's current object listing doesn't by itself indicate which objects are original versus exposure-window additions or modifications.

## Possible Causes

- Versioning was never enabled on the bucket (an oversight, or a deliberate choice made before the exposure risk was understood).
- S3 server access logging or CloudTrail data-event logging for the bucket was also not enabled, removing what would otherwise be the primary source of truth for object-level activity.
- The exposure window's exact boundaries are only approximately known, from whenever the misconfiguration was introduced to whenever it was detected and fixed.

## Investigation Steps

**Check whether S3 server access logs were enabled for the bucket**: server access logs record each request (including PUT, POST, and DELETE operations) with a timestamp, requester (if available), and object key — if logging was enabled during the exposure window, this is the most direct source for reconstructing exactly what changed, filtered to the exposure window's timestamp range.

**Check whether CloudTrail data events were enabled for the bucket**: CloudTrail can optionally log S3 object-level API activity (data events, which are not enabled by default due to volume/cost) — if this was turned on, it provides a similarly detailed, timestamped record of object-level operations, and additionally captures the actual source IP and any available identity information for each request, which access logs may not always fully capture.

**If neither logging mechanism was enabled, rely on indirect evidence**: object `LastModified` timestamps (visible via `ListObjectsV2` or `HeadObject`) for currently-existing objects can identify objects modified or added within the exposure window, but this only covers objects that still exist — objects deleted during the window leave no `LastModified` trace at all, meaning the reconstruction from this source alone will be incomplete, and that incompleteness itself needs to be documented and communicated as part of the incident record.

**Cross-reference the exposure window's precise boundaries**: pinning down exactly when the misconfiguration was introduced (a specific deployment, a specific manual change, from infrastructure change history if available) and when it was fixed narrows the timestamp range being searched, making both the access-log/CloudTrail-based reconstruction and the `LastModified`-based indirect approach more precise and less prone to false positives from unrelated, legitimate activity outside the actual window.

**Check for any external monitoring or replication that incidentally captured state**: if cross-region replication, a backup process, or an external monitoring tool happened to be capturing bucket state independently during the window, that incidental record can sometimes fill gaps that neither access logs nor CloudTrail data events cover — worth checking even though it's not a mechanism specifically designed for this purpose.

## Resolution

Reconstruct as complete a timeline as the available logging allows, explicitly document the reconstruction's known gaps (particularly: any window before logging was checked, and any deleted objects if logging wasn't enabled), and treat the reconstruction's confidence level as part of the incident record — since decisions downstream (notification scope, remediation actions) depend on knowing not just what was found, but how confident that finding is. Going forward, enabling both versioning and either access logging or CloudTrail data events for buckets handling meaningful data removes this reconstruction problem for any future incident.

## Key Takeaways

- Without versioning, an unversioned bucket's current state alone cannot reveal what was overwritten or deleted during an exposure window.
- S3 server access logs or CloudTrail data events, if enabled, are the primary sources for reconstructing exactly what object-level activity occurred.
- Object `LastModified` timestamps are a usable but incomplete fallback — they miss anything deleted during the window entirely.
- The reconstruction's confidence level and known gaps should be explicitly documented, since they affect downstream incident-response decisions.

## Interview Follow-Up Questions

- How would you decide whether to enable CloudTrail data events by default for all buckets, given the additional cost and log volume?
- What would you do differently if the bucket held objects with predictable/sequential naming, making it easier to infer what might have been added?
- How would you communicate an incomplete reconstruction's confidence level to stakeholders who want a definitive answer?

## References

- [AWS: Logging requests using server access logging](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html)
- [AWS CloudTrail: Logging data events for Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-logging-s3-info.html)
