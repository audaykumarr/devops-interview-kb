---
id: linux-permissions-chmod-numeric-modes-001
title: "chmod 755 vs chmod 644 — what do these numbers actually mean, and how would you figure out the right mode for a new file without guessing?"
category: linux
subcategory: permissions
technologies:
  - linux
difficulty: beginner
question_type:
  - conceptual
  - practical
tags:
  - linux
  - permissions
  - chmod
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`chmod 755 script.sh` and `chmod 644 config.yaml` show up constantly in setup scripts and documentation. What do these three-digit numbers actually mean, and how would you reason out the correct mode for a new file instead of copy-pasting a number you've seen before?

## Short Answer

Each digit is a sum of read (4), write (2), and execute (1) permissions for one of three actors — owner, group, others, in that order — so `755` means owner gets read+write+execute (4+2+1=7), group and others get read+execute (4+1=5); `644` means owner gets read+write (4+2=6), group and others get read-only (4=4). The right mode for a new file follows from what the file actually needs: executables need the execute bit for whoever runs them, and anything with secrets should drop read access for group/others entirely.

## Detailed Explanation

Unix permissions are tracked per-file as three sets of three bits each: read, write, execute — one set for the file's owner, one for its group, one for everyone else ("other"). Each bit set maps to a single digit by adding up the values of whichever permissions are granted: read = 4, write = 2, execute = 1. A digit of 7 means all three (4+2+1); 5 means read+execute but not write (4+1); 6 means read+write but not execute (4+2); 4 means read-only. Reading `755` left to right: owner=7 (rwx), group=5 (r-x), other=5 (r-x). Reading `644`: owner=6 (rw-), group=4 (r--), other=4 (r--).

The reasoning for choosing a mode, rather than memorizing common numbers, comes from asking three questions about the file: does the owner need to write to it (most files: yes; a lockfile or immutable config: maybe not), does it need to be executable (a script or compiled binary: yes; a data file, config file, or document: no — giving a non-executable file the execute bit is a common, harmless-looking mistake that just adds noise), and who else legitimately needs access (a shared script other users on the box need to run: group/other get read+execute; a file with credentials or private keys: group/other should get nothing at all, mode `600` or `400`). `755` is the standard "executable file, world-readable/runnable, only owner can edit" mode — appropriate for scripts and binaries. `644` is the standard "regular file, world-readable, only owner can edit" mode — appropriate for most non-secret config and data files. Neither is a magic number; both fall out directly from applying that reasoning.

## Key Takeaways

- Each `chmod` digit sums read (4) + write (2) + execute (1) for owner, group, and other respectively.
- `755` = owner rwx, group/other r-x — the standard mode for executables and scripts.
- `644` = owner rw-, group/other r-- — the standard mode for regular non-secret files.
- Derive the right mode from what the file actually needs (executable? shared? secret?) rather than memorizing common numbers.

## Interview Follow-Up Questions

- What's the difference between the execute bit on a regular file versus on a directory?
- What does the setuid bit do, and why is it considered risky on an executable owned by root?
- How would `umask` affect the default permissions of a newly created file, independent of any explicit `chmod`?

## References

- [Linux man-pages: chmod(1)](https://man7.org/linux/man-pages/man1/chmod.1.html)
- [Linux man-pages: chmod(2)](https://man7.org/linux/man-pages/man2/chmod.2.html)
