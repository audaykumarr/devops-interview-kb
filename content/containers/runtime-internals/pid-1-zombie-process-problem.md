---
id: containers-runtime-internals-pid-1-zombie-problem-001
title: "Your containerized application's process count keeps growing over time, even though nothing appears to be leaking connections or memory. What's likely happening, and why is it specific to running in a container?"
category: containers
subcategory: runtime-internals
technologies:
  - containers
  - linux
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - containers
  - linux
  - pid-1
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A containerized application's process count (visible via `docker top` or `ps` inside the container) keeps slowly growing over time, even though there's no obvious memory or connection leak. Eventually the container hits a process limit and things start failing. What's likely happening, and why does this specifically show up in a container in a way it might not on a normal host?

## Short Answer

This is very likely zombie process accumulation caused by the classic "PID 1 problem": the container's main process (PID 1 inside its own PID namespace) is spawning child processes (directly, or via a shell script, or a language runtime that forks) that exit, but PID 1 isn't properly reaping them via `wait()` — on a normal Linux host, `init` (PID 1) is specifically designed to reap orphaned zombies, but many application binaries running as a container's PID 1 were never designed to take on that responsibility, since they were written assuming a real init system would handle it.

## Detailed Explanation

Every process that exits needs its parent to call `wait()` on it to fully clean up its process table entry — until that happens, the exited process remains a "zombie," consuming a process table slot but nothing else. On a normal Linux system, `init` (PID 1) is specifically responsible for reaping any orphaned process whose original parent has already exited, which is a role real init systems are deliberately built for. When a container's PID 1 is just your application binary (not a real init system), it inherits this reaping responsibility by virtue of being PID 1 in its namespace, but most application code was never written with that responsibility in mind.

## Symptoms

- Process count inside the container grows steadily over time without an obvious corresponding increase in actual application load.
- Processes are visible in a zombie state (`ps` showing `Z` status) when inspected.
- Eventually the container hits a process/PID limit (`ulimit`, or a cgroup pids controller limit), causing new process creation to fail.

## Possible Causes

- The application itself (or a script it runs) spawns child processes or subprocesses that exit, but the application (running as PID 1) never calls `wait()` on them, since it wasn't written expecting to be PID 1.
- A shell script is used as the container's entrypoint, and shell doesn't automatically reap background/orphaned child processes the way a real init system would.
- A language runtime or process manager inside the container spawns worker processes that exit without being properly reaped by the parent.

## Investigation Steps

1. Confirm the container's actual PID 1 process: `docker top <container>` or `ps` inside the container, checking what's running as PID 1.
2. Check for zombie processes specifically: `ps aux` (or equivalent inside the container) showing entries in `Z` (zombie) state.
3. Correlate zombie accumulation with actual application behavior — is the application forking subprocesses (shelling out to another command, spawning worker processes) as part of its normal operation?
4. Check the container's process limit configuration (cgroup `pids.max`, or the container runtime's configured limit) to understand how much headroom exists before this becomes a hard failure.

## Resolution

1. **Use a minimal init system as PID 1 instead of the application directly** — tools like `tini` or `dumb-init` are specifically designed to be a container's PID 1, correctly reaping zombie processes (and correctly forwarding signals to the actual application, a related but separate PID-1 responsibility) without the weight of a full traditional init system.
2. **In Docker specifically, this can often be enabled with a simple flag**: `docker run --init` automatically injects a minimal init process (based on `tini`) as PID 1, running the specified command as its child — a low-effort fix if you're not already using one.
3. **If using a shell script as the entrypoint, ensure it properly execs into the final process** (`exec "$@"` at the end, rather than running the final command as a plain subprocess) so the actual application becomes PID 1 directly rather than remaining a child of the shell — combined with a proper init wrapper if the application itself spawns further children.
4. **Verify the fix** by monitoring process count over an extended period under normal load, confirming it no longer grows unboundedly.

## Prevention

- Default to using `tini`, `dumb-init`, or the equivalent runtime flag (`docker run --init`) for any container whose main process might spawn child processes, rather than only adding it reactively after hitting this problem.
- Be deliberate about entrypoint scripts using `exec` to hand off to the final process, rather than leaving the shell as an intermediate parent.
- Monitor process count as a container health metric where relevant, so slow zombie accumulation is caught proactively rather than discovered when the process limit is hit.

## Key Takeaways

- The "PID 1 problem" happens because PID 1 inherits the responsibility of reaping orphaned zombie processes, a role most application binaries were never written to fulfill.
- This is specific to containers because a real Linux host's `init` is purpose-built for this reaping role, while a container's PID 1 is often just the application itself.
- A minimal init wrapper (`tini`, `dumb-init`, or `docker run --init`) is the standard, low-effort fix, correctly reaping zombies and forwarding signals.
- Ensure shell-script entrypoints use `exec` to hand off to the final process, avoiding leaving the shell as an unnecessary intermediate parent process.

## Interview Follow-Up Questions

- Why does proper signal forwarding also matter for a container's PID 1, beyond just zombie reaping?
- How would you detect this problem proactively in a production environment, before it causes an actual outage?
- How does Kubernetes' own Pod-level process handling relate to this problem — does it change anything about needing an init wrapper?

## References

- [Docker Docs: init flag](https://docs.docker.com/reference/cli/docker/container/run/#init)
- [tini: A tiny but valid init for containers](https://github.com/krallin/tini)
- [Understanding the "PID 1 problem" (Yelp Engineering Blog)](https://engineeringblog.yelp.com/2016/01/dumb-init-an-init-for-docker.html)
