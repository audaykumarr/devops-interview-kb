---
id: argocd-sync-waves-broken-vs-transient-hook-failure-001
title: "How would you distinguish 'the migration itself is broken' from 'this was a transient failure worth retrying,' in terms of alerting design?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
difficulty: advanced
question_type:
  - practical
tags:
  - argocd
  - alerting
  - reliability
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A hook Job fails, and Argo CD's sync-level retry kicks in. Some failures are transient (a brief network blip) and worth retrying; others reflect a genuinely broken migration that will keep failing no matter how many times it's retried. How would you design alerting to distinguish these?

## Short Answer

Alert based on the retry outcome pattern, not the first failure alone: a single failure followed by a successful retry is transient and doesn't need to wake anyone up — worth logging, not alerting. Repeated failures across all configured retry attempts (exhausting `syncPolicy.retry.limit`) is a strong signal of a genuinely broken migration, since a transient issue is unlikely to persist across every retry attempt — that's the point at which a real alert, not just a log entry, is warranted.

## Detailed Explanation

**Don't alert on the first failure alone**: a single hook failure, especially for something interacting with external systems (a database connection, a network call), is exactly the class of event transient issues cause routinely — alerting a human on every single first-attempt failure, before the retry mechanism even gets a chance to work, generates alert fatigue for a large fraction of cases that resolve themselves without any human intervention needed.

**Alert on exhausted retries, not individual failures**: the meaningful signal is "this failed even after every configured retry attempt" — `syncPolicy.retry.limit` exhaustion is a much stronger indicator that whatever's wrong isn't a transient blip, since a genuinely transient issue (brief network problem, momentary resource contention) is statistically unlikely to persist across every retry, especially with backoff spacing retries apart in time. This is the appropriate trigger point for a real, human-facing alert.

**Track and surface the failure pattern itself, not just pass/fail**: logging (even if not alerting) each individual attempt's outcome, with enough detail to distinguish failure types (a timeout versus an explicit application error versus a resource-not-found) gives useful diagnostic context once a human does get involved after exhausted retries — rather than an alert that just says "it failed" with no history of what happened across the retry attempts leading up to that point.

**Consider the specific failure's error signature, not just retry-exhaustion alone**: some failures are unambiguously not transient regardless of retry count — a clear syntax error in the migration script, an explicit permission-denied error — and could reasonably trigger a faster alert even before exhausting all retries, since retrying a deterministically-broken operation wastes the retry budget without any real chance of success. Distinguishing "this class of error is inherently non-transient" from "this class of error might resolve on retry" in the alerting logic, where feasible, avoids waiting through the full retry cycle for failures that were never going to succeed.

**Backoff configuration itself affects how meaningful "retries exhausted" is as a signal**: if retries are spaced too closely together in time, they might all fail for the same transient reason still being in effect (a brief outage lasting longer than the total retry window) — tuning the backoff to space retries meaningfully apart increases confidence that exhausted retries really do indicate a persistent problem, not just a transient issue whose duration happened to exceed a too-short retry window.

## Key Takeaways

- Don't alert on a single failure — a transient issue resolving on retry is common and shouldn't require human attention.
- Alert specifically on exhausted retries (`syncPolicy.retry.limit` reached), since that's a much stronger signal of a genuinely persistent problem.
- Log each individual attempt's outcome and error type even when not alerting, giving useful context once a human does need to investigate.
- Recognizing inherently non-transient error signatures (syntax errors, permission-denied) can justify a faster alert, since retrying a deterministically-broken operation is wasted effort.

## Interview Follow-Up Questions

- How would you configure `syncPolicy.retry`'s backoff to balance giving transient issues enough time to resolve against not delaying a real alert too long?
- How would you build the error-classification logic to distinguish inherently non-transient failures from potentially-transient ones?
- What would the actual alert message need to include to be genuinely actionable for whoever receives it?

## References

- [Argo CD: Sync options and automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Google SRE Book: Emergency Response](https://sre.google/sre-book/emergency-response/)
