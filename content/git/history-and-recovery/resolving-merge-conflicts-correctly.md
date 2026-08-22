---
id: git-history-recovery-merge-conflict-resolution-001
title: "A teammate resolved a merge conflict by keeping 'their' version of every conflicting hunk without actually reading the other side's changes. Why is that dangerous, and how should conflicts actually be resolved?"
category: git
subcategory: history-and-recovery
technologies:
  - git
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - git
  - merge-conflicts
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You review a merge that had conflicts, and notice the teammate resolved every conflicting hunk by simply keeping their own side's version (`git checkout --ours` on every conflict, or manually deleting the other side's changes) without actually reading what the other side had changed. Why is this dangerous, and how should merge conflicts actually be resolved?

## Short Answer

A merge conflict exists precisely because both sides made changes to overlapping code, and blindly keeping one side discards the other side's actual work — which might be a legitimate, needed change (a bug fix, a feature the other side depended on) that silently disappears from the merged result with no error, no warning, and often no one noticing until much later. Resolving a conflict correctly means understanding what each side was actually trying to accomplish and producing a result that preserves both intents, not mechanically picking a "winner."

## Detailed Explanation

The danger in blindly resolving every conflict toward one side is that Git's conflict markers only tell you *where* the two histories disagree — they say nothing about *why*, or which side (if either) is actually correct to keep as-is; that judgment requires a human actually reading and understanding both changes, which "always keep mine" skips entirely.

## Symptoms

- A merged branch is missing functionality or a fix that was known to exist on one of the merged branches before the merge.
- A bug reappears that had previously been fixed, because the fix was on the "losing" side of a conflict that got silently discarded.
- Reviewing merge commit history shows conflict resolutions that consistently favor one side without any indication the other side's changes were actually considered.

## Possible Causes

- Under time pressure, a developer resolves conflicts by mechanically picking `--ours` or `--theirs` for every hunk, rather than reading and reasoning about each one individually.
- The developer doesn't have enough context on what the other branch's changes were actually trying to accomplish, making it easier to default to keeping their own familiar code.
- No code review step exists specifically scrutinizing merge conflict resolutions, meaning even careless resolutions go unnoticed until their effects surface later as a bug or regression.

## Investigation Steps

1. Review the merge commit's diff specifically, comparing what each original branch actually contained at the conflicting locations against what the final merged result kept.
2. Identify which specific changes from the "losing" side were discarded, and assess whether they represented functionality, fixes, or other work that should have been preserved.
3. Check whether the discarded work is otherwise tracked anywhere (a ticket, a separate commit) that would make it recoverable, or whether it's now only reachable via the original branch's commit history.

## Resolution

1. **Re-resolve the conflicts properly**, this time actually reading both sides' changes and producing a result that incorporates the intent of both, rather than mechanically favoring one — this often means neither pure `--ours` nor pure `--theirs`, but a manual merge of the actual logic from both sides.
2. **If the original conflicting commits are still reachable** (via reflog, or because the source branches still exist), use them directly to understand exactly what was lost and reconstruct the correct combined result.
3. **Verify the corrected resolution** doesn't reintroduce the bug that was fixed on the "losing" side, and does incorporate whatever functionality was there — testing both aspects explicitly, not just confirming the code compiles.
4. **Communicate with the teammate** about what happened and why careful conflict resolution matters, since this is as much a process/awareness issue as a one-time mistake to just quietly fix.

## Prevention

- Require code review specifically on merge commits with conflicts (or on the resulting combined diff), since a careless conflict resolution can silently discard real work in a way that's easy to miss in an otherwise-normal-looking PR.
- Encourage resolving conflicts with full understanding of both sides' intent — reading the actual commit messages and changes on both branches, not just the raw diff text, to understand the *why* behind each side's changes.
- Consider requiring the person resolving a conflict to also be someone who understands (or consults with someone who understands) both sides' changes, rather than whoever happens to be doing the merge in isolation.

## Key Takeaways

- A merge conflict marks where two histories disagree, but says nothing about which side (if either) is correct to keep — that requires human judgment about both sides' actual intent.
- Blindly keeping one side's version (`--ours`/`--theirs` on every hunk) risks silently discarding real, needed work with no error or warning.
- Correct resolution usually means understanding and incorporating both sides' intent, not mechanically picking a winner.
- Review merge conflict resolutions with the same scrutiny as any other code change, since a careless resolution can silently reintroduce bugs or drop functionality.

## Interview Follow-Up Questions

- How would you design a process or tooling check specifically to catch careless conflict resolutions before they're merged?
- How would you handle a conflict where both sides made genuinely incompatible changes to the same logic, requiring a real design decision rather than just combining both?
- What's the difference in risk profile between resolving conflicts during a merge versus during a rebase?

## References

- [Git Docs: Basic Merge Conflicts](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging#_basic_merge_conflicts)
- [Git Docs: git-merge](https://git-scm.com/docs/git-merge)
