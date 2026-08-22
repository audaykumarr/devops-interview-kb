---
id: gcp-storage-fast-public-exposure-alerting-design-001
title: "How would you design a fast, event-driven alerting system to catch an accidentally-public Cloud Storage bucket within minutes, GCP-native?"
category: gcp
subcategory: storage
technologies:
  - gcp
  - cloud-storage
difficulty: expert
question_type:
  - architecture
tags:
  - gcp
  - cloud-storage
  - security
  - alerting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You want to catch it within minutes — not discover it days later during a routine review — whenever any bucket in your GCP organization becomes accidentally publicly accessible (a misconfigured IAM binding granting `allUsers` access). How would you design this using GCP-native tooling, end to end?

## Short Answer

Use Cloud Asset Inventory's real-time feed feature to watch for IAM policy changes on Cloud Storage buckets, filtered specifically to changes introducing `allUsers`/`allAuthenticatedUsers` bindings, routed through Pub/Sub to a lightweight Cloud Function (or Cloud Run service) that evaluates the change and sends an alert — this gives detection within roughly the same "minutes, not days" latency as the equivalent AWS Config-plus-EventBridge design, using GCP's own native change-detection and event-routing primitives.

## Requirements

- A newly-introduced public IAM binding on any bucket in the organization must be detected within minutes, not discovered via periodic review.
- Buckets deliberately configured as public (a legitimate static website, for instance) must not trigger false-positive alerts.
- The design should scale across an entire organization with many projects, not require per-project manual setup.

## Detailed Explanation

The core design challenge is the same one this class of problem always has: react to the specific *change* that introduces public access, in near-real-time, rather than periodically scanning current state — GCP's Cloud Asset Inventory real-time feed is purpose-built for exactly this reactive, change-driven pattern.

## Architecture

**Cloud Asset Inventory's real-time feed watches for resource/IAM changes as they happen**: configuring a feed (`gcloud asset feeds create`) scoped to the organization, watching for IAM policy changes on `storage.googleapis.com/Bucket` resources, means GCP pushes a notification the moment a matching change occurs — this is the change-driven trigger, avoiding any need to periodically poll or scan for current state.

**Route the feed's output through Pub/Sub to decouple detection from response**: the feed publishes its change notifications to a Pub/Sub topic — this gives a durable, buffered handoff between "a change happened" and "something processes and acts on it," the same architectural role Kafka/EventBridge plays in equivalent designs on other platforms.

**A Cloud Function (or Cloud Run service) subscribed to that topic evaluates whether the change actually introduced public access**: the function inspects the IAM policy change's actual content, checking specifically for a newly-added binding granting `roles/storage.objectViewer` (or similar) to `allUsers`/`allAuthenticatedUsers` — this filtering logic is what distinguishes "an IAM change happened" (many of which are routine and not concerning) from "a change specifically introduced public access" (the actual condition worth alerting on).

**An allowlist mechanism suppresses alerts for genuinely, deliberately public buckets**: maintaining a list of buckets deliberately configured as public (a legitimate static website bucket, for instance) — checked by the same evaluating function before deciding to alert — prevents the system from generating noise for known-intentional configurations, the same suppression pattern needed in any exposure-alerting design regardless of cloud provider.

**Alert delivery integrates with whatever the team's actual on-call/notification tooling is**: the evaluating function's final step, upon confirming a genuine, non-allowlisted public exposure, sends the actual alert (to a paging system, a Slack channel, or similar) — this final delivery step is straightforward once the detection and filtering logic upstream has already done the harder work of determining an alert is actually warranted.

## Trade-offs

This design requires real setup investment (configuring the organization-scoped feed, building and deploying the evaluating function, maintaining the allowlist) — but this is the same category of investment any real-time security-alerting system requires, and the alternative (periodic scanning, which introduces detection latency measured in the scanning interval rather than minutes) is meaningfully worse for something as time-sensitive as public data exposure. The allowlist itself needs ongoing maintenance (the same staleness-risk consideration as any allowlist), which is a real, ongoing cost rather than a one-time setup task.

## Key Takeaways

- Cloud Asset Inventory's real-time feed is GCP's purpose-built mechanism for reacting to IAM/resource changes as they happen, avoiding periodic-scan-based detection latency.
- Routing the feed through Pub/Sub decouples detection from response, the same architectural pattern as Kafka/EventBridge in equivalent designs elsewhere.
- The evaluating function's core job is distinguishing "an IAM change happened" from "a change specifically introduced public access" — most IAM changes are routine and not alert-worthy.
- An allowlist for genuinely, deliberately public buckets is necessary to avoid alert fatigue, and needs the same ongoing maintenance discipline as any allowlist mechanism.

## Interview Follow-Up Questions

- How would you extend this design to also catch a public exposure caused by a signed URL, given that's a fundamentally different mechanism than an IAM binding change?
- How would you test this alerting pipeline end-to-end without creating a genuine, even if brief, public exposure in a real environment?
- How would you scale this design's allowlist management across an organization with many teams each owning their own legitimately-public buckets?

## References

- [Google Cloud: Cloud Asset Inventory real-time feed](https://cloud.google.com/asset-inventory/docs/monitoring-asset-changes)
- [Google Cloud: Public access prevention](https://cloud.google.com/storage/docs/public-access-prevention)
