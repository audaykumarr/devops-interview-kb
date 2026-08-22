---
id: docker-volumes-read-only-root-writable-mounts-001
title: "How would you harden a container to run with a read-only root filesystem, given that some part of the application still needs to write to disk somewhere?"
category: docker
subcategory: volumes
technologies:
  - docker
difficulty: advanced
question_type:
  - architecture
tags:
  - docker
  - volumes
  - security
  - hardening
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Security wants every production container to run with a read-only root filesystem, as a hardening baseline. But your application still needs to write somewhere — temp files, a cache directory, maybe a Unix socket. How do you design this so the container is genuinely hardened without breaking the application?

## Short Answer

Run the container with `--read-only` so the entire root filesystem is immutable by default, then explicitly mount tmpfs or volume mounts only at the exact specific paths the application actually needs to write to — the security value comes from making writability the explicit exception at named paths, rather than the default everywhere, so an attacker who compromises the application still can't write or modify anything outside those narrow, intentional locations.

## Detailed Explanation

The point of a read-only root filesystem isn't just "prevent normal operation from writing files" — it's a meaningful containment control: if an attacker manages to exploit the application (e.g., a code injection vulnerability), a read-only root filesystem prevents them from writing a malicious script, modifying an existing binary, or persisting anything to the container's filesystem, even though the process is still running and technically compromised. That containment value only holds if the writable exceptions are genuinely minimal and deliberate.

## Requirements

- The root filesystem must be read-only by default, so any write attempt outside explicitly allowed paths fails.
- The application's genuine functional write needs (temp files, caches, sockets) must still work.
- The writable exceptions must be as narrow as possible — not "make one big writable directory" as an easy workaround that undermines the whole point.

## Architecture

**Enable read-only root at the container runtime level**: `docker run --read-only ...` (or the equivalent `readOnlyRootFilesystem: true` in a Kubernetes security context) makes the entire filesystem immutable except for explicitly mounted paths — this is the baseline the rest of the design builds on.

**Mount tmpfs for genuinely transient writes**: for temp files, caches, or anything that doesn't need to persist beyond the container's life, a tmpfs mount at the specific path the application writes to (`--tmpfs /tmp`, `--tmpfs /app/cache`) satisfies the write requirement without any disk persistence at all — and since it's an explicit, named mount, it's immediately visible in the container's configuration what's writable and why.

**Mount a named volume for writes that do need to persist**: if the application's write need is something that should survive a container restart (not just transient), a scoped named volume mounted at that specific path is the equivalent pattern, keeping the writable surface just as narrow as the tmpfs case but with actual persistence.

**Audit the application's actual write behavior first, rather than guessing**: running the application under the intended read-only configuration in a test environment and observing what actually fails (permission-denied errors reveal every path the application tries to write to) is a more reliable way to enumerate the genuinely necessary writable paths than reading documentation or guessing — applications frequently write to unexpected locations (cache directories, PID files, temp files from underlying libraries) that aren't obvious from the application's own configuration.

## Trade-offs

Read-only root filesystem hardening requires genuinely understanding an application's write behavior, which is real upfront investigation work — skipping this and reactively adding writable mounts every time something breaks in production is both slower and risks a less complete audit of the application's actual footprint. It also means any future application change that introduces a new write path (a new cache location, a new temp file) needs to be caught and accounted for, adding a bit of ongoing maintenance discipline the fully-writable default didn't require.

## Key Takeaways

- Read-only root filesystem is a real containment control — it limits what a compromised process can do, not just what a well-behaved process is allowed to do.
- Make writability the explicit exception at specific, named paths (via tmpfs or scoped volumes), not a broad writable directory that undermines the hardening.
- Use tmpfs for transient writes (temp files, caches) and a named volume only for writes that genuinely need to persist.
- Audit actual write behavior by testing under the read-only configuration and observing permission-denied errors, rather than guessing which paths need to be writable.

## Interview Follow-Up Questions

- How would you handle a third-party base image or application that writes to many unpredictable paths, making a minimal writable-path list hard to pin down?
- How would you verify, on an ongoing basis, that a future code change hasn't introduced a new write path that isn't covered by your current mounts?
- How does this hardening interact with running a container as a non-root user — do you need both, and why?

## References

- [Docker Docs: Runtime privilege and Linux capabilities](https://docs.docker.com/engine/containers/run/#runtime-privilege-and-linux-capabilities)
- [Kubernetes: Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
