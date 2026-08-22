---
id: git-history-recovery-bisect-regression-001
title: "A bug was introduced somewhere in the last 200 commits, but nobody knows exactly which one, and the bug doesn't reproduce reliably enough to eyeball the diffs. How would you find the exact commit using git bisect?"
category: git
subcategory: history-and-recovery
technologies:
  - git
difficulty: intermediate
question_type:
  - practical
tags:
  - git
  - bisect
  - debugging
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A regression was introduced somewhere in the last 200 commits, but nobody can pin down which one just by reading diffs, and the bug is subtle enough that eyeballing changes isn't reliable. How would you use `git bisect` to find the exact commit that introduced it?

## Short Answer

`git bisect` performs an automated binary search across the commit range: you tell it one known-good commit and one known-bad (current) commit, and it checks out the midpoint for you to test — you report "good" or "bad," and it narrows the range by half each time, finding the exact first-bad commit in roughly log2(200) ≈ 8 tests instead of checking all 200 commits individually.

## Detailed Explanation

The core insight behind `git bisect` is that finding a regression in a range of N commits doesn't require testing every commit — binary search finds it in roughly log2(N) tests, since each test eliminates half the remaining candidates, regardless of which half turns out to be the correct one.

**Starting a bisect session**:

```bash
git bisect start
git bisect bad                    # current commit (HEAD) is known bad
git bisect good v1.2.0             # this earlier tag/commit is known good
```

Git checks out a commit roughly halfway between the good and bad points, and you test it — running the actual test, reproduction steps, or automated check that reveals whether the bug is present at that specific commit.

**Reporting results narrows the search each time**:

```bash
git bisect good   # if the bug is NOT present at this commit
git bisect bad    # if the bug IS present at this commit
```

Each report causes Git to check out the next midpoint of the now-narrowed range — repeating this process converges on the exact first commit where the bug started appearing, distinguishing it precisely from the last commit where it didn't, which is the actual regression-introducing commit.

**`git bisect run` automates the entire process if the bug can be checked programmatically**: rather than manually testing and reporting "good"/"bad" at each step, providing a script that exits 0 for good and non-zero for bad lets Git run the entire bisection automatically:

```bash
git bisect start HEAD v1.2.0
git bisect run ./run-test.sh
```

This is dramatically faster than manual bisection when the bug can be reliably detected by an automated test, since it removes the human round-trip time from each of the roughly 8 steps needed for a 200-commit range.

**Ending the session returns to the original state**: `git bisect reset` returns the repository to the branch/commit you were on before starting, cleaning up the bisection state — an easy step to forget, but important, since a bisect session leaves the repository in a detached-HEAD state pointing at whatever commit was last checked out during the search.

**Bisection assumes the bug is a genuine step function across the commit range** — present after some commit, absent before it, with no flakiness confusing the good/bad determination at any single point. If the bug is genuinely intermittent or flaky, individual bisect steps can be misreported, leading the search astray — for a flaky reproduction, running the test multiple times at each bisect step (or using `git bisect run` with a script that retries and requires consistent failure) helps mitigate this.

## Key Takeaways

- `git bisect` performs binary search across a commit range, finding a regression in roughly log2(N) tests instead of checking every commit individually.
- The workflow is: mark a known-good and known-bad commit, test the checked-out midpoint, report `good`/`bad`, and repeat until Git identifies the exact first-bad commit.
- `git bisect run <script>` automates the entire process when the bug can be checked programmatically, removing manual round-trip time from each step.
- Bisection assumes a clean, non-flaky good/bad boundary — an intermittent bug can mislead individual steps, requiring extra care (repeated testing per step) to get reliable results.

## Interview Follow-Up Questions

- How would you handle a bisect session where some commits in the range don't even build successfully, making them untestable?
- How would you write a `git bisect run` script for a bug that's only reproducible under specific environmental conditions?
- How would you communicate and document the root cause once bisect identifies the specific regressing commit?

## References

- [Git Docs: git-bisect](https://git-scm.com/docs/git-bisect)
