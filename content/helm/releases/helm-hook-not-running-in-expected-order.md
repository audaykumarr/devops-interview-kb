---
id: helm-releases-hook-not-running-expected-order-001
title: "A Helm pre-upgrade hook Job doesn't run before the Deployment update it's supposed to precede — why, and how do you fix the ordering?"
category: helm
subcategory: releases
technologies:
  - helm
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - helm
  - hooks
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A chart defines a Job annotated as a `pre-upgrade` hook, intended to run a database migration before the application Deployment is updated to a version expecting the new schema. During an actual upgrade, the Deployment's new pods start (and immediately break, hitting the old schema) before the migration Job appears to have completed. What would cause a Helm hook to not actually block progression the way it's supposed to?

## Short Answer

The most common cause is a missing or incorrect `helm.sh/hook-weight` combined with multiple hooks of the same type, or the hook Job itself not actually reaching a terminal `Succeeded` state that Helm is waiting for — Helm does wait for pre-upgrade hooks by default before proceeding with the main release resources, so if that blocking isn't happening, either the hook annotation itself is missing/malformed, or the Job is technically "running" but never reaches `Succeeded`, and Helm's wait behavior (or a timeout) is being misunderstood.

## Detailed Explanation

Helm's hook mechanism has specific, well-defined rules for both scheduling (which hooks run before which resources) and completion criteria (what counts as "done" before Helm proceeds) — a hook silently not blocking is almost always a mismatch between what the chart author intended and one of these specific rules, not a fundamental Helm bug.

## Symptoms

- A Job annotated as a `pre-upgrade` (or similar lifecycle) hook exists in the chart.
- During an upgrade, the main release's resources (the Deployment) appear to update without waiting for the hook Job to complete.
- The hook Job may complete successfully eventually, just not before the Deployment update took effect.

## Possible Causes

- The hook annotation (`helm.sh/hook: pre-upgrade`) is missing, misspelled, or placed on the wrong resource/incorrect metadata location, meaning Helm doesn't recognize it as a hook at all — it's just treated as a normal chart resource with no special ordering.
- Multiple hooks of the same type exist without explicit `helm.sh/hook-weight` values, so their relative execution order among each other is not what was assumed (weight defaults to 0, and hooks with the same weight aren't guaranteed to run in a specific relative order).
- The hook Job's pod is stuck or failing for an unrelated reason (an image pull issue, insufficient resources), and Helm genuinely is waiting, but the wait appears to time out or get interpreted as "done" incorrectly by whoever is observing the deployment.
- The Job's `restartPolicy` or `backoffLimit` configuration means it retries in a way that delays reaching a terminal `Succeeded` state, differently than expected.

## Investigation Steps

**Verify the hook annotation is present and correctly formatted**: `helm template . --show-only <path-to-hook-resource>` or inspecting the rendered manifest directly confirms `metadata.annotations["helm.sh/hook"]` is set to the intended value (`pre-upgrade`) exactly, with no typo — a missing or misspelled annotation means Helm treats the resource as completely ordinary, with no special pre-upgrade blocking behavior at all.

**Check hook weights if multiple hooks of the same type exist**: `helm.sh/hook-weight` (a string-encoded integer, lower runs first) determines relative ordering among hooks sharing the same hook type — if the migration Job needs to run before some other `pre-upgrade` hook, and no explicit weights are set, their relative order isn't guaranteed to be what's needed.

**Check the hook Job's actual completion status during a real upgrade**: `kubectl get jobs -l <relevant-label> -w` during an upgrade, watching whether it actually reaches `Succeeded` and how long that takes — if the Job never reaches `Succeeded` (stuck, crashlooping, or failing), Helm's wait behavior is working correctly but is being defeated by the Job itself not completing, which is a different problem than a hook-ordering misconfiguration.

**Check for a hook deletion policy interfering with re-observation**: `helm.sh/hook-delete-policy` (commonly `before-hook-creation` or `hook-succeeded`) controls whether old hook Job resources are deleted before a new one runs or after success — a misconfigured delete policy can occasionally cause confusion about which specific Job execution's status is actually being observed during troubleshooting.

## Resolution

Correct the hook annotation if it was missing or malformed, add explicit `helm.sh/hook-weight` values if multiple same-type hooks need a specific relative order, or fix the underlying reason the Job itself wasn't reaching `Succeeded` (image, resources, application-level migration bug) if that was the actual blocker. Confirm the fix by performing a real upgrade and directly observing (via `kubectl get jobs -w` and the Deployment's rollout status) that the hook genuinely completes before the Deployment's pods begin updating.

## Key Takeaways

- Helm does wait for `pre-upgrade` (and other pre-*) hooks to reach a terminal `Succeeded` state before proceeding with the main release's resources — apparent non-blocking usually means a configuration mismatch, not a fundamental Helm limitation.
- A missing or misspelled `helm.sh/hook` annotation means the resource is treated as completely ordinary, with no special ordering behavior at all.
- `helm.sh/hook-weight` determines relative order among multiple hooks sharing the same hook type — without it, that relative order isn't guaranteed.
- Distinguish "the hook isn't configured to block" from "the hook is blocking correctly, but the Job itself never succeeds" — these require different fixes.

## Interview Follow-Up Questions

- What's the difference between `helm.sh/hook-delete-policy` values, and how would you choose one for a migration-style hook specifically?
- How would you design the migration Job itself to be safely re-runnable, given a `pre-upgrade` hook might run multiple times across repeated upgrade attempts?
- How would you test hook ordering and blocking behavior in a non-production environment before relying on it for a production schema migration?

## References

- [Helm: Chart Hooks](https://helm.sh/docs/topics/charts_hooks/)
