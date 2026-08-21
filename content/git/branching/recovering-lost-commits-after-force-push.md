---
id: git-branching-recovering-after-force-push-overwrite-001
title: "A teammate's work was lost after a force-push overwrote their commits on a shared branch. How would you recover it?"
category: git
subcategory: branching
technologies:
  - git
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - git
  - force-push
  - recovery
estimated_time_minutes: 7
companies: []
related_questions:
  - git-branching-rebase-vs-merge-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Someone force-pushed to a shared branch, overwriting commits a teammate had already pushed. The teammate's work now appears to be gone from the branch's history. How would you actually recover it?

## Short Answer

A force-push doesn't delete commits from Git's object database — it just moves the branch pointer, leaving the overwritten commits unreferenced but still present until garbage collection eventually removes them. Recovery means finding those unreferenced commits' hashes (most reliably from `git reflog` on a machine that had them, since the reflog tracks where a branch pointer used to be) and creating a new branch or cherry-picking from that hash to bring the work back.

## Detailed Explanation

Git almost never deletes committed data immediately — a force-push just repoints a branch label to different history, leaving the previous commits dangling (unreachable from any branch) but intact in the object database until a garbage-collection pass eventually prunes what's genuinely unreferenced everywhere. That window is what makes recovery possible.

## Symptoms

- Commits a teammate knows they pushed are missing from the branch's current history.
- `git log` on the branch no longer shows the expected commits.
- The teammate's local branch, if not yet synced, may still have the commits — worth checking before assuming anything is actually lost.

## Possible Causes

- Someone ran `git push --force` (or `--force-with-lease` against a stale local view) on a shared branch, moving the remote branch pointer to a history that doesn't include the teammate's commits.
- A rebase performed by someone else was force-pushed, rewriting commit hashes and effectively "losing" the original commits from the branch's visible history, even if the content was preserved differently.

## Investigation Steps

1. First, check whether the teammate whose work was overwritten still has it locally — `git log` on their own machine, or `git reflog` there, is the most direct and reliable source, since it was never actually lost on their machine, only on the shared remote.
2. If their local copy is gone too (or unavailable), check the reflog on any machine that had the branch checked out before the force-push: `git reflog show origin/<branch>` (if that ref's reflog is retained) or `git reflog` for local `HEAD` history if that machine had the commits checked out directly.
3. Check GitHub/GitLab/etc.'s own web UI — many platforms retain a record of pushes and can show the pre-force-push commit hashes directly (e.g. GitHub's "force-pushed" event on a branch's activity, linking to the previous commit).
4. Once the specific commit hash(es) are identified, confirm they still exist in the repository's object database: `git cat-file -t <hash>` (returns "commit" if it's still present, not yet garbage-collected).

## Commands

```bash
git reflog show origin/<branch-name>
git reflog

git cat-file -t <commit-hash>
git show <commit-hash>

git branch recovery-branch <commit-hash>
git push origin recovery-branch

git cherry-pick <commit-hash>
```

## Resolution

Once the lost commit's hash is found, the safest recovery is creating a new branch pointing at it (`git branch recovery-branch <hash>`) and pushing that branch, preserving the recovered work without touching the current (force-pushed) branch state — from there, the recovered commits can be reviewed and merged back in properly (via a normal PR, or cherry-picked onto the current branch) rather than attempting to force the branch back to its old state, which risks re-overwriting whatever legitimate work has happened on the branch since the force-push.

## Prevention

- Avoid `git push --force` on shared branches entirely where possible; use `--force-with-lease` instead, which refuses to overwrite if the remote has commits your local view doesn't know about — catching exactly this scenario before it happens, rather than after.
- Restrict force-push permission on shared/protected branches (branch protection rules supporting this are standard on GitHub/GitLab) so it requires explicit admin action rather than being a routine possibility.
- When a rebase-then-force-push is genuinely needed on a branch others have pulled, coordinate explicitly ("I'm about to force-push, please don't push until I confirm") rather than assuming it's safe.

## Key Takeaways

- A force-push moves the branch pointer; it doesn't immediately delete the overwritten commits from Git's object database — they're recoverable until garbage collection eventually cleans them up.
- The reflog (on any machine that had the branch checked out, or the remote platform's own activity log) is the most reliable way to find the lost commit hashes.
- Recover by creating a new branch at the recovered hash rather than attempting to force the shared branch back to its old state.
- `--force-with-lease` prevents this exact scenario proactively by refusing to overwrite commits your local view doesn't already know about.

## Interview Follow-Up Questions

- How long does Git typically retain unreferenced commits before garbage collection removes them, and how would you check or configure that window?
- Why does `--force-with-lease` fail to protect against this in every case — what scenario can still slip through?
- How would you set up branch protection to prevent this class of incident from happening again on a specific critical branch?

## References

- [Git Docs: git-reflog](https://git-scm.com/docs/git-reflog)
- [Git Docs: git-push — --force-with-lease](https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-with-leaseltrefnamegt)
- [GitHub Docs: About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
