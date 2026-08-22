---
id: gcp-cloud-functions-gen2-concurrency-shared-state-bug-001
title: "A function migrated from Gen 1 to Gen 2 started returning occasionally-wrong results under load — what changed, and how do you fix it?"
category: gcp
subcategory: cloud-functions
technologies:
  - gcp
  - cloud-functions
difficulty: expert
question_type:
  - troubleshooting
tags:
  - gcp
  - cloud-functions
  - concurrency
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Cloud Function was migrated from Gen 1 to Gen 2 with no code changes, since the migration was expected to be transparent. Under real production load, it occasionally returns results that appear to belong to a different request — mixed-up data between concurrent requests. What changed between generations to cause this, and how do you fix it?

## Short Answer

Gen 2 functions, running on Cloud Run underneath, can handle multiple concurrent requests within the same execution environment instance by default — unlike Gen 1's strict one-request-per-instance model. If the function's code uses any global or module-level mutable state to hold per-request data (a global variable set at the start of a request and read later in the same request's processing), that state is now shared across genuinely concurrent requests on the same instance, and one request's data can leak into another's response. The fix is eliminating shared mutable state for per-request data (using local variables/closures scoped to each request) or, as a stopgap, explicitly configuring the function's concurrency to 1 to restore Gen 1's isolation guarantee.

## Detailed Explanation

Code that was perfectly correct under Gen 1's execution model can become subtly, intermittently broken under Gen 2's concurrent-request model — the bug is invisible in testing with low/no concurrent load and only manifests under genuine concurrent traffic, which is exactly why it's easy to miss in a "transparent" migration that wasn't specifically tested for this.

## Symptoms

- Results occasionally reflect data belonging to a different request than the one that received the response — a data-mixing symptom.
- The problem is intermittent and appears specifically under real concurrent load, not in low-traffic testing.
- No code was intentionally changed as part of the Gen 1 to Gen 2 migration.

## Possible Causes

- The function code stores per-request data in a global or module-level variable (set early in request processing, read later in the same request) — under Gen 1's strict one-request-per-instance model this was always safe, since only one request was ever active on a given instance at a time.
- Under Gen 2's default concurrent-request handling, two genuinely simultaneous requests on the same instance can interleave their execution — request A sets the global variable, request B's concurrent execution overwrites it before request A finishes reading it, and request A ends up using request B's data.
- The function's dependencies (a database client, an HTTP client) might themselves have module-level state that's safe for genuinely sequential use but not for concurrent use, contributing to the same class of problem even if the function's own explicit code looks clean.

## Investigation Steps

**Search the function's code for any module-level or global mutable variable that holds request-specific data**: this is the direct, most likely culprit — any variable declared outside the handler function itself, assigned a value during request processing, and read later in the same request's flow is a candidate for exactly this bug.

**Reproduce under genuine concurrent load, not sequential testing**: sending multiple truly simultaneous requests to the function (a proper load-testing tool, not sequential curl calls) and checking whether responses ever contain mismatched data directly confirms and reproduces the concurrency issue, which won't show up under any form of sequential testing.

**Check the function's currently configured concurrency setting**: `gcloud functions describe <name> --gen2` shows the configured `--concurrency` value — confirming it's set above 1 (the Gen 2 default is typically higher) verifies that concurrent execution within a single instance is actually happening, which is the precondition for this class of bug.

## Resolution

Refactor the function to avoid module-level mutable state for anything request-specific — using local variables (scoped naturally to each invocation) or explicit function parameters/closures instead ensures each concurrent request's data stays isolated to that request's own execution context, regardless of how many requests share an instance. As an immediate stopgap while the code fix is developed and tested, explicitly setting `--concurrency=1` restores Gen 1's strict one-request-per-instance isolation, trading away Gen 2's concurrency efficiency for correctness until the underlying code is fixed properly. Confirm the fix with the same concurrent-load reproduction test used during investigation.

## Key Takeaways

- Gen 2's default concurrent-request-per-instance model is the root behavioral change from Gen 1 that exposes this class of bug — code relying on Gen 1's strict single-request isolation isn't automatically safe under Gen 2.
- Module-level or global mutable state holding per-request data is the specific pattern that breaks under concurrent execution, since it's no longer implicitly isolated per request.
- This bug is invisible under sequential/low-concurrency testing and only manifests under genuine concurrent load, making it easy to miss during a "transparent" migration.
- The proper fix is eliminating shared mutable state for request-specific data; `--concurrency=1` is a valid immediate stopgap that restores Gen 1's isolation while the code is fixed.

## Interview Follow-Up Questions

- How would you audit an existing function's codebase for this specific class of unsafe global-state usage before migrating it to Gen 2?
- What's the performance/cost trade-off of setting `--concurrency=1` as a permanent fix rather than a temporary stopgap?
- How would you design a load test specifically to catch this class of concurrency bug before a Gen 1-to-Gen 2 migration reaches production?

## References

- [Google Cloud: Cloud Functions versions comparison](https://cloud.google.com/functions/docs/concepts/version-comparison)
- [Google Cloud: Cloud Run concurrency](https://cloud.google.com/run/docs/about-concurrency)
