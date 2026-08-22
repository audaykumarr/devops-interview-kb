---
id: linux-process-management-too-many-open-files-001
title: "A service running fine for months suddenly throws 'Too many open files' errors under increased load. How do you fix it correctly, rather than just raising the limit blindly?"
category: linux
subcategory: process-management
technologies:
  - linux
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - linux
  - file-descriptors
  - resource-limits
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A service that's run reliably for months suddenly starts throwing "Too many open files" errors once traffic increases past a certain point. What's actually happening at the OS level, and how do you fix it correctly rather than just raising the file descriptor limit as a blind first response?

## Short Answer

Every process has a limit (`ulimit -n`, typically 1024 by default on many systems) on how many file descriptors it can have open simultaneously — network sockets, open files, and pipes all count against this limit, and once traffic grows enough that concurrent connections/files exceed it, new open attempts fail with exactly this error. The correct fix depends on determining whether the limit is simply too low for genuinely legitimate, healthy usage (raise it deliberately) or whether the process is actually leaking file descriptors (fix the leak) — blindly raising the limit without checking which situation you're actually in just delays the same failure at a higher threshold if it's genuinely a leak.

## Detailed Explanation

The distinction between "we legitimately need more file descriptors than the default allows" and "we're leaking file descriptors and would eventually hit any limit" is the single most important thing to determine before choosing a fix — treating a genuine leak by simply raising the limit doesn't fix anything, it just buys time before the same failure recurs at a higher, harder-to-reach ceiling.

## Symptoms

- The service throws "Too many open files" (or the equivalent `EMFILE`/`ENFILE` error) specifically once concurrent connections or open files cross some threshold.
- The problem may have appeared suddenly after a traffic increase, or may develop gradually over the service's uptime even at steady traffic (a strong signal distinguishing a leak from simply being under-provisioned).
- Restarting the service temporarily resolves the issue, which then recurs — a classic signature of resource leakage, since a genuine capacity mismatch (not a leak) would fail consistently at the same load level regardless of how recently the process restarted.

## Possible Causes

- The process's file descriptor limit (`ulimit -n`) is set to a default value too low for its actual, legitimate concurrent connection/file volume at current traffic levels.
- The application has a genuine file descriptor leak — opening files, sockets, or connections without properly closing them (a common bug: an exception path that skips a `close()` call, or a connection pool that doesn't properly release connections back).
- A dependency or library used by the application has its own leak, not obviously visible in the application's own code.

## Investigation Steps

1. Check the process's current open file descriptor count over time: `ls /proc/<pid>/fd | wc -l`, sampled repeatedly, to see whether it's climbing steadily (leak) or staying roughly proportional to actual current load (capacity issue).
2. Check the process's actual configured limit: `cat /proc/<pid>/limits` (look for "Max open files") versus the system/service default, to confirm what threshold is actually being hit.
3. If a leak is suspected, inspect what the open file descriptors actually are: `ls -l /proc/<pid>/fd/` shows what each descriptor points to (a file, a socket, a pipe), which can reveal a pattern (e.g., many sockets to the same downstream service, suggesting a connection pool isn't releasing correctly).
4. Correlate the growth pattern (if any) against specific application activity or code paths, to narrow down where in the application logic descriptors are being opened without a corresponding close.

## Resolution

1. **If the file descriptor count is proportional to genuine current load and simply exceeds a too-low default limit**: raise the limit deliberately (via `ulimit`, systemd's `LimitNOFILE`, or the equivalent for your process manager/container runtime) to a value with real headroom above legitimate peak usage, based on actual measured data.
2. **If the file descriptor count grows steadily over time regardless of load**: this is a genuine leak, and raising the limit doesn't fix it — trace the specific code path opening descriptors without closing them (using the `/proc/<pid>/fd/` inspection to narrow down what kind of resource is leaking), and fix the actual bug (missing `close()` in an exception path, a connection pool misconfiguration).
3. **Verify the fix** by monitoring file descriptor count over an extended period under realistic load after the fix, confirming it stays stable (for a leak fix) or scales proportionally and safely within the new limit (for a capacity fix), rather than assuming the fix worked based on the immediate symptom disappearing.

## Prevention

- Monitor open file descriptor count per process as an ongoing metric with alerting on abnormal growth trends, catching a leak developing gradually before it causes an outage.
- Set file descriptor limits deliberately based on actual measured peak legitimate usage with real headroom, rather than relying on system defaults that may not match your actual workload.
- Ensure resource cleanup (file/socket/connection closing) happens in a way that's guaranteed even on exception paths (using language-appropriate patterns like Python's context managers or Java's try-with-resources), rather than relying on cleanup code that can be skipped if an error occurs first.

## Key Takeaways

- "Too many open files" means the process hit its file descriptor limit — sockets, open files, and pipes all count, and the limit is per-process, commonly defaulting to 1024.
- Distinguish a genuine capacity mismatch (descriptor count proportional to legitimate load, exceeding a too-low limit) from a leak (descriptor count grows steadily regardless of load) before choosing a fix — this determines whether raising the limit is the actual fix or just delays the same failure.
- `/proc/<pid>/fd/` inspection reveals what kind of resource is actually accumulating, which is the key diagnostic step for narrowing down a suspected leak's source.
- Blindly raising the limit without determining which situation you're in doesn't fix a genuine leak — it just moves the same eventual failure to a higher, harder-to-reach threshold.

## Interview Follow-Up Questions

- How would you set up proactive monitoring to catch a slow file descriptor leak before it causes an outage, rather than discovering it reactively?
- What's the difference between the per-process limit (`ulimit -n`) and the system-wide limit (`fs.file-max`), and when would each actually become the binding constraint?
- How would this investigation differ for a containerized process, given the container runtime may impose its own separate limits?

## References

- [Linux man-pages: getrlimit(2)](https://man7.org/linux/man-pages/man2/getrlimit.2.html)
- [Linux man-pages: proc(5) — /proc/[pid]/fd/](https://man7.org/linux/man-pages/man5/proc.5.html)
