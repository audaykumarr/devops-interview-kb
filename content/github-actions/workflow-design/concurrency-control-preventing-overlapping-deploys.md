---
id: github-actions-workflow-design-concurrency-control-001
title: "Two people merged to main within a minute of each other, and now two deployment workflow runs are executing at the same time, racing to deploy. How do you prevent this?"
category: github-actions
subcategory: workflow-design
technologies:
  - github-actions
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - github-actions
  - concurrency
  - deployment
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Two people merged to `main` within a minute of each other. Both merges triggered a deployment workflow, and now two deployment runs are executing concurrently, racing to deploy — potentially deploying the older commit's build after the newer one, depending on which finishes last. How do you prevent this?

## Short Answer

Add a `concurrency` group to the workflow, keyed on something that identifies "the production deployment," and set `cancel-in-progress: true` — this makes GitHub Actions automatically cancel any already-running workflow run in that same concurrency group when a new one starts, so only the most recent triggering commit's deployment actually completes.

## Detailed Explanation

The race condition happens because, by default, GitHub Actions runs every triggered workflow instance independently and in parallel, with no awareness that two runs targeting the same deployment target are mutually exclusive from a correctness standpoint — nothing prevents two deploy jobs from both reaching the "deploy" step around the same time, and whichever happens to finish last determines what's actually running in production, regardless of which commit is newer.

## Symptoms

- Two or more deployment workflow runs execute concurrently after near-simultaneous merges or triggers.
- Production ends up running an older commit's build, because that run's deployment step happened to finish after a newer commit's run.
- No explicit error occurs — this is a silent race condition, not a failure that shows up in workflow logs as broken.

## Possible Causes

- The workflow has no `concurrency` configuration at all, so GitHub Actions has no instruction to serialize or cancel overlapping runs.
- The workflow triggers on every push to `main`, and merges happening in quick succession (common with an active team or during a batch of small PRs) naturally create overlapping runs.

## Investigation Steps

1. Confirm the actual sequence of events from the workflow run history — which commits triggered which runs, and their actual start/finish times — to verify this is genuinely a race condition and not a different deployment bug.
2. Check the current workflow YAML for the presence (or absence) of a `concurrency` block.
3. Determine what "the same deployment target" actually means for your setup — is it per-branch, per-environment, or something else — since this determines what the concurrency group key should be.

## Resolution

1. **Add a `concurrency` group scoped to the deployment target**:
   ```yaml
   concurrency:
     group: production-deploy
     cancel-in-progress: true
   ```
   This ensures only one workflow run in the `production-deploy` group executes at a time — a newly triggered run cancels whatever's currently in progress in that same group, so the most recently triggered (and typically most recent commit's) run is the one that actually completes.
2. **Verify the group key is specific enough** — a single hardcoded group name like `production-deploy` is correct if there's genuinely only one production deployment target; for multiple environments or branches, key the group dynamically (e.g., including `github.ref` or the target environment name) so unrelated deployments don't cancel each other unnecessarily.
3. **Confirm cancellation behavior is actually safe for your deployment process** — `cancel-in-progress: true` terminates the in-progress run mid-step if a newer one starts; for a deployment step that isn't safely interruptible (e.g., mid-way through a multi-step release process without idempotency), consider `cancel-in-progress: false` combined with queuing instead, so runs wait their turn rather than being abruptly cut off.

## Prevention

- Add concurrency groups to every deployment workflow as a standard practice, not just after hitting this race condition once.
- Document what "safely interruptible" means for each deployment process, so the cancel-in-progress choice is deliberate rather than defaulted without consideration.
- Consider whether your deployment process itself should also be idempotent/safe to interrupt regardless of workflow-level concurrency control, as defense in depth.

## Key Takeaways

- GitHub Actions runs triggered workflow instances independently by default — nothing prevents overlapping runs from racing unless you explicitly configure concurrency control.
- A `concurrency` group with `cancel-in-progress: true` ensures only the most recently triggered run in that group actually completes, canceling stale in-progress runs.
- Scope the concurrency group key to match what's actually mutually exclusive in your setup (one group per deployment target, not one global group for everything unrelated).
- Verify your deployment process is safe to interrupt mid-run before relying on `cancel-in-progress: true`; otherwise consider queuing instead of canceling.

## Interview Follow-Up Questions

- How would you handle a deployment step that truly can't be safely interrupted mid-execution, given you still want to prevent overlapping full runs?
- How would you extend concurrency control to also cover manually triggered (`workflow_dispatch`) deployments alongside automatic ones?
- How would you verify, after adding concurrency control, that the fix actually worked rather than just assuming it did?

## References

- [GitHub Docs: Control the concurrency of workflows and jobs](https://docs.github.com/en/actions/using-jobs/using-concurrency)
