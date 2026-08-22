---
id: git-history-recovery-interactive-rebase-cleanup-001
title: "A feature branch has 15 messy commits ('wip', 'fix typo', 'actually fix it') before it's ready for review. How would you use interactive rebase to clean this up into a coherent history?"
category: git
subcategory: history-and-recovery
technologies:
  - git
difficulty: intermediate
question_type:
  - practical
tags:
  - git
  - interactive-rebase
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A feature branch has accumulated 15 commits over the course of development — several "wip", "fix typo", and "actually fix it this time" commits mixed in with the real logical changes. Before opening a PR, you want to clean this into a small number of coherent, reviewable commits. How would you use interactive rebase to do this?

## Short Answer

`git rebase -i <base-commit>` opens an editable list of the branch's commits, where you can mark each one to `pick` (keep as-is), `squash`/`fixup` (combine into the previous commit), `reword` (change its commit message), or `drop` (remove entirely) — reordering and combining the "wip"/"fix typo" commits into their related logical commits via `fixup` produces a small number of clean, coherent commits telling an accurate story of the actual changes, without the noise of the real-time development process.

## Detailed Explanation

Interactive rebase works by replaying the branch's commits one at a time onto the specified base, giving you an editable action list controlling exactly how each commit is handled during that replay — this is what enables combining, reordering, and rewording commits, since you're not modifying history in place so much as re-constructing it from that list.

**Starting the interactive rebase**: `git rebase -i main` (or the specific base commit/branch the feature branch diverged from) opens an editor showing every commit since that base, each prefixed with `pick` by default:

```
pick a1b2c3d Add user authentication endpoint
pick e4f5g6h wip
pick h7i8j9k fix typo
pick k1l2m3n actually fix it this time
pick n4o5p6q Add rate limiting
```

**`fixup` (or its shorthand `f`) combines a commit into the previous one, discarding its message**: changing the "wip", "fix typo", and "actually fix it this time" commits to `fixup` merges each into the commit immediately above it, keeping only that commit's original message — appropriate when those follow-up commits were just fixing up the same logical change and don't need their own separate history entry:

```
pick a1b2c3d Add user authentication endpoint
fixup e4f5g6h wip
fixup h7i8j9k fix typo
fixup k1l2m3n actually fix it this time
pick n4o5p6q Add rate limiting
```

Saving this produces a history of just two clean commits — "Add user authentication endpoint" (now including everything from the three fixup commits) and "Add rate limiting" — instead of the original five.

**`squash` (or `s`) works similarly but lets you edit the combined commit message**, useful when you want to merge commits together but write a new, better message summarizing the combination rather than just keeping the first commit's original message unchanged.

**`reword` (or `r`) lets you change a commit's message without altering its actual changes**, useful for fixing an unclear or typo'd commit message on an otherwise fine, standalone commit.

**Reordering the lines in the editor changes the order commits are replayed**, letting you group related changes together even if they weren't made in that order originally — though reordering commits that touch overlapping code can introduce conflicts during the rebase that need to be resolved, since each commit is being replayed as an independent change against the evolving history.

**This entirely rewrites commit hashes for everything after the base**, which is safe for a feature branch not yet pushed or not yet used by anyone else, but requires a force-push (and the same coordination/risk considerations as any force-push) if the branch has already been pushed and others might have it checked out — cleaning up history like this is a "before it's shared for review" practice specifically because rewriting already-shared, already-relied-upon history is a different, riskier situation.

## Key Takeaways

- `git rebase -i <base>` opens an editable list of commits since the base, letting you `pick`, `fixup`/`squash` (combine), `reword` (change message), or `drop` (remove) each one.
- `fixup` combines a commit into the previous one and discards its message; `squash` does the same but lets you write a new combined message.
- Reordering commits in the editor changes replay order, useful for grouping related changes, but can introduce conflicts if reordered commits touch overlapping code.
- This rewrites commit history, which is safe for an unshared feature branch but requires a coordinated force-push (with the same risks as any force-push) if already pushed and used by others.

## Interview Follow-Up Questions

- How would you handle a conflict that arises specifically from reordering commits during an interactive rebase?
- What's the risk of cleaning up history on a branch that a teammate has already checked out and built additional commits on top of?
- How would you decide the right granularity for the final, cleaned-up commits — one commit per PR, or several logically-separated commits?

## References

- [Git Docs: git-rebase](https://git-scm.com/docs/git-rebase)
- [Git Book: Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
