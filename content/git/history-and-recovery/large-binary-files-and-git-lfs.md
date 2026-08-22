---
id: git-history-recovery-large-binary-files-lfs-001
title: "A repository has grown to several gigabytes because it stores large binary assets (design files, ML model weights) directly, making every clone painfully slow. How would you fix this?"
category: git
subcategory: history-and-recovery
technologies:
  - git
difficulty: intermediate
question_type:
  - architecture
tags:
  - git
  - git-lfs
  - large-files
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A repository has grown to several gigabytes over time because it stores large binary assets — design files, ML model weights, video files — directly as regular Git objects. Every clone now takes a long time and consumes significant disk space, since every historical version of every binary file is still in the repository's history. How would you fix this, both for new files going forward and for the existing bloated history?

## Short Answer

Git LFS (Large File Storage) replaces large binary files in the repository with small text pointers, storing the actual file content in a separate LFS storage backend — cloning the repository normally only downloads the lightweight pointers plus whichever LFS-tracked file versions you actually need (typically just the current ones), dramatically reducing clone size and time, since Git's own history no longer carries every binary version directly. Fixing already-existing history requires a separate, more involved migration (rewriting history to convert existing binary blobs into LFS pointers), which is a real operation with its own risks, not something LFS handles automatically for content already committed.

## Detailed Explanation

The root cause of the bloat is architectural: Git's object model stores a full copy of every version of every file that's ever been committed, which is efficient for text files (where Git's delta compression works well across similar versions) but genuinely poor for large binary files, where delta compression provides little benefit and every version essentially adds its full size to the repository permanently.

## Requirements

- New large binary files added going forward should not bloat the core Git repository the way they have historically.
- Regular clone operations should be fast, not requiring every historical binary version to be downloaded by default.
- Existing large binary content already in history needs to be addressed too, since the bloat problem already exists in the current repository, not just as a future risk.

## Architecture

**Git LFS replaces tracked file content with lightweight pointers in the actual Git repository**: configuring `.gitattributes` to track specific file patterns (`*.psd filter=lfs diff=lfs merge=lfs -text`) means Git itself only ever stores a small text pointer file (referencing the actual content's location in LFS storage) for matching files — the real binary content lives in a separate LFS storage backend (hosted by your Git provider, like GitHub or GitLab, or a self-hosted LFS server), fetched separately from the core Git clone/fetch operations.

**Clones become fast because the core Git history no longer carries binary content directly**: a standard `git clone` downloads the lightweight pointer files quickly, and Git LFS then fetches the actual binary content for the files needed at the checked-out revision — by default, this means just the current version's actual files, not every historical version, which is exactly what eliminates the bloat for the common case of "I just need to work with the current state of the repository."

**Setting this up going forward is straightforward, but doesn't retroactively fix existing history**: installing `git lfs`, configuring `.gitattributes` for the relevant file patterns, and committing going forward correctly routes new binary content through LFS — but every historical commit that already has large binary content directly in the Git object database keeps that bloat exactly as it was, since LFS tracking going forward doesn't rewrite past history automatically.

**Migrating existing history requires `git lfs migrate`**: this tool rewrites repository history, converting existing binary blobs matching specified patterns into LFS pointers retroactively — a genuinely more involved operation, since it rewrites every commit's hash from the point of the earliest affected file onward, requiring the same force-push and full-team coordination considerations as any other history-rewriting operation, applied at a potentially much larger scale (the entire team needing to re-clone or carefully re-sync their local repositories).

**This migration should be planned and communicated carefully, given its scope**: unlike a small, targeted history cleanup on a personal feature branch, migrating an entire shared repository's history affects everyone who has it cloned — coordinating a specific migration window, communicating clearly what everyone needs to do afterward (typically a fresh clone is the simplest safe path), and doing this on a repository where the team can tolerate the disruption are all real planning considerations.

## Trade-offs

Git LFS introduces a dependency on the LFS storage backend being available (a clone or checkout needing LFS content will fail or be incomplete if the LFS server is unreachable, a different failure mode than plain Git's fully-self-contained model) and, depending on the hosting provider, may have its own storage/bandwidth costs or quotas separate from regular Git repository hosting. Migrating existing history is a disruptive, one-time operation requiring full-team coordination, which is a real cost worth weighing against the ongoing cost of continuing to carry the bloat if the repository's growth has actually stabilized.

## Key Takeaways

- Git LFS replaces large binary file content with lightweight pointers in the actual Git repository, storing real content in a separate backend — dramatically reducing clone size for the common case of needing just current file versions.
- Configuring LFS tracking going forward doesn't retroactively fix already-existing bloated history — `git lfs migrate` is needed to rewrite history and convert existing binary blobs into LFS pointers.
- Migrating existing history is a disruptive, history-rewriting operation requiring full-team coordination (typically a fresh clone afterward), not a lightweight configuration change.
- LFS introduces a dependency on the separate storage backend's availability, a different failure mode than Git's normally fully self-contained object model.

## Interview Follow-Up Questions

- How would you decide which existing file patterns are worth migrating to LFS retroactively, versus accepting the existing bloat for files that are rarely accessed historically?
- What would you communicate to the team before running a full history migration, and what would you ask them to do afterward?
- How would you evaluate LFS storage costs/quotas against your specific hosting provider before committing to this approach at scale?

## References

- [Git LFS](https://git-lfs.com/)
- [Git LFS: Migrate existing repository](https://github.com/git-lfs/git-lfs/blob/main/docs/man/git-lfs-migrate.adoc)
