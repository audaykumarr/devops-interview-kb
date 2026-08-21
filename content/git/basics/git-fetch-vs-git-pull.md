---
id: git-basics-fetch-vs-pull-001
title: "What's the actual difference between git fetch and git pull, and why do some teams recommend always fetching first?"
category: git
subcategory: basics
technologies:
  - git
difficulty: beginner
question_type:
  - conceptual
  - comparison
tags:
  - git
  - fetch
  - pull
  - fundamentals
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`git fetch` and `git pull` both bring down changes from a remote, and people often use them interchangeably. What's the actual difference, and why do some teams recommend always running `fetch` first instead of `pull`?

## Short Answer

`git fetch` downloads new commits and updates your local copy of the remote branch (e.g. `origin/main`) without touching your current working branch at all — it's purely informational. `git pull` does that same fetch and then immediately merges (or rebases, depending on config) those changes into your current branch, which means it can change your working files and create a merge commit without you having reviewed anything first.

## Detailed Explanation

Git tracks two separate things for a remote branch: the remote-tracking branch (`origin/main`), which is just a local bookmark for "where main was on the remote as of the last time I checked," and your own local branch (`main`), which is where your actual work happens. `git fetch` updates only the first — it downloads any new commits and moves `origin/main` to point at them, but your local `main` branch and working directory are completely untouched. This makes `fetch` a safe, read-only operation: you can inspect what changed (`git log main..origin/main`, or `git diff main origin/main`) before deciding what to do about it.

`git pull` is git shorthand for `git fetch` followed immediately by `git merge origin/main` (or `git rebase origin/main` if configured that way) into your current branch. That second step is where it differs meaningfully: it actively changes your working directory and branch history, potentially creating a merge commit, and can produce merge conflicts you now have to resolve immediately, mid-command. If you weren't expecting big changes, `pull` can surprise you with a sudden pile of new commits merged into your branch and files changed under you.

The "fetch first" recommendation comes from wanting the inspection step: `git fetch` followed by reviewing `git log HEAD..origin/main` lets you see exactly what's incoming before merging or rebasing it in deliberately, rather than letting `pull` do both steps blindly in one command. This matters more on shared branches with active history, less on a quiet solo branch where surprises are unlikely.

## Key Takeaways

- `git fetch` only updates your remote-tracking branch; it never touches your working branch or files.
- `git pull` = `git fetch` + an automatic merge (or rebase) into your current branch, which can change files and create conflicts immediately.
- Fetching first lets you review incoming changes before integrating them, rather than integrating blindly.
- `git pull --rebase` changes the second step to a rebase instead of a merge, avoiding an extra merge commit — a separate, related configuration choice.

## Interview Follow-Up Questions

- What does `git pull --rebase` do differently from a plain `git pull`, and when would you prefer it?
- How would you configure a repository so `git pull` always rebases by default instead of merging?
- If `git fetch` never touches your branch, how does `git status` sometimes say "your branch is behind origin/main" right after a fetch?

## References

- [Git Docs: git-fetch](https://git-scm.com/docs/git-fetch)
- [Git Docs: git-pull](https://git-scm.com/docs/git-pull)
