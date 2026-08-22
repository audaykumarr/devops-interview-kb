---
id: gcp-cloud-functions-mitigating-cold-starts-min-instances-001
title: "A Cloud Function's p99 latency is dominated by cold starts under bursty traffic — how would you mitigate this, and what's the actual cost trade-off?"
category: gcp
subcategory: cloud-functions
technologies:
  - gcp
  - cloud-functions
difficulty: intermediate
question_type:
  - troubleshooting
  - practical
tags:
  - gcp
  - cloud-functions
  - cold-starts
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Cloud Function's average latency looks fine, but its p99 is consistently poor, and traffic is genuinely bursty (long idle periods punctuated by sudden spikes). Investigation confirms cold starts are the cause. How would you mitigate this, and what does the fix actually cost?

## Short Answer

Configure a minimum number of instances (`--min-instances`) so Cloud Functions keeps that many execution environments warm and ready continuously, absorbing the first wave of a traffic burst without paying cold-start latency — this is the direct equivalent of AWS Lambda's Provisioned Concurrency, and it trades ongoing cost (you pay for the minimum instances continuously, whether or not they're handling traffic) for eliminated cold-start latency up to that reserved capacity.

## Detailed Explanation

Cold starts happen specifically when a request arrives and no existing warm execution environment is available to handle it — `min-instances` directly addresses this by ensuring warm environments exist continuously, independent of whether traffic is currently present to use them.

## Symptoms

- Average latency looks acceptable, but p99 (or higher percentiles) is significantly worse.
- The gap correlates with traffic bursts following idle periods, rather than being spread evenly.
- Cloud Functions' own execution logs/metrics show a distinct, longer duration for the specific invocations experiencing the tail latency, consistent with cold-start initialization overhead.

## Possible Causes

- No `min-instances` configured (the default), meaning Cloud Functions can scale the instance count down to zero during idle periods, guaranteeing a cold start for the first request after any idle gap.
- A traffic pattern with genuinely long idle periods between bursts, meaning even a modest `min-instances` setting might still not be enough if the burst significantly exceeds the reserved warm capacity.
- Heavy initialization work in the function's global scope (large dependency imports, client library initialization) that specifically makes each cold start more expensive than it would otherwise be, independent of whether `min-instances` is configured at all.

## Investigation Steps

**Confirm cold starts are genuinely the cause via execution timing breakdown**: Cloud Functions logs and metrics (via Cloud Monitoring) can show execution time separately for cold-started versus warm invocations — confirming this distinction directly, rather than assuming, avoids mis-diagnosing a different latency cause that happens to correlate with traffic bursts.

**Check current `min-instances` configuration and current traffic burst size**: `gcloud functions describe <name>` shows the current setting — comparing it against the actual observed burst size (how many concurrent/near-simultaneous invocations a typical burst produces) reveals whether the setting is simply absent, or present but insufficient for the actual burst magnitude.

**Check for expensive initialization work in the function's global scope**: reviewing what happens outside the actual handler function (heavy imports, client initialization, configuration loading) identifies whether cold starts are more expensive than they need to be, independent of the `min-instances` question — reducing this initialization cost helps even the cold starts that do still occur (for traffic exceeding the warm `min-instances` capacity).

## Resolution

Set `--min-instances` to a value informed by actual observed burst size (not a guess), keeping that many execution environments continuously warm — this eliminates cold-start latency for traffic up to that reserved capacity, while traffic exceeding it still experiences cold starts for the excess. Separately, reduce unnecessary initialization work in the function's global scope to make any cold start that does occur (for traffic beyond the warm capacity) as fast as possible. Confirm the fix by re-measuring p99 latency across a subsequent representative burst.

## Key Takeaways

- `min-instances` is Cloud Functions' direct equivalent to AWS Lambda's Provisioned Concurrency — reserved, continuously-warm capacity that eliminates cold starts up to that level, at continuous cost.
- Size `min-instances` from actual observed burst patterns, not a guess — too low still leaves tail latency for the excess beyond the reserved capacity.
- Reducing initialization work in the function's global scope helps even the cold starts that do occur beyond the warm capacity, independent of the `min-instances` setting.
- This is an ongoing cost trade-off (paying for reserved instances continuously) specifically justified when cold-start tail latency is a genuine user-facing problem, not a default to apply everywhere.

## Interview Follow-Up Questions

- How would you decide the right `min-instances` value for a workload with a sharp, predictable daily traffic spike versus genuinely unpredictable bursty traffic?
- What's different about cold-start mitigation for Cloud Functions Gen 2 (which runs on Cloud Run under the hood) compared to Gen 1?
- How would you measure the actual cost impact of a given `min-instances` setting before committing to it in production?

## References

- [Google Cloud: Cloud Functions — Minimum instances](https://cloud.google.com/functions/docs/configuring/min-instances)
