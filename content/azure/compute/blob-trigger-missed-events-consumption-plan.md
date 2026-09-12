---
id: azure-compute-blob-trigger-missed-events-001
title: "A Consumption-plan Azure Function triggered by new Blob Storage uploads is intermittently missing events during bursty upload periods — why, and how do you fix it?"
category: azure
subcategory: compute
technologies:
  - azure
  - azure-functions
  - blob-storage
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - azure
  - functions
  - blob-storage
  - triggers
  - consumption-plan
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A Consumption-plan Azure Function uses the classic Blob trigger to process files as they land in a container. Under steady, low-volume uploads it works reliably. During bursty periods — many blobs uploaded in a short window — some blobs are processed minutes late, and a small number never trigger the function at all. What's actually happening, and how do you fix it?

## Short Answer

The classic Blob trigger doesn't react to blob creation directly — it detects new blobs by periodically scanning storage logs, which Microsoft's own documentation says can take up to 10 minutes and can miss blobs entirely under high creation volume. The fix is switching to an Event Grid-based Blob trigger, which reacts to blob-created events pushed by Azure directly instead of polling for them, giving near-real-time, far more reliable firing.

## Detailed Explanation

This is a mechanism problem, not a scaling or code problem — the classic Blob trigger was never designed to guarantee low-latency, exactly-once detection at volume, and its behavior under load is well-documented rather than a bug to work around.

## Symptoms

- Some blobs are processed with several minutes of delay after upload, even though the function itself runs quickly once triggered.
- A small number of blobs are never processed at all, with no error logged for them — because the function never fired, there's nothing in its own logs to show.
- The problem gets worse specifically during bursts of many near-simultaneous uploads, not during steady low-volume traffic.

## Possible Causes

- **The classic Blob trigger uses storage log scanning, not a push notification.** It periodically scans the storage account's logs for new blobs, and that scan has a documented detection latency of up to 10 minutes — under normal conditions this is usually fast, but it is never a hard real-time guarantee.
- **High blob-creation volume can cause the log-scanning mechanism to miss blobs entirely**, not just delay them — this is a known limitation of the classic trigger, not a misconfiguration.
- **Consumption plan cold start compounds the problem under bursts**: if the function app has scaled to zero, the host needs to start before it can even begin processing, adding further delay on top of the trigger's own detection latency.

## Investigation Steps

**Confirm whether the trigger type is the classic (storage-log-based) Blob trigger or the newer Event Grid-based one**: check the function's binding configuration — a classic Blob trigger binds directly to a container path (e.g., `path: "container/{name}"`) with no explicit source, while an Event Grid-based Blob trigger is wired through an Event Grid subscription. If it's the classic trigger, that's the direct explanation for both the delay and the misses.

**Compare the actual blob count in the container against the count of function executions in Application Insights**, scoped to the burst window — a gap between blobs uploaded and function invocations confirms blobs were genuinely missed, not just processed with delay.

**Check whether the function app scaled from zero right before the burst**, using the Function App's scale history or Application Insights' cold-start-related traces — this tells you whether cold start is a contributing factor on top of the trigger mechanism itself.

## Resolution

Switch the trigger to the Event Grid-based Blob trigger, which subscribes to the storage account's blob-created events via Event Grid and invokes the function directly when a blob is created, rather than periodically scanning for changes — this removes the log-scanning latency and the associated risk of missed detections under volume. For any blobs already missed under the old trigger, reprocess them by listing the container directly and replaying the events, since the classic trigger gives no reliable way to know after the fact which blobs it silently skipped.

## Prevention

Treat the classic Blob trigger as unsuitable for any workload where missed or significantly delayed processing has real consequences — default to the Event Grid-based trigger for new Blob-triggered functions, and audit any existing classic-trigger functions handling business-critical data for the same risk.

## Key Takeaways

- The classic Blob trigger detects new blobs via periodic log scanning, not a push notification — Microsoft's own documentation states up to 10 minutes of detection latency, and misses are possible under high volume, not just delay.
- The Event Grid-based Blob trigger reacts to blob-created events directly and is the reliable, near-real-time alternative for any workload where missed processing matters.
- Consumption plan cold start can compound the problem during bursts, but it is not the root cause here — the trigger mechanism itself is.
- Because the classic trigger gives no record of what it silently missed, recovering from an incident means reconciling against the container's actual contents, not just replaying function logs.

## Interview Follow-Up Questions

- How would you design idempotent processing so that reprocessing blobs after this kind of incident doesn't create duplicate downstream effects?
- What would change about this problem on the Premium plan instead of Consumption, if anything?
- How would you monitor ongoing blob-to-function processing lag so this class of miss is caught automatically instead of discovered by a user report?

## References

- [Azure Functions: Blob storage trigger](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger)
