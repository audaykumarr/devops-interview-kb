---
id: kubernetes-workloads-cronjob-thousands-of-failed-jobs-001
title: "A CronJob has been silently creating thousands of failed Jobs over several days — how did this happen, and how would you prevent it?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
  - scenario
tags:
  - kubernetes
  - cronjob
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A routine cluster review turns up a CronJob that's been failing every single run for the past several days, quietly creating a new failed Job object each time it fires — thousands of them by the time anyone noticed. No alert fired. How did this accumulate silently for days, and how would you prevent it from happening again?

## Short Answer

Nothing about a CronJob's default behavior notifies anyone when its Jobs fail — it just keeps triggering on schedule regardless of whether previous runs succeeded, and without explicit `successfulJobsHistoryLimit`/`failedJobsHistoryLimit` tuning and monitoring, failed Job objects accumulate silently in the cluster with no built-in alert. Prevention means both fixing the underlying failure and adding monitoring specifically for CronJob failure rate, since the CronJob mechanism itself has no opinion about whether its runs are actually succeeding.

## Detailed Explanation

A CronJob is a pure scheduler — it creates a new Job on schedule and has no built-in concept of "this keeps failing, something is wrong." That gap between "the schedule is firing correctly" and "the thing it's scheduling is actually working" is exactly where this class of incident lives, and closing it requires monitoring the Jobs' outcomes, not the CronJob's own scheduling status.

## Symptoms

- A large number of failed Job objects (and their pods) associated with one CronJob, accumulated over an extended period.
- No prior alert or notification about the ongoing failures.
- The CronJob's schedule itself was firing correctly the whole time — only the Jobs it created were failing.

## Possible Causes

- No monitoring or alerting was ever set up on Job failure rate for this CronJob specifically — a common gap since CronJobs are often set up once and not revisited.
- `failedJobsHistoryLimit` was left at a high default or unset, allowing failed Job objects to accumulate rather than being pruned.
- The underlying failure itself (an expired credential, a changed downstream API, a code bug introduced in a deploy) started at a specific point and was never caught because nothing was watching.
- `concurrencyPolicy` wasn't set to prevent pile-up, though in this specific case each run failed quickly enough that concurrent runs weren't the primary driver of the volume — the sheer number of *scheduled* runs over several days was.

## Investigation Steps

**Check the CronJob's actual schedule frequency against the failure count**: `kubectl get cronjob <name>` shows the schedule; cross-referencing against the number of failed Jobs quickly confirms whether the volume matches "every single scheduled run failed for N days" (the base case here) versus something more unusual like overlapping concurrent runs multiplying the count further.

**Read the failure reason from the Jobs' pods directly**: `kubectl logs` on one of the failed Jobs' pods (or `kubectl describe job <name>` for the Job-level failure reason if the pod never started) reveals the actual root cause — an expired credential, a changed API response format, a resource limit that was always slightly too low — this is what actually needs fixing, not just the monitoring gap.

**Check `successfulJobsHistoryLimit`/`failedJobsHistoryLimit` on the CronJob spec**: these fields (defaulting to 3 and 1 respectively in modern Kubernetes, but sometimes overridden to a much higher number, or left unset in older manifests) control how many completed Job objects Kubernetes retains — a high or unset limit is why thousands could accumulate rather than being automatically pruned.

**Check whether `startingDeadlineSeconds` and missed-schedule catch-up behavior contributed**: if the CronJob controller itself was down or the API server was unavailable for a period, Kubernetes' catch-up behavior for missed schedules (bounded by `startingDeadlineSeconds` if set) can also contribute to a burst of Job creation — worth ruling out as a contributing factor alongside the primary "every run failed" explanation.

## Resolution

Fix the actual underlying failure (rotate the expired credential, adapt to the changed API, fix the resource limit), set `failedJobsHistoryLimit` to a reasonable bounded value so future failures don't accumulate indefinitely, and clean up the existing backlog of failed Job objects (`kubectl delete jobs -l <selector> --field-selector status.successful=0`, or similar). Confirm resolution by watching the next several scheduled runs actually succeed.

## Key Takeaways

- A CronJob has no built-in concept of "this keeps failing" — it's a pure scheduler, so silent, sustained failure is entirely possible without dedicated monitoring on Job outcomes specifically.
- `failedJobsHistoryLimit` controls how many failed Job objects accumulate before being pruned — a high or unset value is why the count can grow into the thousands.
- The actual root cause investigation happens at the pod/Job level (logs, describe), not at the CronJob level, since the CronJob object itself won't tell you why its Jobs are failing.
- Prevention requires both fixing the specific failure and adding monitoring for CronJob failure rate as an ongoing signal, not just a one-time fix.

## Interview Follow-Up Questions

- What's the difference between a CronJob's `concurrencyPolicy: Forbid` and `Replace`, and what production incident does picking the wrong one cause?
- How would you design an alert that fires after the first few failures, rather than after thousands have already accumulated?
- How would you retroactively determine exactly when the failures started, if the failed Job objects had already been partially pruned by the history limit?

## References

- [Kubernetes: CronJob](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)
- [Kubernetes: Jobs History Limits](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#jobs-history-limits)
