---
id: linux-disk-management-why-unix-allows-deleting-open-files-001
title: "Why does Unix allow you to delete a file that's still open by a running process, instead of blocking the delete like some other operating systems do?"
category: linux
subcategory: disk-management
technologies:
  - linux
difficulty: intermediate
question_type:
  - conceptual
tags:
  - linux
  - filesystem
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Windows generally locks a file that's open by a running process, blocking deletion or rename until it's closed. Unix-like systems let you delete an open file freely. Why the difference, and what does Unix's approach actually buy you?

## Short Answer

Unix separates a file's *directory entry* (the name pointing to it) from the file's actual *data* (identified by an inode) — deleting a file just removes the directory entry (the name), and the underlying data stays allocated and accessible to any process that already has it open via a file descriptor, only actually being freed once the last such reference closes. This design directly enables useful, common patterns Windows' locking model makes awkward — like replacing a running application's binary or log file without stopping the process, or an application safely deleting a temp file it's still using.

## Detailed Explanation

A Unix file has two conceptually separate things: the inode, which holds the actual file data and a reference count of how many directory entries (names) point to it, and one or more directory entries, which are just name-to-inode mappings. `unlink()` (what `rm` calls) removes a directory entry and decrements the inode's link count — it does not touch the actual data at all. If a process already has the file open (holding a file descriptor that references the inode directly, independent of any directory entry), that process can keep reading and writing the data exactly as before, completely unaffected by the directory entry being removed — the data isn't actually freed until the inode's reference count (both directory entries **and** open file descriptors) drops to zero.

This is precisely the mechanism behind the classic "disk full but `du` shows space free" scenario — a deleted-but-still-open file's data continues occupying disk space (visible to `df`, which counts allocated blocks) while being invisible to `du` (which only walks directory entries), exactly because deletion and data-freeing are two separate events in this model.

Windows' traditional file-locking model works differently: opening a file typically acquires a lock that prevents other operations (including deletion) on that same file until it's released, a design that avoids some classes of problems Unix's model can produce (a program accidentally continuing to use "deleted" data indefinitely, or the df/du confusion itself) but at the direct cost of the flexibility Unix's model enables.

**What Unix's approach directly enables**: replacing a running application's log file (rotation) without needing to stop the process — the running process keeps writing to its original open file descriptor (now pointing to unlinked, "phantom" data) while a new log file with the same name starts fresh; deploying a new version of a binary while the old version is still running, without needing to stop it first (common in some deployment patterns); safely using and cleaning up temp files, where a program can `unlink()` a temp file immediately after opening it, guaranteeing the OS will clean up the data automatically when the process exits or closes the descriptor, with no risk of the temp file being accidentally left behind by a crash.

## Key Takeaways

- Unix separates a file's directory entry (name) from its actual data (inode) — deleting removes the name, not necessarily the data.
- Data is only actually freed once the inode's reference count (directory entries plus open file descriptors) reaches zero.
- This is the exact mechanism behind the classic df/du disk-space divergence when a deleted file is still held open.
- It directly enables useful patterns — log rotation without stopping a process, replacing a running binary, guaranteed temp-file cleanup — that a locking-based model makes more awkward.

## Interview Follow-Up Questions

- How would `logrotate`'s `copytruncate` strategy differ from its default rename-based strategy, given this underlying mechanism?
- What's the "unlink-then-use" temp file pattern, and why is it considered safer than deleting a temp file explicitly at program exit?
- How does this model interact with hard links, where a file legitimately has multiple directory entries pointing to the same inode?

## References

- [Linux man-pages: unlink(2)](https://man7.org/linux/man-pages/man2/unlink.2.html)
- [Linux man-pages: inode(7)](https://man7.org/linux/man-pages/man7/inode.7.html)
