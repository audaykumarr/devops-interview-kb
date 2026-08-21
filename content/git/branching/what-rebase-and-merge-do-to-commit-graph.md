---
id: git-branching-rebase-vs-merge-commit-graph-001
title: "What's the actual difference between git merge and git rebase in terms of what happens to the commit graph, not just the end result you see?"
category: git
subcategory: branching
technologies:
  - git
difficulty: beginner
question_type:
  - conceptual
  - comparison
tags:
  - git
  - rebase
  - merge
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions:
  - git-branching-rebase-vs-merge-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`git merge` and `git rebase` can both be used to bring one branch's changes into another, and the resulting file contents can end up identical either way. What's the actual difference in what happens to the commit graph itself?

## Short Answer

`git merge` adds a new commit with two parents (the tip of each branch being merged), preserving both branches' original commits and history exactly as they were, joined together — the graph shows a genuine fork-and-rejoin shape. `git rebase` doesn't create a merge commit at all; it replays your branch's commits one by one on top of a new base, creating entirely new commits (new hashes) with the same changes — the original commits still technically exist until garbage-collected, but the branch now points at a linear sequence of new commits, with no fork-and-rejoin shape in the graph at all.

## Detailed Explanation

`git merge <other-branch>` creates a new **merge commit** — a commit with two parent commits instead of the usual one: the current branch's tip, and the other branch's tip. This new commit doesn't rewrite anything; every existing commit on both branches keeps its original hash and stays exactly where it was. The resulting graph, viewed with something like `git log --graph`, shows the characteristic diamond/fork shape — two lines of history diverging and then rejoining at the merge commit. This is why merge is often described as non-destructive: it adds to history rather than rewriting it.

`git rebase <other-branch>` works completely differently: it takes the commits unique to your current branch, temporarily sets them aside, moves your branch pointer to the tip of `<other-branch>`, and then replays each of your original commits one at a time on top of that new base — but each replayed commit is a genuinely new commit object, with a new hash (even though the diff/content is typically the same), because a commit's hash is derived from its content *and* its parent, and the parent has changed. The result is a linear history with no merge commit and no fork-and-rejoin shape — it looks as if your branch's work had been written on top of the latest `<other-branch>` all along, even though that's not literally what happened chronologically. The original commits aren't immediately deleted (they're recoverable via reflog until garbage-collected, as covered in the force-push recovery scenario), but your branch no longer points to them — it points to the new, replayed versions.

This underlying mechanical difference is exactly why rebase is dangerous on shared branches (rewriting commits others have already pulled) while merge is always safe on them (never rewrites existing commits, only adds a new one) — the distinction isn't a stylistic preference, it follows directly from what each operation actually does to the commit graph.

## Key Takeaways

- `git merge` creates a new two-parent commit, preserving both branches' history unchanged — the graph shows a fork-and-rejoin shape.
- `git rebase` replays commits as entirely new commit objects (new hashes) on top of a new base, producing a linear history with no merge commit.
- Rebase's "new commits, same content" mechanic is exactly why it rewrites history and is risky on shared branches, while merge never rewrites anything and is always safe.
- The original pre-rebase commits aren't immediately deleted — they're recoverable via reflog until eventually garbage-collected.

## Interview Follow-Up Questions

- Why does a rebased commit get a new hash even when its diff content is identical to the original?
- How would `git log --graph --oneline --all` visually demonstrate this difference on a real repository?
- What does "rebase preserves a linear history" actually buy you in practice, beyond just looking cleaner?

## References

- [Git Docs: git-merge](https://git-scm.com/docs/git-merge)
- [Git Docs: git-rebase](https://git-scm.com/docs/git-rebase)
- [Git Book: Git Branching — Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)
