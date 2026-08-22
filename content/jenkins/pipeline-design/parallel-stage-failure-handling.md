---
id: jenkins-pipeline-design-parallel-stage-failure-001
title: "Your Jenkins pipeline runs three test suites in parallel stages. One fails after 2 minutes, but the pipeline keeps running the other two for another 20 minutes before reporting failure. How do you fix this?"
category: jenkins
subcategory: pipeline-design
technologies:
  - jenkins
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - jenkins
  - pipeline
  - parallel-execution
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your Jenkins declarative pipeline runs three test suites as parallel stages. One suite fails after 2 minutes, but the pipeline keeps running the other two full suites for another 20 minutes before finally reporting the overall failure. How do you fix this so a fast failure is reported fast?

## Short Answer

By default, Jenkins' `parallel` step waits for all branches to complete before evaluating overall success or failure — add `failFast true` to the parallel block (or the equivalent option depending on your pipeline syntax) so that as soon as any one branch fails, the still-running branches are aborted immediately rather than left to finish.

## Detailed Explanation

Jenkins' default parallel behavior optimizes for completeness of information (you get results from every branch, even if one failed early) rather than for fast feedback — which is the right default for some use cases (you want to know if *multiple* things are broken, not just the first one) but actively wrong for the common case of "we just want to know as fast as possible whether this build is good," where waiting for two more test suites to finish after the build has already failed is pure wasted time.

## Symptoms

- A pipeline with parallel stages continues running all branches to completion even after one branch has already failed.
- Overall pipeline failure is reported only after the slowest parallel branch finishes, not when the first failure actually occurred.
- CI feedback time is dominated by the slowest parallel branch, even when a fast branch already determined the build's fate.

## Possible Causes

- The `parallel` step (or `parallel` directive in declarative pipeline) is used without the `failFast` option, which defaults to letting all branches run to completion.
- Each parallel branch was designed independently without considering that one branch's early failure should affect the others' continued execution.

## Investigation Steps

1. Confirm the pipeline syntax being used (scripted `parallel` step versus declarative `parallel` directive), since the exact syntax for enabling fail-fast behavior differs slightly between them.
2. Check whether any branch has side effects that would make aborting it mid-run unsafe (e.g., a deployment step that shouldn't be interrupted partway) — this affects whether failFast is safe to apply uniformly or needs to exclude specific branches.
3. Measure how much time is actually being wasted waiting for slower branches after an early failure, to confirm the fix is worth the effort relative to your actual pipeline runtime.

## Resolution

1. **Add `failFast true`** to the parallel block: in declarative pipeline, this is set within the `parallel` directive's options; in scripted pipeline, it's a key in the map passed to the `parallel` step.
2. **Verify the fail-fast behavior doesn't interrupt anything unsafe** — if one of the parallel branches performs an action that shouldn't be aborted mid-execution, consider isolating it outside the fail-fast parallel group or accepting that it needs to run to completion regardless.
3. **Confirm the pipeline now reports failure promptly** by testing with a deliberately failing fast branch alongside slower ones, verifying the slower branches are actually aborted rather than just ignored after failure.

## Prevention

- Default new parallel test/build stages to `failFast true` unless there's a specific reason (a branch with side effects that shouldn't be interrupted) not to, since fast feedback is almost always the more valuable default for CI.
- Document which parallel branches, if any, are intentionally excluded from fail-fast behavior and why, so the exception is a deliberate, understood choice rather than an oversight discovered later.

## Key Takeaways

- Jenkins' `parallel` step defaults to running all branches to completion regardless of early failures — this is a real default worth knowing, not a bug.
- `failFast true` aborts remaining branches as soon as any one fails, turning a slow, complete-results pipeline into a fast-feedback one.
- Check for branches with side effects (deployments, external state changes) that shouldn't be safely interrupted before applying fail-fast broadly.
- Fast feedback is usually the more valuable default for CI test/build parallelism; reserve "let everything finish" for cases where you specifically need results from every branch regardless of one failing.

## Interview Follow-Up Questions

- How would you handle a parallel branch that performs a non-idempotent action, where aborting it mid-run could leave things in a bad state?
- How would you get partial results from the aborted branches, if you still wanted some visibility into what they were doing before being cut off?
- How does this same failFast consideration apply to matrix builds in Jenkins, which are also inherently parallel?

## References

- [Jenkins Docs: Parallel stages](https://www.jenkins.io/doc/book/pipeline/syntax/#parallel)
