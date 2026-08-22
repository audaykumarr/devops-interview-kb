---
id: git-history-recovery-purging-secret-from-history-001
title: "A secret was committed several commits ago and has since been rotated, but it's still sitting in the repository's Git history. How do you actually remove it, not just delete it in a new commit?"
category: git
subcategory: history-and-recovery
technologies:
  - git
difficulty: advanced
question_type:
  - practical
  - security
tags:
  - git
  - secrets
  - history-rewriting
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A secret was accidentally committed several commits ago, and while it's since been rotated (so it's no longer a live credential), it's still sitting in the repository's Git history — anyone who clones the repo or checks the history can still see it. Simply deleting the file and committing that deletion doesn't remove it from history at all. How do you actually purge it?

## Short Answer

Deleting a file in a new commit only removes it from the *current* state — every previous commit that included the secret still has it in Git's object database, fully accessible via `git log`, `git show`, or a checkout of any earlier commit. Actually removing it requires rewriting history with a tool purpose-built for this (`git filter-repo`, the currently recommended tool, superseding the older `git filter-branch` and BFG Repo-Cleaner), which rewrites every commit from the point the secret was introduced onward, followed by a coordinated force-push and full-team re-clone.

## Detailed Explanation

The fundamental issue is that a normal commit only ever adds to history — it never removes anything that was previously committed, since Git's whole model is built around preserving history, not editing it in place. Removing content that was genuinely committed requires an operation that rewrites the commits themselves, producing new commit hashes for everything from that point forward.

**A regular "delete the file" commit doesn't touch history at all**: it just adds a new commit removing the file from the current working tree state — anyone can still `git checkout <earlier-commit>` or `git show <earlier-commit>:<path>` to see the file exactly as it was, secret included, since that earlier commit and its content are completely untouched by the later deletion commit.

**`git filter-repo` rewrites every affected commit, removing the secret from the file's content at each point it appeared**: this tool (the currently recommended approach, replacing the older, slower, and more error-prone `git filter-branch`) processes the entire repository history, rewriting the specific file or specific string pattern out of every commit where it appears — the result is a repository where the secret genuinely no longer exists in any commit's content, not just the current one.

```bash
git filter-repo --replace-text <(echo 'the-leaked-secret==>REMOVED')
```

**This rewrites commit hashes for everything from the affected commit forward**: since a commit's hash is derived from its content (including the file content at that point), changing that content changes the hash — every subsequent commit, whose hash depends on its parent's hash, also changes, meaning this is a genuinely full history rewrite from that point onward, not a targeted, isolated change.

**A coordinated force-push and full-team re-clone is required afterward**: every clone of the repository still has the old history with the original hashes, so pushing the rewritten history requires force-pushing (overwriting the remote's history), and every team member's local clone becomes incompatible with the new history — the safest path for everyone is a fresh clone after the rewrite, rather than trying to reconcile their existing local clone with the rewritten history, which risks either conflicts or accidentally reintroducing the old history if not done carefully.

**This should happen alongside credential rotation, not instead of it — and rotation is the actually urgent step**: purging history is real hygiene work, removing the secret from future clones and casual access to history, but it doesn't undo any exposure that's already happened — if the secret was ever pushed to a location others could access, rotation (making the old value worthless) is the actual containment step and should happen first and immediately, with history purging as important but lower-urgency follow-up cleanup, exactly mirroring the priority order in incident response for a leaked credential generally.

**Any forks, cached clones, or CI artifact caches may still retain the old history**: a full purge from the primary repository doesn't guarantee the secret is gone from every place it might have been copied — forks on a hosting platform, CI systems that cached a clone, or anyone who downloaded the repository before the purge are all potential places the original history (and secret) could still exist, which is a genuine, sometimes underappreciated limitation of history-purging as a complete solution rather than a defense-in-depth measure alongside rotation.

## Key Takeaways

- Deleting a file in a new commit doesn't remove it from history — every earlier commit that included it is untouched and still fully accessible.
- `git filter-repo` (the current recommended tool) rewrites history, removing the secret's content from every commit where it appeared, producing genuinely new commit hashes from that point forward.
- This requires a coordinated force-push and full-team fresh re-clone afterward, since every existing local clone has the old, now-incompatible history.
- Credential rotation is the actually urgent containment step and should happen immediately, independent of and before history purging — purging doesn't undo exposure that's already happened, and forks/caches/prior clones may still retain the old history regardless.

## Interview Follow-Up Questions

- How would you audit whether any forks or cached clones of the repository still contain the old, unpurged history after the rewrite?
- What would you communicate to the team about how to handle their existing local clones after a history rewrite like this?
- How would you set up automated secret scanning to catch this class of mistake before it's ever committed, rather than needing this cleanup after the fact?

## References

- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [GitHub Docs: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
