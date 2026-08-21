---
id: gitlab-ci-pipelines-vs-github-actions-triggers-001
title: "How does GitLab's pipeline trigger distinction compare to GitHub Actions' push vs pull_request trigger?"
category: gitlab-ci
subcategory: pipelines
technologies:
  - gitlab-ci
  - github-actions
difficulty: intermediate
question_type:
  - comparison
tags:
  - gitlab-ci
  - github-actions
  - ci-cd
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

GitLab distinguishes branch pipelines from merge request pipelines; GitHub Actions distinguishes `push` triggers from `pull_request` triggers. How do these two systems' distinctions actually compare?

## Short Answer

The two are conceptually similar — one trigger type reacts to a raw branch commit, the other reacts specifically to the existence of an open merge/pull request — but GitHub Actions' `pull_request` trigger by default already tests the merge commit of the PR against its base branch (similar to GitLab's merged results pipelines specifically, not just its plain merge request pipelines), while GitLab's plain merge request pipeline (without merged-results enabled) only tests the source branch's own commit, closer to GitHub's `push` behavior — meaning the "safer default" behavior sits in different places between the two platforms' equivalent trigger types.

## Detailed Explanation

**GitHub Actions**: `on: push` triggers a workflow run against the pushed commit directly, on whatever branch was pushed — no merge simulation at all. `on: pull_request` triggers a workflow run that, by default, checks out a merge commit GitHub constructs internally (the PR's source merged into its base branch) — meaning GitHub Actions' `pull_request` trigger is, by default, already testing the integration state, not just the source branch's isolated commit. This is closer to GitLab's *merged results* pipeline behavior than to GitLab's plain merge request pipeline.

**GitLab CI/CD**: a `push`-triggered (branch) pipeline tests the branch's own commit in isolation, similar to GitHub's `push` trigger. A merge-request-triggered pipeline, *without* merged results enabled, still only tests the source branch's own commit — it gets merge-request-specific context (variables, and the ability to require it for merge) but doesn't test the actual merged state by default. Merged results must be explicitly enabled to get GitLab's equivalent of GitHub's default `pull_request` merge-commit-testing behavior.

This means the "does this test the actual merge, or just the isolated branch" question defaults differently between the two platforms: GitHub Actions' `pull_request` trigger defaults to merge-commit testing; GitLab's merge request pipeline defaults to source-branch-only testing unless merged results is explicitly turned on. A team moving between the two platforms (or maintaining pipelines on both) needs to be aware of this default difference specifically, since assuming GitLab's merge request pipeline behaves like GitHub's `pull_request` trigger by default would be an incorrect assumption about what's actually being tested.

Both platforms share the underlying duplicate-trigger problem discussed earlier (a push and its associated PR/MR can both fire a pipeline for the same commit) and both have their own mechanism to prevent it — GitHub Actions typically handles this via `concurrency:` groups or careful trigger `paths`/conditions, GitLab via the `workflow: rules:` pattern with `$CI_PIPELINE_SOURCE`.

## Key Takeaways

- GitHub Actions' `pull_request` trigger tests a constructed merge commit by default, closer to GitLab's merged results pipelines than to GitLab's plain merge request pipelines.
- GitLab's merge request pipeline, without merged results explicitly enabled, only tests the source branch's own commit — closer to GitHub's plain `push` behavior in that specific respect.
- The "tests the actual merge by default" behavior sits in different places between the two platforms, which matters when moving between them or maintaining both.
- Both platforms share the duplicate-pipeline-for-one-commit problem and solve it with their own platform-specific mechanism.

## Interview Follow-Up Questions

- How would you enable GitLab's merged results pipelines specifically, and what settings does that require at the project level?
- What's the risk of assuming GitLab and GitHub Actions behave identically here without verifying, when migrating pipelines between the two platforms?
- How does GitHub's merge queue feature relate to this same distinction, for repositories with high PR merge volume?

## References

- [GitLab Docs: Merged results pipelines](https://docs.gitlab.com/ee/ci/pipelines/merged_results_pipelines.html)
- [GitHub Docs: Events that trigger workflows — pull_request](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#pull_request)
