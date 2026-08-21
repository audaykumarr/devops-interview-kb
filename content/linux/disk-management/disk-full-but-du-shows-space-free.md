---
id: linux-disk-management-phantom-disk-usage-001
title: "df says a server's disk is 100% full, but running du -sh on every top-level directory only adds up to a fraction of that. Where did the rest of the space go?"
category: linux
subcategory: disk-management
technologies:
  - linux
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - linux
  - disk-space
  - filesystem
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`df -h` reports a server's root filesystem at 100% full, but running `du -sh` across every top-level directory only accounts for a fraction of that space. Where did the rest of the space go, and how would you find it?

## Short Answer

The most common cause is a process still holding open a file handle to a file that's been deleted — the disk blocks aren't freed until the last open file descriptor closes, but `du` only walks the visible directory tree and can't see a file with no directory entry at all. `lsof +L1` (or `lsof | grep deleted`) finds exactly this: open file descriptors pointing at unlinked files, which is where `df` and `du` diverge.

## Detailed Explanation

`df` reports space based on the filesystem's actual block allocation — how many blocks are marked "in use" at the filesystem level. `du` reports space based on walking the directory tree and summing file sizes it can actually see and name. These are normally the same number, but they diverge in exactly one well-known scenario: a file gets deleted (unlinked from the directory tree) while a running process still has it open. Unix filesystem semantics mean the underlying data isn't actually freed until the last file descriptor referencing it is closed — so the blocks stay allocated (`df` still counts them) even though there's no longer any directory entry pointing at the file (`du` has nothing to walk and sum).

This happens more often than it sounds: a long-running process with a log file that got rotated by `logrotate` using a plain `rm`/`mv` instead of `copytruncate`, or restarted without the old handle being released; a database or queue holding a large temp file open across a crash-looped restart cycle; an application writing to a file that got deleted out from under it by a cleanup script. In every case, the disk usage is real and won't resolve itself just by finding and deleting "the file" through the filesystem — there is no file to find, only an open handle holding space hostage.

## Symptoms

- `df -h` reports the filesystem at or near 100% full.
- `du -sh /*` (or per top-level directory) sums to noticeably less than the total reported by `df`.
- The gap doesn't correspond to anything found by searching the visible filesystem with `find` or `du`.

## Possible Causes

- A process holds an open file descriptor to a file that's been deleted (unlinked) — the classic cause, most often from log rotation misconfiguration or a crashed/restarted process leaving an old handle held by a still-running parent or worker.
- A filesystem mounted over another one, hiding files that still consume space on the underlying (now-obscured) mount point.
- Reserved blocks (on ext-family filesystems, typically 5% reserved for root by default) — usually too small to explain a large gap on its own, but worth ruling out on smaller volumes.
- Sparse files or filesystem-level snapshots/reflinks that report differently between `df`'s block accounting and `du`'s logical size summation.

## Investigation Steps

1. Confirm the actual gap: compare `df -h` output for the filesystem against `du -sh` totals for everything mounted on it.
2. Run `lsof +L1` (lists open files with a link count of 0, i.e. deleted-but-open) or `lsof | grep -i deleted` to find held-open deleted files directly.
3. If a process is found, check `ls -l /proc/<pid>/fd/` for that process to see the deleted file's originally-reported size.
4. Check whether anything is mounted over an existing directory (`mount` output, or `findmnt`) that could be hiding files still consuming space on the covered filesystem.
5. Check `tune2fs -l` (or equivalent for the filesystem type) for reserved block percentage if the gap is small and unexplained by open deleted files.

## Commands

```bash
df -h /
du -sh /* 2>/dev/null

lsof +L1
lsof | grep -i deleted

ls -l /proc/<pid>/fd/ | grep deleted

findmnt
mount | grep <mountpoint>
```

## Resolution

Once the holding process is identified, the safe fix is to make it release the handle: restart the process (systemctl restart, or an application-level log-reopen signal like `SIGHUP` for daemons that support it) so the deleted file's blocks are finally freed. Killing the process outright works too but is more disruptive; a graceful restart is preferable when the service supports it. Avoid deleting files a running process still has open expecting immediate space recovery — that's what caused this in the first place; the fix is releasing the handle, not deleting again.

## Prevention

- Configure `logrotate` with `copytruncate` for logs written by processes that can't easily be signaled to reopen their log file, so rotation doesn't leave a deleted-but-open handle.
- For processes that do support it, use rotation strategies that reopen file handles on signal (e.g. `SIGHUP`) rather than ones that just delete and expect the process to notice.
- Monitor disk usage via `df`-based alerting, but also periodically check for the `df`/`du` gap itself (e.g. via a scheduled `lsof +L1` check) so a slow leak is caught before it fills the disk.
- When restarting or crash-looping services, make disk-space recovery part of the on-call runbook so it's not rediscovered from scratch during every incident.

## Interview Follow-Up Questions

- Why does Unix allow you to delete a file that's still open, instead of blocking the delete like some other operating systems do?
- How would you find this same class of issue on a containerized workload, where the process might be in a different mount namespace?
- How would you build automated alerting specifically for the df/du divergence, rather than relying on someone noticing it during an incident?

## Key Takeaways

- `df` and `du` measure different things — allocated blocks versus what's visible in the directory tree — and they can legitimately diverge.
- A deleted file with an open file descriptor still consumes disk space until that descriptor closes; there's no file to "find and delete" in that case.
- `lsof +L1` is the direct tool for this exact class of problem.
- The fix is releasing the handle (restart/reopen), not searching the filesystem harder for a file that no longer has a name.

## References

- [Linux man-pages: lsof(8)](https://man7.org/linux/man-pages/man8/lsof.8.html)
- [Linux man-pages: du(1)](https://man7.org/linux/man-pages/man1/du.1.html)
- [logrotate: copytruncate documentation](https://linux.die.net/man/8/logrotate)
