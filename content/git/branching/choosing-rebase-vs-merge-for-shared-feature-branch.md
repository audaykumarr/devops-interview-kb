---
id: git-branching-rebase-vs-merge-001
title: "Two engineers are working on the same long-lived feature branch. One wants to rebase onto main daily, the other insists on merging main in. Who's right, and how do you decide?"
category: git
subcategory: branching
technologies:
  - git
difficulty: beginner
question_type:
  - comparison
  - conceptual
tags:
  - git
  - rebase
  - merge
  - branching-strategy
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-19
last_updated: 2026-08-19
---

## Question

Two engineers share a long-lived feature branch. One wants to rebase the branch onto `main` daily to keep history linear; the other insists on merging `main` into the branch instead, worried that rebasing will cause conflicts and lost work for whoever doesn't do the rebase. Who's right, and how would you decide?

## Short Answer

Neither is unconditionally right — it depends on whether the branch is shared. Rebasing rewrites commit history, so rebasing a branch that someone else has already pulled and built on top of forces them into a painful, error-prone history reconciliation. Merging `main` in is always safe on a shared branch because it never rewrites existing commits. The daily-rebase habit is a good practice for a solo or not-yet-pushed branch, but on a branch two people are actively collaborating on, merging (or a carefully coordinated rebase workflow) is the safer default.

## Detailed Explanation

The disagreement is really about a property of rebase that's easy to underestimate: `git rebase` doesn't just replay your branch's commits onto a new base, it creates *entirely new commits* with new SHAs, even though the diffs look the same. Anyone who already has the old commits — because they pulled the branch, or based their own work on it — now has a history that has diverged from the rewritten one. Their next `git pull` either produces confusing duplicate commits (if they merge) or requires them to know to `git pull --rebase` or discard and re-fetch, and any local work-in-progress built on the old commits needs to be manually reconciled (typically via `git rebase --onto` or cherry-picking).

Merging doesn't have this problem because it never rewrites existing commits — it just adds a new merge commit that ties the two histories together. Both engineers can pull and merge independently without coordinating, at the cost of a messier, non-linear history with merge commits and possibly duplicate-looking work.

This is why the standard guidance is: rebase freely on commits that are only local to you (not yet pushed, or pushed to a branch nobody else has based work on), but treat any branch that's been shared — pushed and pulled by someone else — as something you merge into, not rebase, unless the whole team explicitly coordinates the rebase (e.g. "everyone stop, I'm rebasing, re-fetch after"). Squash-merging or rebase-and-merge at the point the feature branch merges into `main` is a different, safer use of the same mechanism — because by then the feature branch is closing, not still being collaborated on.

## Real-World Approach

1. Identify whether the branch is truly shared (multiple people have pulled and built commits on top of it) or effectively single-owner with occasional pushes for backup/visibility.
2. If shared: standardize on merging `main` into the feature branch for keeping it up to date, and reserve any history cleanup (squash or rebase) for the final merge into `main`, done once by whoever owns that merge.
3. If a linear history is a hard team requirement even on shared branches, use a coordinated rebase workflow: agree on a rebase window, have both engineers push any WIP first, one person rebases and force-pushes with `--force-with-lease`, and the other explicitly re-syncs with `git fetch && git rebase` (not a plain pull) before continuing work.
4. Protect against accidental history loss regardless of approach by enabling `git reflog` awareness (already on by default) and, for teams, branch protection rules that reject non-fast-forward pushes to branches other than the owner's own feature branches.
5. At merge time into `main`, choose squash-merge or rebase-merge per team convention to keep `main`'s history clean, independent of how the feature branch itself was managed day to day.

## Example

Safe update of a shared branch (merge):

```bash
git checkout feature/payments
git fetch origin
git merge origin/main
# resolve any conflicts, commit the merge
git push
```

Coordinated rebase, only after confirming nobody else has unpushed work on the branch:

```bash
git checkout feature/payments
git fetch origin
git rebase origin/main
# resolve conflicts commit-by-commit as they arise
git push --force-with-lease
```

`--force-with-lease` (not plain `--force`) refuses the push if the remote branch has commits you haven't seen — protecting against overwriting a collaborator's work you didn't know about.

## Common Mistakes

- Rebasing a branch other people have already pulled, then force-pushing with plain `--force`, silently discarding a collaborator's commits.
- Assuming "rebase = dangerous, never use it" instead of understanding the actual rule: dangerous only on shared/already-pulled history.
- Mixing strategies inconsistently on the same branch (sometimes merge, sometimes rebase) without team agreement, producing a history that's neither linear nor simple to reason about.
- Forgetting that a rebase changes commit SHAs, which breaks any external references to those commits (e.g. links in a PR review, CI runs tied to a specific SHA).

## Interview Follow-Up Questions

- How would you recover a teammate's work if it was lost after a force-push overwrote their commits?
- What's the difference between `git merge` and `git rebase` in terms of what actually happens to the commit graph?
- When would you choose squash-merge over a regular merge commit for landing a PR into `main`?

## Key Takeaways

- Rebase rewrites history and creates new SHAs; merge never rewrites existing commits.
- The deciding factor isn't "rebase vs merge is better" in the abstract — it's whether the branch is shared.
- `--force-with-lease` is a safer default than `--force` when a rebase does require a force-push.
- Squash/rebase at final merge into `main` is a different, lower-risk use of history rewriting than rebasing an actively shared branch.

## References

- [Git docs: git-rebase](https://git-scm.com/docs/git-rebase)
- [Git docs: git-merge](https://git-scm.com/docs/git-merge)
- [Git SCM Book: Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)
