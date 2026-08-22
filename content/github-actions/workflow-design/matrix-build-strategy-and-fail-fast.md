---
id: github-actions-workflow-design-matrix-fail-fast-001
title: "You're testing a library against 4 language versions and 3 operating systems using a matrix build. One combination fails immediately, but you want the others to keep running. How do you configure that?"
category: github-actions
subcategory: workflow-design
technologies:
  - github-actions
difficulty: intermediate
question_type:
  - configuration
  - practical
tags:
  - github-actions
  - matrix-builds
  - testing
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You're testing a library across 4 language versions and 3 operating systems using a GitHub Actions matrix build (12 total combinations). One specific combination fails almost immediately, but by default the entire matrix cancels — you actually want the other 11 combinations to keep running so you get complete results about which specific combinations pass or fail. How do you configure that?

## Short Answer

Set `fail-fast: false` in the matrix strategy — this is the direct opposite default from what you'd want in a single fast-feedback pipeline (see the related Jenkins parallel-stage question), because here the whole point of the matrix is to learn the compatibility status of every combination, not just to get a fast pass/fail signal.

## Detailed Explanation

GitHub Actions' matrix strategy defaults to `fail-fast: true`, canceling all other in-progress matrix jobs as soon as any one fails — a reasonable default when you're using a matrix purely for parallel speed (e.g., running the same test suite in parallel shards, where you just want overall pass/fail as fast as possible). But a compatibility matrix (testing across language versions and operating systems) has a fundamentally different goal: you want to know *which specific combinations* pass or fail, since "Node 18 on Windows fails but Node 20 on Windows passes" is exactly the information the matrix exists to surface — canceling the rest of the matrix after one failure throws away that information.

```yaml
strategy:
  fail-fast: false
  matrix:
    node-version: [18, 20, 22, 23]
    os: [ubuntu-latest, windows-latest, macos-latest]
```

With `fail-fast: false`, all 12 combinations run to completion regardless of any individual failures, and your workflow summary shows exactly which combinations passed and which didn't — the actual deliverable of a compatibility matrix.

**This is a genuinely different use case from the fail-fast-desired scenario**, worth being explicit about: if your matrix is instead sharding a single large test suite for parallel speed (where every shard passing is required and you just want the fastest possible pass/fail signal), the default `fail-fast: true` is usually correct — there's no compatibility information to lose, since every shard is running the same code against the same environment, just a different slice of tests.

**`max-parallel` is a separate, complementary setting** worth knowing alongside this — it caps how many matrix combinations run concurrently (useful if you have limited runner capacity or want to avoid overwhelming a shared external resource like a test database), independent of the fail-fast behavior.

## Key Takeaways

- `fail-fast: false` keeps all matrix combinations running to completion after one fails — the right setting for a compatibility matrix, where you want to know the status of every combination.
- The default `fail-fast: true` is correct for a matrix used purely for parallel speed (test sharding), where there's no per-combination compatibility information to lose.
- The deciding question: does each matrix combination carry distinct, valuable information (compatibility across versions/OSes), or are they interchangeable slices of the same work (sharding)?
- `max-parallel` is a separate setting for concurrency limits, independent of the fail-fast behavior.

## Interview Follow-Up Questions

- How would you configure a matrix where some specific combinations are allowed to fail without failing the overall workflow (e.g., testing against an experimental language version)?
- How would you reduce total CI time for a large compatibility matrix without losing the per-combination information fail-fast:false preserves?
- How would you report matrix results in a way that's easy for a human to scan, given 12+ combinations produce a lot of individual job statuses?

## References

- [GitHub Docs: Using a matrix for your jobs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
