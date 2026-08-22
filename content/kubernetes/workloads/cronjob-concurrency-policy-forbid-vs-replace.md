---
id: kubernetes-workloads-cronjob-concurrency-forbid-vs-replace-001
title: "What's the difference between a CronJob's concurrencyPolicy: Forbid and Replace, and what production incident does picking the wrong one cause?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - comparison
tags:
  - kubernetes
  - cronjob
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A CronJob's `concurrencyPolicy` field controls what happens if a scheduled run fires while the previous run is still in progress. `Forbid` and `Replace` handle this differently from each other and from the default (`Allow`). What's the actual difference, and what real incident does picking the wrong one cause?

## Short Answer

`Forbid` skips the new scheduled run entirely if the previous one is still running; `Replace` kills the still-running previous Job and starts the new one in its place. Picking `Replace` for a Job that isn't safe to interrupt mid-execution (a data migration, a financial reconciliation) risks leaving work partially done with no completion signal; picking `Forbid` for a Job that genuinely needs to run on every scheduled tick regardless of prior duration risks silently skipping runs during a period of slowness, which can be just as bad if those runs matter individually.

## Detailed Explanation

**`Allow` (the default) permits overlapping runs — often not what's actually wanted**: without an explicit `concurrencyPolicy`, if a Job run takes longer than the schedule interval, a new one starts anyway, potentially running concurrently with the still-in-progress previous one — for a Job that isn't designed to run safely in parallel with itself (touching shared state, writing to the same output location), this can cause data races or duplicate side effects.

**`Forbid` skips the new run if the old one is still going**: this is the safer default for most Jobs that aren't safe to run concurrently with themselves — a slow run simply means the next scheduled trigger is skipped rather than causing an overlap. The risk: if a Job that's supposed to run every 5 minutes takes 20 minutes during a slow period, three scheduled runs get silently skipped — for a Job where each individual run matters (not just "eventually catch up"), this silent skipping can itself become an incident.

**`Replace` kills the in-progress run and starts fresh**: this is appropriate for Jobs where only the *latest* attempt matters, and an old, possibly-stale run should be abandoned rather than allowed to finish — a Job that refreshes a cache or computes a snapshot that only the newest result matters for is a reasonable fit. The risk: for a Job that performs a multi-step operation with real side effects (a partial data migration, a financial transaction sequence), `Replace` killing it mid-execution can leave things in a partially-completed, inconsistent state with no clean rollback, since the Job was terminated rather than allowed to reach a defined stopping point.

**The real incident pattern**: a team picks `Replace` for a Job that "just needs to run the latest version" without considering that the Job actually performs a sequence of writes that aren't idempotent or safely resumable — during a period where the Job runs slower than usual (increased data volume, a downstream dependency being slow), each new scheduled trigger kills the previous run mid-sequence, and the Job never actually completes a full run, silently leaving the underlying data in an inconsistent, partially-updated state that isn't discovered until something downstream breaks.

**Choosing correctly requires knowing the Job's actual safety properties, not just its schedule**: is the Job idempotent (safe to interrupt and restart)? Does only the latest result matter, or does each run's completion matter individually? Answering these about the actual workload — not defaulting to whichever setting sounds more "efficient" — is what determines the right choice.

## Key Takeaways

- `Forbid` skips new runs while the previous one is still in progress; `Replace` kills the in-progress run and starts a new one.
- `Forbid` risks silently skipping scheduled runs during a slow period, which matters if each run needs to happen individually.
- `Replace` risks killing a Job mid-execution, which is dangerous for any Job that isn't safely interruptible or idempotent.
- The right choice depends on the Job's actual safety properties (idempotency, whether only the latest result matters) — not a default guess.

## Interview Follow-Up Questions

- How would you redesign a non-idempotent Job to make it safe to use with `concurrencyPolicy: Replace`?
- How would you detect, after the fact, that a `Forbid`-configured CronJob has been silently skipping runs during a slow period?
- What would you use instead of either `Forbid` or `Replace` if you actually need bounded, controlled concurrency (e.g., at most 2 runs at once) rather than either extreme?

## References

- [Kubernetes: CronJob — Concurrency Policy](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#concurrency-policy)
