---
id: gitlab-ci-pipeline-optimization-runner-tag-misrouting-001
title: "A new job you added to .gitlab-ci.yml is stuck 'pending' forever and never picked up by any runner. What's the most likely cause, and how do you fix it?"
category: gitlab-ci
subcategory: pipeline-optimization
technologies:
  - gitlab-ci
difficulty: beginner
question_type:
  - troubleshooting
tags:
  - gitlab-ci
  - runners
  - tags
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You added a new job to `.gitlab-ci.yml`. Every other job in the pipeline runs fine, but this specific job is stuck in "pending" status indefinitely, never picked up by any runner. What's the most likely cause, and how do you fix it?

## Short Answer

This is almost always a runner tag mismatch — the job specifies `tags:` that no available, active runner is registered to accept, so it sits in the queue forever with nothing eligible to run it. Check the job's `tags:` against your project's actual available runners (in Settings > CI/CD > Runners) and either fix the tag to match an existing runner or register/tag a runner that matches what the job expects.

## Detailed Explanation

GitLab's runner-matching is a strict requirement, not a preference: a job only gets picked up by a runner that has every tag the job specifies (runners can have multiple tags, and by default must match all of a job's tags, though this is configurable) — if no runner in scope for the project has a matching tag set, the job has no eligible runner and stays pending indefinitely, with no automatic fallback and, critically, no error message telling you why.

## Symptoms

- A specific job stays in "pending" status indefinitely, while other jobs in the same pipeline run normally.
- No error message appears — the job simply never starts, which is what makes this specifically confusing to a newcomer expecting some kind of failure output.
- The job may have been copied or adapted from another project's `.gitlab-ci.yml` that used different tags.

## Possible Causes

- The job's `tags:` list includes a tag no currently active, available runner is registered with for this project.
- The runner that should handle this tag exists but is currently offline, paused, or has hit its concurrency limit.
- The job was copied from another project or pipeline template that used tags specific to that project's runner setup, without updating them for the current project's actual runners.

## Investigation Steps

1. Check the job's `tags:` in `.gitlab-ci.yml` against the list of runners actually available to the project (Settings > CI/CD > Runners), confirming whether any runner's tag set is a superset of what the job requires.
2. Confirm the intended runner (if one should match) is actually online and not paused — an offline or paused runner won't pick up jobs even if its tags would otherwise match.
3. Check whether the runner has hit its configured concurrency limit, since a runner that's already at capacity won't pick up additional jobs until one frees up, which can look similar to "stuck pending" under load, though this typically resolves once capacity frees up rather than staying pending indefinitely.

## Resolution

1. **Fix the mismatch** — either remove or correct the job's `tags:` to match an existing, available runner's tags, or register/tag an appropriate runner if none currently exists for what this job actually needs (e.g., a job needing specific hardware or OS that no current runner provides).
2. **Verify the fix** by confirming the job picks up and runs on the next pipeline trigger.
3. **If this was a copy-paste from another project**, review the rest of the pipeline configuration for other tags that might have the same issue but haven't been triggered/noticed yet.

## Prevention

- Document your project's or organization's actual available runner tags somewhere accessible, so anyone adding a new job knows what tags are valid to use.
- When copying pipeline configuration from another project or a template, explicitly review and adjust tags rather than assuming they'll match your project's runners.
- Consider a lightweight pipeline linting step or documentation convention that catches tag typos or mismatches before they reach a real pipeline run.

## Key Takeaways

- An indefinitely "pending" job with no error message is the classic signature of a runner tag mismatch — no eligible runner exists to pick it up.
- Tags are a strict requirement (a runner must match all of a job's tags by default), not a preference, so a single mismatched or misspelled tag is enough to strand a job.
- Check both the job's tags and the actual available runners' tags and online/capacity status — the mismatch can be on either side.
- This is a common copy-paste trap when adapting pipeline configuration from another project with a different runner setup.

## Interview Follow-Up Questions

- How would you set up monitoring or alerting to catch a stuck-pending job faster than a person noticing it manually?
- What's the trade-off of using very specific tags (narrow matching, more control) versus broad or no tags (any runner can pick it up, less control over where jobs execute)?
- How would you handle a job that legitimately needs to run on a specific runner type that doesn't exist yet in your runner fleet?

## References

- [GitLab Docs: Use tags to control which jobs a runner can run](https://docs.gitlab.com/ee/ci/runners/configure_runners.html#use-tags-to-control-which-jobs-a-runner-can-run)
