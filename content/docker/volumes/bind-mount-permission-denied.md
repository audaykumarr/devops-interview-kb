---
id: docker-volumes-bind-mount-permission-denied-001
title: "A container fails to write to a bind-mounted directory with permission denied, even though the host directory has permissive permissions — why?"
category: docker
subcategory: volumes
technologies:
  - docker
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - docker
  - volumes
  - permissions
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A container bind-mounts a host directory and immediately fails with a permission-denied error trying to write to it — even though `ls -la` on the host shows the directory has `777` permissions, seemingly permissive enough for anyone. What's actually causing the permission mismatch, and how do you fix it?

## Short Answer

The container process runs as a specific UID (user ID), and that UID's actual permissions on the bind-mounted directory are determined by standard Linux file permission rules evaluated from the *host's* perspective — a directory owned by a specific host user with restrictive owner-only permissions can still deny write access to the container's process UID even if some permission bits look permissive, and more subtly, the container's process might be running as a UID that doesn't correspond to any real user on the host at all, which can produce confusing permission behavior depending on exactly what's being checked.

## Detailed Explanation

Bind mounts don't introduce any special container-specific permission model — the container process's UID is checked against the host directory's actual ownership and permission bits using completely standard Linux filesystem permission rules, the same as any other process on the host; the confusion comes from not realizing the container's UID and the host's UID namespace are the same numeric space by default, but the *names* attached to those UIDs can differ or not exist at all inside the container.

## Symptoms

- A container fails with a permission-denied error attempting to write to a bind-mounted host directory.
- `ls -la` on the host shows permissions that appear permissive enough (or the directory is owned by the same user running Docker).
- The exact same directory, accessed directly on the host (not through the container), doesn't have this problem.

## Possible Causes

- The container process runs as a different UID than whatever user owns the host directory, and the directory's actual permission bits (not just a superficial glance at them) don't grant write access to that specific UID.
- The container's default user (often UID 0/root inside many base images, but not always, especially for images deliberately built to run as a non-root user) doesn't match the host directory owner's UID at all.
- SELinux or AppArmor (if enabled on the host) is enforcing an additional mandatory access control layer beyond standard Unix permissions, blocking the bind mount access even when standard permission bits would otherwise allow it.

## Investigation Steps

**Check the container process's actual UID**: `docker exec <container> id` (or checking the image's Dockerfile for a `USER` directive) reveals exactly which UID the container's process is running as — this is the specific identity whose permissions actually matter, not any assumption about it running as root or matching your own host user.

**Check the bind-mounted directory's actual ownership and precise permission bits on the host**: `stat <host-directory>` (more precise than `ls -la` for exact numeric UID/GID and permission bits) shows exactly who owns the directory and what the real permission bits are — comparing this against the container's actual UID (from the previous step) directly reveals whether there's a genuine mismatch.

**Check for SELinux/AppArmor enforcement if standard permissions appear to actually allow the access**: on a host with SELinux enabled (common on RHEL-family systems), even a bind mount with seemingly correct standard Unix permissions can be blocked by SELinux's separate mandatory access control layer — checking `audit.log` for AVC denials, or testing with `:z`/`:Z` volume mount flags (which apply appropriate SELinux labels to the bind-mounted content) confirms and addresses this specific cause if present.

## Resolution

Align the container's process UID with the host directory's ownership — either by running the container with a specific `--user <uid>:<gid>` matching the host directory's owner, or by adjusting the host directory's ownership/permissions to match the container's actual UID (whichever is more appropriate for the specific deployment's security model). If SELinux is the actual cause, apply the correct mount label (`:z` for shared access across containers, `:Z` for private, single-container access) to the bind mount specification. Confirm the fix by re-running the container and confirming the write operation succeeds.

## Key Takeaways

- Bind mount permission checks follow completely standard Linux filesystem rules, evaluated against the container process's actual UID — there's no container-specific permission model layered on top.
- The container's process UID (checked via `docker exec ... id`) and the host directory's actual owner UID (checked via `stat`, not just `ls -la`) are the two values that need to align, not any surface-level permission bit reading.
- A base image's default UID (root, or a specific non-root UID a security-conscious image was built to run as) directly determines what bind-mounted host permissions it needs.
- SELinux/AppArmor can independently block bind mount access even when standard Unix permissions would otherwise allow it — check for this separately if UID/permission alignment alone doesn't resolve the issue.

## Interview Follow-Up Questions

- How would you design a Dockerfile and deployment process to make the container's UID and the host directory's expected ownership consistent and predictable by convention, rather than discovering mismatches ad hoc?
- What's the security trade-off of running a container as root specifically to avoid this class of permission friction, versus the correct but more involved fix of UID alignment?
- How does this same problem manifest (or not) differently for a named volume instead of a bind mount, given named volumes are Docker-managed rather than directly host-path-visible?

## References

- [Docker: Bind mounts](https://docs.docker.com/storage/bind-mounts/)
- [Docker: Understanding user and group ID mapping](https://docs.docker.com/engine/security/userns-remap/)
