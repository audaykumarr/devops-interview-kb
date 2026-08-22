---
id: gitlab-ci-pipeline-optimization-needs-vs-stages-001
title: "Your GitLab pipeline runs 6 stages sequentially, but half your jobs don't actually depend on each other. How would you use 'needs' to speed this up?"
category: gitlab-ci
subcategory: pipeline-optimization
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - practical
  - configuration
tags:
  - gitlab-ci
  - dag
  - pipeline-performance
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your GitLab CI pipeline defines 6 sequential stages (build, unit-test, lint, integration-test, package, deploy), and every job waits for its entire preceding stage to finish before starting — even though, in reality, `lint` doesn't actually depend on `unit-test` finishing first. How would you use `needs` to speed this up?

## Short Answer

Use `needs:` to declare each job's actual dependencies explicitly, which switches GitLab from strict stage-by-stage execution to a directed acyclic graph (DAG) — a job with `needs: [build]` starts as soon as `build` finishes, regardless of whether other jobs in intervening stages are still running, letting genuinely independent jobs like `lint` and `unit-test` run in parallel instead of waiting on each other purely because of stage ordering.

## Detailed Explanation

By default, GitLab CI's stage model is a strict, blunt ordering: every job in a stage must complete before any job in the next stage begins, regardless of whether a specific job in that next stage actually depends on everything in the previous stage or just on one specific job. This means unrelated jobs get serialized purely due to stage membership, not actual dependency — `needs:` is how you tell GitLab the real dependency graph so it can parallelize accordingly.

```yaml
build:
  stage: build
  script: ./build.sh

unit-test:
  stage: test
  needs: [build]
  script: ./run-unit-tests.sh

lint:
  stage: test
  needs: [build]
  script: ./run-lint.sh

integration-test:
  stage: test
  needs: [build, unit-test]
  script: ./run-integration-tests.sh
```

Here, `unit-test` and `lint` both only need `build`, so they start in parallel as soon as `build` finishes, rather than both waiting for the entire `build` stage (trivial here, but meaningful when a stage has multiple jobs) and then running sequentially with each other purely because they're in the same stage. `integration-test` explicitly needs both `build` and `unit-test`, so it correctly waits for both, while still not needing to wait for `lint` at all.

**This changes the pipeline from a stage-ordered list into an actual dependency graph**: jobs still belong to stages for organizational/display purposes, but their actual execution order is governed by their `needs:` declarations — a job with all its `needs` satisfied starts immediately, even if jobs from an earlier stage that it doesn't depend on are still running.

**Artifacts must also be considered**: `needs:` also controls artifact download — a job only downloads artifacts from jobs listed in its `needs:`, not from every prior-stage job by default, which is usually the desired, more precise behavior, but is a change worth being deliberate about if a job was previously relying on the old "download everything from prior stages" default.

## Key Takeaways

- `needs:` switches GitLab CI from strict stage-by-stage serialization to a DAG based on actual job dependencies, letting independent jobs run in parallel regardless of stage membership.
- Declare only the genuine dependencies for each job — over-declaring `needs` re-creates unnecessary serialization; under-declaring risks a job running before data it actually needs is ready.
- `needs:` also scopes artifact downloads to just the listed jobs, which is more precise than the stage-based default but worth reviewing if a job depended on that broader default.
- Jobs still belong to stages for display/organization, but `needs:` — not stage order — governs actual execution timing.

## Interview Follow-Up Questions

- How would you debug a pipeline where a job using `needs:` started before an artifact it actually required was available?
- What's the trade-off of a fully DAG-based pipeline (every job declaring explicit needs) versus the simpler stage-based model, in terms of maintainability?
- How would you visualize or verify the actual dependency graph a complex `needs:`-based pipeline produces, to confirm it matches your intent?

## References

- [GitLab Docs: Directed Acyclic Graph (needs keyword)](https://docs.gitlab.com/ee/ci/yaml/needs.html)
