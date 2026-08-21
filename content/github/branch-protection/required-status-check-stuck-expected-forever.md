---
id: github-branch-protection-status-check-stuck-expected-001
title: "A required status check on a GitHub branch protection rule is permanently stuck showing \"Expected — Waiting for status to be reported\", blocking every PR from merging. What's going on?"
category: github
subcategory: branch-protection
technologies:
  - github
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - github
  - branch-protection
  - github-actions
  - troubleshooting
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A branch protection rule on `main` requires a status check named `build` to pass before merging. Every PR now shows that check permanently stuck as "Expected — Waiting for status to be reported", even though the corresponding GitHub Actions workflow appears to run and succeed. Merging is blocked. What's going on?

## Short Answer

GitHub matches required status checks by exact name string against the `context`/job name actually reported, not by workflow file name — the most common cause is the workflow's job (or `name:` value) was renamed after the branch protection rule was configured, so GitHub is waiting forever for a check name that no longer gets reported, while the renamed job reports under a name nobody required.

## Detailed Explanation

Branch protection's "required status checks" feature stores a list of literal string names. When a commit is pushed, GitHub looks for any check run or commit status whose name matches one of those strings and updates the PR's merge-readiness accordingly. This matching is exact-string, not workflow-file-based — so if a job is renamed (`build` → `build-and-test`), or a workflow is restructured so the job that used to report as `build` now reports under a matrix-generated name like `build (ubuntu-latest)`, the required check `build` will never receive a report again. GitHub has no way to know the "same" logical check moved to a new name; it just keeps waiting.

This also happens after workflow file renames or reorganizations (splitting one workflow into several), or when a workflow's trigger conditions change such that it no longer runs on pull requests at all for some PRs (e.g. a `paths:` filter that excludes the PR's changed files) — in that case the check is required but never even triggered for that PR, which shows the same "waiting" state.

## Symptoms

- A required check shows "Expected — Waiting for status to be reported" indefinitely, even on PRs where CI clearly ran and passed.
- The Actions tab shows a workflow run that completed successfully, but under a different check name than what's required.
- New PRs are permanently unmergeable via the normal UI (admins with bypass can still merge, which is often how the problem is first noticed as "weird").

## Possible Causes

- A job's `name:` or the job key itself was renamed in the workflow YAML after the required check name was set in branch protection settings.
- A workflow using a build matrix now reports per-matrix-entry check names (e.g. `build (18.x)`, `build (20.x)`) instead of a single `build`, and the required name doesn't match any of them.
- The workflow's trigger (`on: pull_request`, `paths:` filters) no longer fires for the affected PRs, so the check is never reported at all for those changes.
- The workflow file itself was deleted or renamed, removing the job that used to report that check name.

## Investigation Steps

1. Open the PR's checks tab and note the exact name(s) actually being reported by the current workflow run.
2. Compare that against the exact required check name(s) configured in Settings → Branches → branch protection rule for `main`.
3. If they don't match, check the workflow file's git history for a rename of the job name, `name:` field, or matrix strategy.
4. If nothing is reporting at all, check the workflow's `on:` trigger and any `paths:`/`paths-ignore:` filters against the PR's actual changed files.

## Commands

```bash
gh api repos/{owner}/{repo}/branches/main/protection/required_status_checks

gh run list --branch <pr-branch> --limit 5

gh api repos/{owner}/{repo}/commits/{sha}/check-runs --jq '.check_runs[].name'
```

## Resolution

Update the branch protection rule's required check name(s) to match whatever the workflow currently reports (via the GitHub UI, or `gh api` with a `PATCH` to the branch protection endpoint), rather than trying to force the workflow back to an old name. If the mismatch was caused by a matrix expansion, either require each specific matrix-generated name individually, or restructure the workflow with a final aggregating job (e.g. a no-op job that `needs:` all matrix jobs) and require just that single aggregate check name — this is the more maintainable long-term fix since it survives future matrix changes.

## Prevention

- Treat a required status check's name as a stable public contract; when renaming a job or workflow, update branch protection in the same PR.
- Prefer requiring a single aggregating "all checks passed" job over requiring many individually-named matrix jobs, so branch protection doesn't need updating every time the matrix changes.
- Periodically audit required checks against what workflows actually report, especially after any CI restructuring.

## Interview Follow-Up Questions

- How would you design a CI workflow so that required status checks never need updating even as the underlying jobs change?
- What's the difference between a "check run" (from a GitHub App like Actions) and a "commit status" (from the older Status API), and does branch protection treat them differently?
- How would an admin safely unblock merges while this is being fixed, without permanently weakening branch protection?

## Key Takeaways

- Required status checks match by exact reported name, not by workflow file identity — renames silently break the match.
- Build matrices are a common cause, since they change a single check name into several matrix-specific names.
- The safest long-term fix is requiring one aggregate "all checks passed" job rather than many individually-named checks.
- Always compare the required name against what's actually being reported before assuming CI itself is broken.

## References

- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: Required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [GitHub REST API: Branch protection](https://docs.github.com/en/rest/branches/branch-protection)
