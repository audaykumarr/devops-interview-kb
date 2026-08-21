---
id: gitlab-ci-pipelines-branch-vs-merge-request-pipeline-001
title: "What's the difference between a branch pipeline and a merge request pipeline in GitLab CI, and why does it matter which one actually runs for a given push?"
category: gitlab-ci
subcategory: pipelines
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - gitlab-ci
  - pipelines
  - merge-requests
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

GitLab CI can run a "branch pipeline" or a "merge request pipeline" for the same push, depending on configuration. What's actually different between them, and why does it matter which one runs?

## Short Answer

A branch pipeline runs against the branch's own commit in isolation, exactly as pushed; a merge request pipeline runs in the context of the merge request, evaluating rules and (optionally, via merged results pipelines) even testing the hypothetical merge commit of the branch merged into its target — which matters because it can catch integration problems a branch-only pipeline would miss, and it's what "merge request approval requires a passing pipeline" actually checks against.

## Detailed Explanation

By default, pushing to a branch that has an open merge request can trigger both a branch pipeline and a merge request pipeline unless the `.gitlab-ci.yml` rules are written to prevent duplication — a common early confusion, since it looks like CI is running twice for no reason. The two pipeline types differ in what context they run against:

- **Branch pipeline**: triggered by a push to a branch, runs using only that branch's own latest commit, with predefined CI/CD variables like `CI_COMMIT_BRANCH` set. It has no awareness of any merge request or target branch.
- **Merge request pipeline**: triggered specifically because a merge request exists for that branch, runs with merge-request-specific variables (`CI_MERGE_REQUEST_ID`, `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`, etc.) available to jobs, and — critically — can be configured to require a passing merge request pipeline (not just any pipeline) before allowing merge.

A further refinement, **merged results pipelines**, actually builds and tests a temporary merge commit — the source branch merged into the target branch — rather than just the source branch's commit in isolation. This is the version that can catch "this change is fine on its own, but breaks once combined with what's currently on the target branch" — a class of bug a branch-only pipeline structurally cannot detect, since it never actually looks at the target branch's current state at all.

The practical reason this matters: teams that only run branch pipelines and require "pipeline must pass" before merge are still exposed to merge-time integration breakage, because passing means "this branch alone builds," not "this branch merged into main builds." Requiring merge request pipelines (ideally merged results pipelines) closes that gap, at the cost of slightly more CI complexity and, for merged results pipelines, an extra layer of indirection when debugging a failure (you're debugging the merge commit, not the branch's own commit).

## Key Takeaways

- Branch pipelines test the branch's commit alone; merge request pipelines add merge-request context; merged results pipelines actually test the hypothetical merged state against the target branch.
- Requiring a plain branch pipeline to pass before merge does not guarantee the merge itself is safe — only a merge request (ideally merged results) pipeline checks that.
- Without explicit `rules:` in `.gitlab-ci.yml`, both branch and merge request pipelines can trigger for the same push, which looks like duplicate CI.
- The choice affects which CI/CD variables are available to jobs, since merge-request-specific variables only exist in merge request pipelines.

## Interview Follow-Up Questions

- How would you write `.gitlab-ci.yml` `rules:` to prevent duplicate pipelines from firing for both the branch push and the merge request?
- What debugging challenge does a merged results pipeline introduce that a branch pipeline doesn't, when a job fails?
- How does this compare to GitHub Actions' `pull_request` vs `push` trigger distinction?

## References

- [GitLab Docs: Pipeline types](https://docs.gitlab.com/ee/ci/pipelines/pipeline_types.html)
- [GitLab Docs: Merged results pipelines](https://docs.gitlab.com/ee/ci/pipelines/merged_results_pipelines.html)
- [GitLab Docs: Predefined CI/CD variables reference](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html)
