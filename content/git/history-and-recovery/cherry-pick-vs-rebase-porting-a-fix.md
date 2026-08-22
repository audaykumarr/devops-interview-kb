---
id: git-history-recovery-cherry-pick-vs-rebase-001
title: "A critical bug fix landed on main, and you need to get it onto a release branch that's several weeks behind. Should you cherry-pick the fix, or rebase the release branch onto main?"
category: git
subcategory: history-and-recovery
technologies:
  - git
difficulty: intermediate
question_type:
  - comparison
tags:
  - git
  - cherry-pick
  - rebase
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A critical bug fix just landed on `main`, and you need it on a `release` branch that's several weeks behind and has its own set of release-specific commits. Should you `cherry-pick` the fix commit onto the release branch, or `rebase` the release branch onto `main` entirely?

## Short Answer

Cherry-pick the specific fix commit — it applies just that one commit's changes onto the release branch, leaving everything else about the release branch untouched, which is exactly what you want when you need one targeted change without pulling in weeks of unrelated `main` history. Rebasing the entire release branch onto `main` would bring in everything that's changed on `main` since the branches diverged, which is a much bigger, riskier change than "get this one fix in," and rewrites the release branch's own commit history in the process.

## Detailed Explanation

The two operations solve genuinely different problems: cherry-pick is for porting a specific, isolated change from one branch to another without touching anything else; rebase is for replaying an entire branch's commits onto a new base, bringing along everything that implies — picking the wrong one for this scenario either brings in far more change than intended (rebase) or, if the situation actually called for a full rebase, leaves the branches unnecessarily diverged (cherry-pick used repeatedly instead of a proper sync).

**Cherry-pick applies one specific commit's changes onto the current branch**: `git cherry-pick <commit-hash>` takes the diff introduced by that single commit and applies it as a new commit on top of wherever you currently are — the release branch gains exactly the fix, as a new commit with a new hash, while everything else about the release branch (its own commits, its current state relative to `main`) is completely unaffected.

**Rebasing the release branch onto `main` would replay every release-branch commit on top of `main`'s current state**: this brings in every change that's happened on `main` since the branches diverged — not just the one fix you need, but everything else too — which is a fundamentally bigger, riskier operation for the specific goal of "get this one critical fix onto the release branch," and also rewrites every commit hash on the release branch, requiring a force-push and all the coordination concerns that implies.

**The right choice depends on the actual goal, not just "which is the more powerful operation"**: if the actual need is narrowly "port this one fix," cherry-pick is the correct, minimal-blast-radius tool — it changes exactly what needs to change and nothing else. If the actual need were "bring the release branch fully up to date with main" (a different, larger goal), rebase (or merge) would be the appropriate tool, but that's a meaningfully different operation with different risk and scope than porting one fix.

**Cherry-picking does have its own trade-off worth knowing**: since the cherry-picked commit gets a new hash on the release branch, Git doesn't automatically know these are "the same change" if `main` and the release branch are later merged or rebased against each other — this can occasionally cause the same change to be seen as a conflict or, in some cases, appear duplicated, depending on the exact later operations performed. For a single, one-off fix port, this is rarely a practical problem, but it's worth understanding for teams doing frequent cherry-picking between long-lived branches.

**For a critical fix, cherry-picking onto multiple relevant release branches (if several are actively supported) is a common, deliberate pattern**: this is exactly the scenario cherry-pick is designed for — a security or critical bug fix needing to land on `main` plus several actively-maintained release branches, each getting the fix ported individually without pulling in unrelated changes.

## Key Takeaways

- Cherry-pick applies one specific commit's changes onto the current branch, leaving everything else untouched — the right tool for porting a targeted fix without pulling in unrelated history.
- Rebasing the entire release branch onto `main` brings in everything that's changed on `main` since divergence, a much larger and riskier operation than the specific "port one fix" goal.
- Match the operation to the actual goal: cherry-pick for a targeted port, rebase (or merge) for genuinely syncing an entire branch's state with another.
- Cherry-picked commits get new hashes, which can occasionally cause the same underlying change to be treated as distinct by Git during later merges/rebases between the branches — rarely a practical issue for a one-off fix port.

## Interview Follow-Up Questions

- How would you handle cherry-picking a fix that depends on other changes not yet present on the target branch?
- What would you do if the same fix needs to be cherry-picked onto five different actively-maintained release branches?
- How would you verify a cherry-picked fix behaves correctly on the release branch, given its surrounding code context differs from `main`'s?

## References

- [Git Docs: git-cherry-pick](https://git-scm.com/docs/git-cherry-pick)
- [Git Docs: git-rebase](https://git-scm.com/docs/git-rebase)
