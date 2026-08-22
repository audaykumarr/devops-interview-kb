---
id: gitlab-ci-pipeline-optimization-cache-vs-artifacts-001
title: "A teammate used 'cache' to pass compiled build output from the build job to the deploy job, and it intermittently fails to find the files. What did they get wrong?"
category: gitlab-ci
subcategory: pipeline-optimization
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - gitlab-ci
  - cache
  - artifacts
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A teammate configured the `build` job to `cache` its compiled output, expecting the later `deploy` job to reliably have access to those files. It works most of the time in testing, but fails intermittently in real pipeline runs with "file not found" errors. What did they get wrong?

## Short Answer

They used the wrong mechanism: `cache` in GitLab CI is a best-effort performance optimization for speeding up repeated work (like dependency downloads) across pipeline runs, with no guarantee it'll be available or unchanged between jobs — it's not designed for passing required data between jobs in the same pipeline. `artifacts` is the mechanism actually designed for that: files explicitly uploaded by one job and guaranteed to be downloaded by any job that declares a dependency on it.

## Detailed Explanation

`cache` and `artifacts` solve genuinely different problems, and conflating them is one of the most common GitLab CI configuration mistakes, precisely because both involve "files persisting between jobs" on the surface, making the distinction easy to miss until it causes an intermittent failure.

## Symptoms

- A job that reads files supposedly produced by an earlier job in the same pipeline intermittently fails to find them.
- The failure isn't consistent — it works in some pipeline runs and not others, especially varying by which runner picks up each job.
- The producing job (`build`) completes successfully and appears to have created the expected files.

## Possible Causes

- The build job used `cache:` to store its output, and the deploy job happened to run on a different runner (or the same runner's cache was evicted, or the cache key didn't match) that didn't have that cache populated — `cache` makes no guarantee about being present, since it's explicitly a best-effort speed optimization, not a data-passing contract.
- GitLab Runner's cache storage can vary by runner (a distributed runner fleet may not share cache storage identically across runners), meaning "it worked in my test" (same runner, warm cache) doesn't guarantee it'll work in a real pipeline run that might land on a different runner.

## Investigation Steps

1. Confirm whether the configuration uses `cache:` or `artifacts:` for the files in question — this alone usually identifies the root cause.
2. Check whether pipeline runs that succeeded versus failed happened to use the same runner or different runners, since cache availability commonly varies across a runner fleet.
3. Review the cache key configuration, if `cache:` is being used, since a cache key that changes between the producing and consuming job (even unintentionally) would also explain intermittent misses.

## Resolution

1. **Switch to `artifacts:` for anything a later job actually depends on**:
   ```yaml
   build:
     stage: build
     script: ./compile.sh
     artifacts:
       paths:
         - dist/

   deploy:
     stage: deploy
     needs: [build]
     script: ./deploy.sh dist/
   ```
   `artifacts` guarantees the listed paths are uploaded after the job completes and reliably downloaded by any job that depends on it (via `needs:` or being in a later stage), regardless of which runner picks up either job.
2. **Reserve `cache:` for genuinely re-usable, non-critical data** — dependency download caches (`node_modules`, package manager caches) that speed up future runs but that a job can always regenerate from scratch if the cache happens to be unavailable.
3. **Set an artifact expiration policy appropriate to your needs** (`artifacts: expire_in:`), since unlike cache (which is about speed), artifacts are also commonly used for genuinely required build outputs and test reports that may need to be retained for longer or shorter periods depending on their purpose.

## Prevention

- Treat `cache` and `artifacts` as solving different problems from the start: `cache` for speeding up repeated, regeneratable work; `artifacts` for anything a later job or a human actually needs reliably.
- Document this distinction in your team's CI conventions, since it's a common enough point of confusion that it's worth being explicit rather than assuming everyone already knows.
- When reviewing new pipeline configuration, specifically check that files any later job depends on are passed via `artifacts`, not `cache`.

## Key Takeaways

- `cache` is a best-effort performance optimization with no guarantee of availability between jobs — never use it for data a later job actually requires.
- `artifacts` is the mechanism specifically designed for reliably passing files between jobs in a pipeline, guaranteed to be available to any job that declares a dependency.
- This mistake is easy to make because both mechanisms superficially "persist files between jobs" — the difference is reliability guarantees, not just naming.
- A runner fleet's cache storage can vary across runners, which is exactly why relying on cache for required data produces intermittent, hard-to-reproduce-locally failures.

## Interview Follow-Up Questions

- How would you decide what artifact expiration policy is appropriate for build outputs versus test reports?
- What's the performance trade-off of using artifacts (which involves upload/download) for large build outputs, compared to the ideal-but-unreliable cache approach?
- How would you audit an existing large pipeline for other places where cache is being incorrectly relied upon for required data?

## References

- [GitLab Docs: Caching](https://docs.gitlab.com/ee/ci/caching/)
- [GitLab Docs: Artifacts](https://docs.gitlab.com/ee/ci/yaml/artifacts_reference.html)
