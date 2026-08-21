---
id: git-branching-when-to-squash-merge-001
title: "When would you choose squash-merge over a regular merge commit for landing a pull request into main?"
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
  - squash-merge
  - pull-requests
estimated_time_minutes: 6
companies: []
related_questions:
  - git-branching-rebase-vs-merge-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

GitHub/GitLab both offer squash-merge as an alternative to a regular merge commit when landing a pull request. When would you actually choose squash-merge, and what are you trading away by doing so?

## Short Answer

Squash-merge collapses every commit on the PR branch into a single new commit on `main`, giving `main`'s history one clean entry per merged PR regardless of how messy or exploratory the branch's own commit history was — worth choosing when a PR's individual commits are development noise ("wip", "fix typo", "actually fix it this time") that add no value to `main`'s permanent history. The trade-off is losing the PR branch's fine-grained commit history from `main` itself (though it's usually still visible in the closed PR on the platform) — worth avoiding when the branch's individual commits are genuinely meaningful and worth preserving as separate units of history (e.g. a carefully-structured PR with logically separate, individually-reviewable commits).

## Detailed Explanation

The core trade-off is about what `main`'s permanent history should actually contain. Most real-world feature branches accumulate commits that are useful during development but meaningless afterward — "wip," "address review comments," "fix failing test," "typo" — a natural and fine way to work, but not something worth preserving forever in `main`'s history once the PR is done. Squash-merge takes all of a PR's commits and combines them into exactly one commit on `main`, using (typically) the PR's title and description as the commit message — giving `main` a clean, one-entry-per-feature history that's easy to scan (`git log --oneline` on `main` reads like a list of shipped changes, not a list of every intermediate development step) and, practically, makes `git bisect` more useful, since each commit on `main` represents one complete, coherent change rather than a potentially-broken intermediate state from mid-development.

The trade-off: squash-merge discards the branch's individual commit boundaries from `main`'s history — if a PR had genuinely meaningful, separately-reviewable commits (e.g. "refactor the interface" followed by "implement the new behavior using it," each independently sensible and each earning its own commit message), squashing them into one commit loses that granularity from `main`'s permanent record, even though the platform usually still shows the original commits within the now-closed/merged PR itself for historical reference. For a team that deliberately writes clean, atomic, well-messaged commits within a PR — treating the commit history itself as documentation — a regular merge (or a rebase-and-merge, preserving individual commits without an extra merge commit) keeps that granularity in `main`'s actual history, which squash-merge would flatten away.

The practical default many teams land on: squash-merge as the default for typical feature/bugfix PRs (since most branches' internal commit history is genuinely just development noise not worth preserving), with a regular or rebase-merge reserved for the less common case where a PR's commits were deliberately structured to be individually meaningful and worth keeping as separate units in `main`'s history.

## Key Takeaways

- Squash-merge collapses a PR's entire commit history into one commit on `main`, giving a clean, one-entry-per-feature history at the cost of losing the branch's individual commit granularity from `main` itself.
- Worth choosing when a branch's own commits are development noise not worth preserving permanently — the common case for most feature/bugfix branches.
- Worth avoiding when a branch's commits were deliberately structured as individually meaningful, reviewable units worth keeping separate in `main`'s history.
- Squash-merge also makes `git bisect` more reliable on `main`, since each commit represents one complete, coherent change rather than a potentially-broken intermediate development state.

## Interview Follow-Up Questions

- How would you structure a PR's commits if you specifically wanted them preserved individually, and what discipline does that require from the author?
- What's the difference between squash-merge and rebase-and-merge — both can produce a "clean" main history, but how do they differ mechanically?
- How would you decide this policy for a whole team, and would you ever want different policies for different repositories?

## References

- [GitHub Docs: About pull request merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges)
- [Git Docs: git-rebase](https://git-scm.com/docs/git-rebase)
