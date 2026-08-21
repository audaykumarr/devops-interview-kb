---
id: gitlab-ci-pipelines-preventing-duplicate-pipelines-001
title: "How would you write .gitlab-ci.yml rules to prevent duplicate pipelines from firing for both a branch push and its merge request?"
category: gitlab-ci
subcategory: pipelines
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - practical
  - configuration
tags:
  - gitlab-ci
  - pipelines
  - configuration
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Pushing to a branch with an open merge request can trigger both a branch pipeline and a merge request pipeline for the same commit, running CI twice. How would you write `.gitlab-ci.yml` `rules:` to prevent that duplication?

## Short Answer

Use `rules:` with `$CI_PIPELINE_SOURCE` conditions to make jobs run only for the merge request pipeline when one exists, and fall back to the branch pipeline only when there's no open merge request — the standard pattern is a rule that runs on `merge_request_event`, plus a rule that runs on `push` but explicitly excluded when a merge request is open for that branch.

## Detailed Explanation

The duplication happens because, by default, both trigger types can independently satisfy a job's conditions for the same underlying commit — a plain `push` trigger fires the branch pipeline, and the existence of an open merge request for that branch independently fires the merge request pipeline, with nothing in a naive configuration telling GitLab "don't do both for the same commit."

The standard fix uses the `$CI_PIPELINE_SOURCE` predefined variable, which tells a rule what actually triggered this specific pipeline run (`push`, `merge_request_event`, `schedule`, etc.), combined with `$CI_OPEN_MERGE_REQUESTS` (or checking whether a merge request context exists) to make the branch-push path defer to the merge-request path when one exists:

```yaml
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_OPEN_MERGE_REQUESTS'
      when: never
    - if: '$CI_PIPELINE_SOURCE == "push"'
```

This top-level `workflow: rules:` block (evaluated once per potential pipeline, before any jobs) explicitly allows merge-request-triggered pipelines, always allows pushes to the default branch, explicitly blocks (`when: never`) a push-triggered pipeline when an open merge request exists for that branch (since the merge-request pipeline already covers it), and falls back to allowing a push-triggered pipeline for branches with no open merge request (so pipelines still run on branches without an MR yet). This pattern — merge-request pipeline takes priority, branch pipeline only fires when no merge request would otherwise cover that commit — is GitLab's own documented recommendation for avoiding exactly this duplication.

## Key Takeaways

- Duplication happens because a branch push and its merge request can each independently satisfy trigger conditions for the same commit by default.
- `$CI_PIPELINE_SOURCE` combined with `$CI_OPEN_MERGE_REQUESTS` in a `workflow: rules:` block lets the merge-request pipeline take priority, deferring the branch pipeline only when no MR exists.
- This is evaluated once per potential pipeline via the top-level `workflow:` block, not per individual job, making it the right place to prevent the duplication structurally.
- The default branch (`main`) still needs its own always-allow rule, since it typically has no merge request of its own.

## Interview Follow-Up Questions

- How would this rule set need to change for a repository that also runs scheduled nightly pipelines?
- What would happen if you accidentally reversed the order of these `workflow: rules:` conditions?
- How would you test that this configuration actually prevents duplication, rather than assuming it works from reading it?

## References

- [GitLab Docs: Avoid duplicate pipelines](https://docs.gitlab.com/ee/ci/jobs/job_rules.html#avoid-duplicate-pipelines)
- [GitLab Docs: Predefined CI/CD variables reference](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html)
- [GitLab Docs: workflow:rules](https://docs.gitlab.com/ee/ci/yaml/#workflowrules)
