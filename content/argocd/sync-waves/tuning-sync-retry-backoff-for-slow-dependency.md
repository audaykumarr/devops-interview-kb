---
id: argocd-sync-waves-tuning-retry-backoff-slow-dependency-001
title: "How does Argo CD's syncPolicy.retry backoff configuration work, and how would you tune it for a slow-starting dependency?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
difficulty: intermediate
question_type:
  - practical
tags:
  - argocd
  - retries
  - configuration
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An Argo CD Application's sync sometimes fails simply because a dependency (a database, a downstream service) hasn't finished starting up yet when the sync first attempts to reach it. How does `syncPolicy.retry`'s backoff configuration work, and how would you tune it to handle this specific "slow-starting dependency" case?

## Short Answer

`syncPolicy.retry` supports an exponential backoff between attempts, configured via `backoff.duration` (the initial wait), `backoff.factor` (the multiplier applied each subsequent retry), and `backoff.maxDuration` (a cap on how long any single wait grows to) — for a slow-starting dependency specifically, setting a longer initial duration (giving the dependency real time to become ready before the first retry) combined with a moderate factor and a generous `limit` (total retry count) gives the sync enough total time and spacing to succeed once the dependency actually comes up, without retrying so aggressively that it hammers a dependency that's still initializing.

## Detailed Explanation

**The three backoff parameters**: `backoff.duration` sets the wait before the *first* retry after an initial failure (e.g. `30s`); `backoff.factor` multiplies that duration for each subsequent retry (a factor of `2` doubles the wait each time: 30s, 60s, 120s, ...); `backoff.maxDuration` caps how large any single wait can grow to, preventing the exponential growth from producing an impractically long wait after several retries. Combined with `limit` (the maximum number of retry attempts before giving up entirely), these parameters together define the total shape and duration of the retry sequence.

**Tuning for a slow-starting dependency specifically**: the goal is giving the dependency realistic time to become ready without either giving up too early (a short total retry window that expires before the dependency is actually up) or hammering it with retries too frequently while it's still initializing (a short initial duration and low factor retrying every few seconds against something that predictably takes, say, a minute or two to start). A reasonable approach: set `backoff.duration` to a value informed by the dependency's typical startup time (if it usually takes 30-60 seconds, starting the first retry wait around there avoids wasting an attempt on a near-certain-to-fail immediate retry), a moderate `factor` (2 is common) to give increasing space between attempts if the dependency is taking even longer than typical, and a `limit` generous enough that the total retry window (summing the backoff sequence) comfortably exceeds the dependency's worst-case realistic startup time, not just its typical case.

**Balancing against genuinely broken failures**: a very generous, long retry window is good for genuinely transient slow-startup cases but means a genuinely broken sync (one that will never succeed no matter how long you wait) takes correspondingly longer to surface as a real, alert-worthy failure — this is the direct tension with the earlier alerting-design discussion, where alerting is tied to retry exhaustion; a longer retry window delays that alert correspondingly. Tuning backoff is genuinely a trade-off between tolerance for slow-but-eventually-successful cases and how quickly a truly broken case gets flagged.

**Consider addressing the root cause alongside tuning retries**: retry/backoff tuning is a reasonable mitigation, but if a dependency's slow startup is a frequent, expected pattern, a more direct fix (an init container or readiness gate ensuring the dependency is actually confirmed ready before the sync even attempts to reach it, rather than relying on retry-and-hope) can be a more robust solution than tuning retry parameters around a known, recurring timing issue.

## Key Takeaways

- `backoff.duration`, `backoff.factor`, and `backoff.maxDuration` together define the exponential wait sequence between retry attempts; `limit` caps the total number of attempts.
- For a slow-starting dependency, set the initial duration informed by its typical startup time, and ensure the total retry window (via `limit`) comfortably exceeds its worst-case startup time.
- A more generous retry window trades off against how quickly a genuinely broken sync gets flagged as failed, since alerting is often tied to retry exhaustion.
- Consider addressing a frequent slow-startup pattern at its root (readiness gating before the sync attempts to reach the dependency) rather than purely tuning retries around it.

## Interview Follow-Up Questions

- How would you empirically determine the right backoff values, rather than guessing at the dependency's typical startup time?
- What's the risk of setting `backoff.factor` too aggressively (a very high multiplier) for this use case?
- How would a readiness-gating approach (checking dependency health before syncing) be implemented concretely in this Argo CD setup?

## References

- [Argo CD: Sync options and automated sync policy — retry](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/#retry)
