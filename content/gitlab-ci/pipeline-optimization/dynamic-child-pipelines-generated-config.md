---
id: gitlab-ci-pipeline-optimization-dynamic-child-pipelines-001
title: "You have a monorepo where a single commit might touch 1 service or 15. How would you use GitLab's dynamic child pipelines so you only run CI for the services that actually changed?"
category: gitlab-ci
subcategory: pipeline-optimization
technologies:
  - gitlab-ci
difficulty: advanced
question_type:
  - architecture
tags:
  - gitlab-ci
  - monorepo
  - child-pipelines
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You maintain a monorepo with 15 independently deployable services. A given commit might touch just one service, or several — but your current pipeline runs the full build/test/deploy sequence for all 15 on every single change, which is slow and mostly wasted work. How would you use GitLab's dynamic child pipelines to only run CI for the services that actually changed?

## Short Answer

Use a first-stage "generate" job that inspects which files changed (via `git diff` against the target branch) and writes out a child pipeline YAML file containing only the jobs for affected services, then trigger that generated file as a dynamic child pipeline — this defers the decision of "which jobs actually need to run" to runtime, based on real changed-file detection, rather than statically defining all 15 services' jobs with conditional rules that still have to be evaluated (and partially executed) every time.

## Detailed Explanation

The core idea behind dynamic child pipelines is generating a pipeline's configuration as a build artifact of an earlier job, rather than writing the entire configuration statically upfront — this lets the pipeline's actual shape (which jobs exist, for which services) be computed based on real information only available at pipeline-run time, like which files actually changed in this specific commit.

## Requirements

- Only services actually affected by a given commit's changes should have their CI jobs run.
- The mechanism must correctly detect "affected" including services that depend on shared code, not just directly modified files.
- Adding a new service to the monorepo shouldn't require manually updating a large, hand-maintained conditional rules list.

## Architecture

**A "generate" job produces the actual pipeline configuration as an artifact**: an initial pipeline stage runs a script that diffs the current commit against the target branch, determines which service directories (and any shared/common code affecting multiple services) were touched, and writes out a `generated-pipeline.yml` containing job definitions only for the affected services — this script is where the actual "what changed" logic lives, in a real scripting language rather than expressed awkwardly through YAML `rules:` conditions across 15 hardcoded services.

```yaml
generate-pipeline:
  stage: generate
  script:
    - ./scripts/detect-changed-services.sh > generated-pipeline.yml
  artifacts:
    paths:
      - generated-pipeline.yml

trigger-child-pipeline:
  stage: trigger
  trigger:
    include:
      - artifact: generated-pipeline.yml
        job: generate-pipeline
```

**Shared/common code changes should trigger a broader set of services, not just the literally-changed directory**: the detection script needs to understand your monorepo's actual dependency structure — a change to a shared library used by 8 of your 15 services should trigger CI for all 8, not just literally the shared library's own directory, which is more involved than a naive "which top-level directories changed" diff.

**New services are onboarded by updating the detection script's logic once, not by hand-adding conditional rules repeatedly**: since the generation logic is centralized in one script rather than duplicated across 15 sets of `rules:` conditions, adding a 16th service means updating one place, not auditing and extending a large static configuration file.

## Trade-offs

Dynamic child pipelines add real complexity — debugging "why didn't service X's CI run" now involves inspecting the generated pipeline artifact and the detection script's logic, rather than just reading a static `.gitlab-ci.yml`. This complexity needs to be weighed against the actual savings: for a monorepo where most commits genuinely touch only a small subset of services, the CI time and cost savings are usually well worth it; for a monorepo where most commits touch shared code affecting everything anyway, the savings shrink and the added complexity may not pay for itself.

## Key Takeaways

- Dynamic child pipelines defer "which jobs should run" to a generation script executed at pipeline-run time, based on real changed-file detection, rather than static rules evaluated for every service on every commit.
- The detection logic needs to understand your monorepo's actual dependency structure — a shared-code change should trigger every service that depends on it, not just the literally-touched directory.
- Onboarding a new service means updating the centralized detection script once, rather than extending a large, duplicated static rules configuration.
- This adds real debugging complexity (inspecting a generated artifact, not just a static file) — worth it primarily when most commits genuinely touch a small subset of a large monorepo.

## Interview Follow-Up Questions

- How would you test the changed-service detection script itself, to catch a bug where it incorrectly skips a service that actually needs to run?
- How would you handle a commit that changes something so foundational (a core shared library, the build system itself) that all 15 services genuinely need to run?
- How would you debug a case where the generated child pipeline is missing a job you expected to see?

## References

- [GitLab Docs: Parent-child pipelines](https://docs.gitlab.com/ee/ci/pipelines/downstream_pipelines.html#parent-child-pipelines)
- [GitLab Docs: Dynamic child pipelines](https://docs.gitlab.com/ee/ci/pipelines/downstream_pipelines.html#dynamic-child-pipelines)
