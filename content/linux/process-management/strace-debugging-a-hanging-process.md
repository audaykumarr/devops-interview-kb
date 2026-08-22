---
id: linux-process-management-strace-hanging-process-001
title: "A production process appears to be running (it's in the process list, consuming no CPU) but isn't responding to any requests. How would you use strace to figure out what it's actually doing?"
category: linux
subcategory: process-management
technologies:
  - linux
difficulty: advanced
question_type:
  - practical
tags:
  - linux
  - strace
  - debugging
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A production process shows up in `ps` as running, consumes essentially no CPU, but isn't responding to any requests — restarting it fixes the symptom, but you'd like to actually understand what it was stuck doing before it happens again. How would you use `strace` to investigate a hung process like this?

## Short Answer

`strace -p <pid>` attaches to the running process and prints every system call it makes in real time — for a hung process consuming no CPU, this almost always immediately reveals it's blocked inside a specific system call (a `read()` waiting on a socket or file, a `futex()` waiting on a lock, a `connect()` waiting on a network timeout) that never returns, which tells you precisely what resource or dependency the process is actually stuck waiting on, rather than just knowing generically that it's "hung."

## Detailed Explanation

A process consuming zero CPU while appearing "hung" is a strong hint that it's blocked in a system call waiting for something external (I/O, a lock, a network response) rather than stuck in an actual CPU-bound infinite loop (which would show up as high, not zero, CPU usage) — `strace` is the direct tool for observing exactly which system call it's blocked in, since that's precisely the boundary between the process and the kernel/external world where the hang is actually occurring.

**Attaching `strace` to a running process shows its current and ongoing system call activity**: `strace -p <pid>` attaches without needing to restart or modify the process, printing each system call as it's made — for a genuinely hung process, you'll typically see it either making no new calls at all (stuck inside one specific blocking call) or, if you attach right as it makes progress, a `-p` attach reveals whatever call it's blocked in at that moment.

**A process blocked in `read()`/`recv()` on a socket is waiting on a network peer**: this points toward a downstream dependency (a database, another service, an external API) that isn't responding — the fix direction is investigating that downstream dependency's health, or adding an appropriate timeout to the call so the process doesn't hang indefinitely waiting on it in the future.

**A process blocked in `futex()` is waiting on a lock held by another thread**: this points toward a concurrency bug — a deadlock, or a lock held for far longer than expected by another thread within the same process — requiring investigation of the application's own internal locking logic rather than an external dependency.

**A process blocked in `connect()` for an unusually long time suggests a network-level issue reaching the destination at all**: distinct from being blocked in `read()`/`recv()` (which implies a connection was established but no response came back), a long-hanging `connect()` suggests the destination isn't reachable or is dropping the connection attempt entirely, pointing toward network/firewall/DNS investigation rather than an application-level slow-response issue.

**`strace -f` follows child processes/threads too**: for a multi-threaded or multi-process application, attaching with just `-p <pid>` only shows the main process — `-f` (follow forks) ensures you see system call activity across all threads/child processes, important since the actual hang might be in a specific worker thread rather than the main process itself.

**A useful complementary check: `/proc/<pid>/stack` (if accessible) or a language-specific stack dump** (many runtimes support signaling a process to dump its current stack trace) can show the application-level call stack corresponding to where it's blocked, giving you the application code context to go with `strace`'s system-call-level view — the two together (what system call it's blocked in, and what application code led there) usually gives a complete picture.

## Key Takeaways

- A process consuming zero CPU while appearing hung is likely blocked in a system call waiting on something external, not stuck in a CPU-bound loop — `strace -p <pid>` reveals exactly which call and what it's waiting on.
- A hang in `read()`/`recv()` on a socket points to an unresponsive downstream dependency; a hang in `futex()` points to an internal locking/concurrency bug; a long-hanging `connect()` points to a network-reachability issue.
- `strace -f` is necessary to see system call activity across all threads/child processes in a multi-threaded application, since the hang might be in a specific worker, not the main process.
- Combining `strace`'s system-call-level view with an application-level stack dump gives the most complete picture of both what the process is blocked on and what application code path led there.

## Interview Follow-Up Questions

- How would you add appropriate timeouts to prevent this specific kind of indefinite hang from happening again, once you've identified the blocking call?
- What's the performance overhead concern with running `strace` against a production process, and how would you mitigate it?
- How would you investigate the same hang if `strace` itself wasn't available or permitted in the environment (e.g., certain restricted container runtimes)?

## References

- [Linux man-pages: strace(1)](https://man7.org/linux/man-pages/man1/strace.1.html)
- [Linux man-pages: futex(2)](https://man7.org/linux/man-pages/man2/futex.2.html)
