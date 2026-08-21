---
id: argocd-sync-waves-presync-status-on-retried-sync-001
title: "What happens to a PreSync hook Job that succeeded on a previous sync, if the overall sync is retried after a later hook fails?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - kubernetes
difficulty: advanced
question_type:
  - conceptual
tags:
  - argocd
  - hooks
  - retries
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A sync has multiple hooks in sequence. The first `PreSync` hook succeeds, but a later hook or the main sync fails, triggering an Argo CD sync-level retry. Does the already-succeeded `PreSync` hook run again on the retry?

## Short Answer

Yes, by default — a sync-level retry re-runs the sync from the beginning, including re-executing `PreSync` hooks that already succeeded on the prior attempt, unless the hook is specifically designed (via `hook-delete-policy` and its own idempotency) to handle being invoked again safely. This is exactly why hooks used in a sync that might need retrying should be built to be safely re-runnable, not just correct on a single execution.

## Detailed Explanation

Argo CD's sync-level retry (`syncPolicy.retry`) retries the *entire sync operation* when it fails, not just the specific step that failed — this means a retry restarts the sync's phase sequence from the top, including re-running `PreSync` hooks, even ones that completed successfully on the previous attempt. There's no built-in "resume from where it failed" semantics that would skip already-succeeded hooks specifically.

**Why this matters concretely**: a `PreSync` hook that performs a genuinely one-time, non-idempotent action (sending a notification, incrementing a counter, a migration that isn't itself idempotent) would incorrectly repeat that action on every retry, not just execute it once as the name "PreSync" might suggest. A hook that's naturally idempotent (a migration using the content-hash-naming or a properly idempotent script) handles being re-invoked safely by design — running again either does nothing (already in the target state) or safely re-applies the same effect with no harmful duplication.

**The `hook-delete-policy` setting interacts with this too**: depending on the configured deletion policy (`HookSucceeded`, `BeforeHookCreation`, `HookFailed`), a successfully-completed hook Job might already be deleted by the time a retry happens (if `HookSucceeded` is set), meaning the retry creates a fresh Job object and runs the hook's logic again regardless — reinforcing that idempotent hook design is the correct expectation, not an edge case to work around.

**The practical implication for hook design**: any hook used within a sync that has retry enabled should be written assuming it might execute more than once for the same logical sync attempt — either through genuine idempotency (safe to run multiple times, same net effect) or through its own internal check (verify whether its work is already done before doing it again) — rather than assuming "PreSync" implies "guaranteed to run exactly once per sync."

## Key Takeaways

- A sync-level retry restarts the sync from the beginning by default, re-running `PreSync` hooks that already succeeded on the prior attempt.
- There's no built-in "skip already-succeeded hooks on retry" mechanism — hooks need to handle potential re-invocation themselves.
- `hook-delete-policy: HookSucceeded` typically means the hook's prior Job is already gone by retry time, so a fresh execution happens regardless.
- Hooks used within a retry-enabled sync should be designed assuming they might run more than once for a single logical sync attempt, via genuine idempotency or an internal completion check.

## Interview Follow-Up Questions

- How would you design a notification-sending hook to avoid sending duplicate notifications on a retry?
- What would you do if a hook's action is genuinely impossible to make idempotent (e.g. an external API call with real side effects)?
- How does this retry behavior interact with sync waves — do earlier waves also re-execute on a retry?

## References

- [Argo CD: Sync options and automated sync policy](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
