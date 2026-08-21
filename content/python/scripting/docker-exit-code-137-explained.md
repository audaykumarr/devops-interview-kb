---
id: python-scripting-docker-exit-code-137-explained-001
title: "Why does Docker report exit code 137 specifically for an OOM-killed container, and how does that map to the underlying kernel signal?"
category: python
subcategory: scripting
technologies:
  - docker
difficulty: beginner
question_type:
  - conceptual
tags:
  - docker
  - oom
  - fundamentals
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A container killed for exceeding its memory limit exits with code 137. Why that specific number, and what does it actually map to at the kernel level?

## Short Answer

137 comes from the Unix convention of encoding a terminating signal as `128 + signal number` — the kernel's OOM killer sends `SIGKILL` (signal 9) to terminate the offending process, and `128 + 9 = 137`, which Docker (and the shell/container runtime generally) reports as the exit code. It's not an arbitrary Docker-specific number; it's the standard, portable way Unix-like systems represent "this process was killed by a signal" as a numeric exit status.

## Detailed Explanation

Unix exit codes are traditionally an 8-bit value, and the convention for a process terminated by a signal (rather than exiting normally via `return`/`exit()`) is to report `128 + <signal number>` as the process's exit status — this lets a caller distinguish "the process exited normally with some status code" (values 0-127, chosen by the program itself) from "the process was killed by a signal" (values 128+, where subtracting 128 tells you exactly which signal). `SIGKILL` is signal number 9 on Linux, giving `128 + 9 = 137` — the specific number seen for an OOM-killed process, or any other process terminated via `SIGKILL` for that matter (137 isn't unique to OOM specifically, just to any `SIGKILL` termination).

The kernel's OOM killer specifically uses `SIGKILL` because it's an unconditional, un-catchable, un-ignorable termination — when the kernel decides a process must die immediately to relieve memory pressure, it can't risk the process's own signal handling delaying or interfering with the termination (as could happen with a catchable signal like `SIGTERM`), so `SIGKILL` guarantees immediate termination with no possibility of the process cleaning up, ignoring, or delaying the kill.

This is why exit code 137 is a strong, specific diagnostic signal worth recognizing on sight: it doesn't just mean "the container failed," it specifically means "this process was killed by `SIGKILL`," and combined with the context of a memory-constrained container, that's a very strong (though not absolutely certain — a manual `docker kill` or another external `SIGKILL` source would produce the same code) indicator that the cause was the cgroup memory limit's OOM killer specifically, pointing the investigation directly at memory usage rather than needing to search broadly for what went wrong.

## Key Takeaways

- Unix exit codes for signal-terminated processes follow the `128 + signal number` convention.
- `SIGKILL` is signal 9, giving `128 + 9 = 137` — the exit code seen for any `SIGKILL`-terminated process, OOM-killed or otherwise.
- The kernel's OOM killer specifically uses `SIGKILL` because it's unconditional and can't be caught, ignored, or delayed by the target process.
- Exit code 137 is a strong diagnostic signal pointing toward a signal-based kill (most commonly OOM in a resource-constrained container context), directing investigation toward memory usage specifically.

## Interview Follow-Up Questions

- What exit code would you see for a process terminated by `SIGTERM` instead, and why might a graceful shutdown handler care about that distinction?
- How would you confirm, beyond just the exit code, that a specific container termination was actually caused by the OOM killer rather than some other SIGKILL source?
- Why can't a process catch or handle SIGKILL the way it can catch SIGTERM?

## References

- [Linux man-pages: signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)
- [Docker Docs: Runtime options with Memory, CPUs, and GPUs](https://docs.docker.com/engine/containers/resource_constraints/)
