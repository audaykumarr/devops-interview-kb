---
id: kubernetes-workloads-job-created-multiple-pods-is-it-a-bug-001
title: "A Job is supposed to run to completion exactly once, but it created multiple pods — why, and is that actually a bug?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - kubernetes
  - jobs
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Kubernetes Job with `completions: 1` is expected to run its task exactly once. Instead, `kubectl get pods` shows several pods associated with it over time. Is this a Kubernetes bug, a misconfiguration, or expected behavior — and how would you tell which?

## Short Answer

This is expected behavior in the common case: a Job's `backoffLimit` (default 6) explicitly allows the Job controller to retry by creating a new pod each time the previous attempt's pod fails, until either a pod succeeds or the retry limit is exhausted. A Job guarantees the task will be *attempted* to completion, not that it runs in exactly one pod — check each pod's individual status (rather than assuming multiple pods means something is wrong) to see whether this is exactly that expected retry behavior, or a genuine anomaly (like two pods somehow running and completing simultaneously).

## Detailed Explanation

Kubernetes Jobs provide at-least-one-attempt semantics for the underlying task, not exactly-one-pod semantics — the distinction between "the task ran to completion" and "exactly one pod object was ever created" is easy to conflate, but they're genuinely different guarantees, and understanding which one a Job actually provides changes how you'd design anything that depends on it.

## Symptoms

- A Job with `completions: 1` (the common single-run case) has more than one associated pod visible in `kubectl get pods`.
- The Job itself eventually shows as `Complete` (or `Failed`, if retries were exhausted).
- No error is reported by Kubernetes itself — this can look alarming without necessarily being wrong.

## Possible Causes

- One or more earlier pod attempts failed (application error, OOMKilled, node failure) and the Job controller created a new pod to retry, per `backoffLimit`'s allowed retry count — this is the most common, entirely expected cause.
- The node running an earlier pod attempt failed or became unreachable before the pod could report its outcome, triggering a retry even though the original pod might have actually still been running or have completed.
- A genuine anomaly: two pods running concurrently and both attempting the task, which would only happen with a misconfigured or non-standard Job setup (this is not normal default Job behavior).

## Investigation Steps

**Check each pod's individual status and completion time**: `kubectl get pods -l job-name=<name> -o wide` shows every pod associated with the Job, with its status and start/end times — if you see one `Failed` pod followed by one `Succeeded` (or `Running`) pod, that's the retry behavior working exactly as designed.

**Check the Job's `status.failed` count against `backoffLimit`**: `kubectl get job <name> -o yaml` shows `status.failed`, which directly tells you how many attempts have failed so far — comparing this against `spec.backoffLimit` confirms whether you're looking at normal, still-within-budget retries.

**Read the failed pod(s)' logs/events for why they failed**: `kubectl describe pod <failed-pod>` and `kubectl logs <failed-pod>` reveal the actual reason for each failed attempt — this is the useful signal, since "the Job retried" isn't itself informative without knowing *why* the earlier attempts failed.

**If genuinely concerned about concurrent execution, check for overlapping running windows**: comparing each pod's actual start/end timestamps confirms whether any two pods were genuinely running simultaneously (an actual anomaly worth escalating) versus sequential retries (expected).

## Resolution

If this is confirmed as normal retry behavior, the actual work is understanding and fixing why the earlier attempt(s) failed (the same investigation as any pod failure) — the multiple pods themselves aren't the problem. If the task performed by the Job isn't safe to have partially executed and retried (i.e., it isn't idempotent — a payment charge, a non-idempotent external API call), that's a design gap worth addressing regardless of whether this particular incident's retries happened to be harmless, since a future retry under different circumstances could cause real duplicate-effect damage.

## Key Takeaways

- A Job's guarantee is that the task will be attempted to completion (within `backoffLimit`'s retry budget), not that it runs in exactly one pod.
- Multiple pods for a `completions: 1` Job is expected retry behavior in the common case — check each pod's individual status before assuming something is wrong.
- `status.failed` compared against `backoffLimit` tells you how many retries have occurred and how much budget remains.
- If the underlying task isn't safely retryable (not idempotent), that's a design gap worth fixing regardless of whether this specific incident's retries happened to be harmless.

## Interview Follow-Up Questions

- How would you design a Job for a task that must not be run twice, even if a pod fails partway through (e.g., a billing charge)?
- What's the difference between `restartPolicy: Never` and `restartPolicy: OnFailure` on a Job's pod spec, and how does each interact with `backoffLimit`?
- How would you configure a Job to fail fast (stop retrying quickly) versus retry persistently, and when would you want each behavior?

## References

- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: Jobs — Handling Pod and Container Failures](https://kubernetes.io/docs/concepts/workloads/controllers/job/#handling-pod-and-container-failures)
