---
id: gitlab-merge-request-workflow-stuck-mergeability-check-001
title: "A merge request's 'Merge' button is greyed out with the widget stuck on 'Checking if merge request can be merged...' indefinitely, even though the pipeline passed. How do you debug this?"
category: gitlab
subcategory: merge-request-workflow
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - gitlab
  - merge-requests
  - troubleshooting
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A merge request's pipeline has passed and all required approvals are in place, but the "Merge" button stays greyed out and the merge request widget is stuck showing "Checking if merge request can be merged..." indefinitely. How do you actually debug this, rather than just waiting or repeatedly refreshing the page?

## Short Answer

This status specifically means GitLab's background mergeability check (which computes whether the source branch can be cleanly merged into the target, independent of pipeline/approval status) hasn't completed or is stuck — the most common causes are a genuine merge conflict with the target branch that hasn't been surfaced clearly yet, a very large or complex diff taking unusually long to process, or a background job processing issue on GitLab's side (more common on self-managed instances under load). Forcing a re-check (via a trivial push, or the API's merge-request refresh action) is the fastest way to determine which situation you're actually in.

## Detailed Explanation

The "Checking if merge request can be merged" state reflects a specific background computation GitLab performs — independent of pipeline status and approvals, GitLab needs to determine whether the source branch's changes can actually be cleanly applied on top of the current target branch, and this check can genuinely get stuck or delayed for a few different reasons.

## Symptoms

- The merge request widget shows "Checking if merge request can be merged..." for an extended period, well beyond the brief moment this check normally takes.
- The pipeline has already completed successfully, and required approvals are satisfied, ruling out those as the blocking factor.
- Refreshing the page doesn't resolve the stuck state on its own.

## Possible Causes

- The source branch actually has a genuine merge conflict with the current target branch, but the conflict detection/reporting UI hasn't clearly surfaced this yet, showing the ambiguous "checking" state instead of a clear conflict message.
- The merge request's diff is unusually large or complex, causing the mergeability computation to take longer than the UI's typical expectations, without necessarily being fully stuck.
- On self-managed GitLab instances specifically, a background job processing backlog (Sidekiq queue delay) can cause this check to be genuinely delayed rather than actually failed.
- The target branch has changed since the last mergeability check ran, and a new check hasn't been triggered automatically to reflect the updated target state.

## Investigation Steps

1. Check whether the source branch has actually diverged from the target in a way that would cause a real merge conflict — comparing the branches directly, or attempting a local merge/rebase to see if a conflict actually exists.
2. For a self-managed GitLab instance, check the instance's Sidekiq/background job queue health and processing lag, since this class of issue is more likely to be an infrastructure symptom on self-hosted instances than on GitLab.com.
3. Force a fresh mergeability check by pushing a trivial change (or, via the API, calling the merge request's endpoint in a way that triggers re-computation) to see whether the stuck state resolves or reveals an actual conflict.
4. Check whether the target branch has received new commits since the merge request was last updated, which could mean the cached mergeability status is stale and needs to be explicitly refreshed.

## Resolution

1. **If a genuine merge conflict is found**: resolve it in the normal way (locally merging/rebasing the target branch into the source branch, resolving conflicts, and pushing the result) — this is the most common actual root cause once properly investigated, even when the UI's ambiguous "checking" state doesn't make it immediately obvious.
2. **If it's a background job delay on a self-managed instance**: this typically resolves once the job queue catches up, though persistent delays may indicate the instance needs additional Sidekiq worker capacity or an investigation into what's causing the backlog.
3. **If forcing a fresh check (trivial push, or API-triggered refresh) resolves it**, the original stuck state was likely a stale cached check that simply needed to be explicitly re-triggered by a new event.
4. **Verify the fix** by confirming the merge request widget now shows a clear, resolved mergeability status (either "ready to merge" or a specific, actionable conflict message), not just that the "checking" spinner has gone away.

## Prevention

- Keep merge requests reasonably small and up to date with their target branch, reducing both the chance of genuine conflicts and the complexity of the mergeability computation.
- For self-managed instances, monitor Sidekiq queue health as an ongoing operational metric, so background job delays affecting merge request checks (and other GitLab functionality relying on background processing) are caught proactively.
- Rebase or merge the target branch into long-lived feature branches periodically, rather than letting them diverge significantly before attempting to merge, reducing the likelihood of this exact stuck-check scenario.

## Key Takeaways

- "Checking if merge request can be merged..." reflects GitLab's background mergeability computation, independent of pipeline and approval status — those passing doesn't resolve this specific check.
- The most common real cause is a genuine merge conflict with the target branch that hasn't been clearly surfaced yet in the UI.
- On self-managed instances, background job (Sidekiq) processing delays are a real, infrastructure-level possible cause worth checking specifically.
- Forcing a fresh check (a trivial push, or an API-triggered refresh) is the fastest way to distinguish a stale cached status from a genuine, unresolved conflict.

## Interview Follow-Up Questions

- How would you monitor Sidekiq queue health proactively on a self-managed GitLab instance to catch this class of delay before users report it?
- How would you handle a merge request with a conflict that's genuinely complex to resolve, involving many overlapping changes from a long-lived branch?
- What's the difference between this mergeability check and the separate pipeline-status check, in terms of what GitLab is actually evaluating for each?

## References

- [GitLab Docs: Merge requests](https://docs.gitlab.com/ee/user/project/merge_requests/)
- [GitLab Docs: Troubleshooting Sidekiq](https://docs.gitlab.com/ee/administration/sidekiq/sidekiq_troubleshooting.html)
