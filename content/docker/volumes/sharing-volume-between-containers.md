---
id: docker-volumes-sharing-between-containers-001
title: "Two containers need to share the same data — one writes, another reads. How would you design this safely with Docker volumes?"
category: docker
subcategory: volumes
technologies:
  - docker
difficulty: intermediate
question_type:
  - architecture
  - practical
tags:
  - docker
  - volumes
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An application has two containers: one that periodically generates report files, and another (a simple file server) that serves those files to clients. Both need access to the same set of files — one writing, one reading. How would you design the volume sharing between them safely?

## Short Answer

Mount the same named volume into both containers, with the generating container having normal read-write access and the serving container mounted read-only (`:ro`) — this shares the exact same underlying storage between both containers (Docker volumes are designed to be attachable to multiple containers simultaneously) while using the read-only mount specifically to prevent the serving container from ever accidentally modifying files it's only supposed to read.

## Requirements

- Both containers need access to the same underlying files, with changes from the writer visible to the reader.
- The reading container should not be able to modify or delete the files, as a safety boundary against its own potential bugs or compromise.
- The design should work regardless of which container starts first, or whether they're ever running simultaneously versus at different times.

## Detailed Explanation

Docker named volumes aren't exclusive to a single container by design — the same volume can be mounted into any number of containers simultaneously, which is exactly the mechanism this sharing requirement needs, with the read-only flag providing the safety boundary the read-only consumer's role actually calls for.

## Architecture

**Mount the same named volume in both containers**: `docker run -v shared-reports:/data ...` (for the generating container) and `docker run -v shared-reports:/data:ro ...` (for the serving container) both reference the identical volume `shared-reports` — Docker resolves this to the same underlying storage for both, so a file written by the generator is immediately visible to the server reading the same path.

**The `:ro` (read-only) flag on the consuming container's mount is the actual safety mechanism**: without it, both containers would have full read-write access to the shared volume, meaning a bug or compromise in the serving container could corrupt or delete report files it was only ever supposed to read — the read-only flag enforces, at the mount level, that this container genuinely cannot write, regardless of what its own application code might attempt to do.

**This works regardless of container startup order, since the volume itself is independent of any container's lifecycle**: the volume exists as its own Docker-managed entity — whether the generator or the server container starts first, or whether they're ever running at exactly the same moment, doesn't affect the sharing mechanism, since both are simply attaching to the same persistent storage whenever they happen to run.

**For genuinely concurrent read/write access, consider whether the data format itself needs additional coordination**: if the generator writes a report file in multiple steps (not atomically), a reader could potentially see a partially-written file mid-write — using an atomic write pattern (write to a temp file, then rename into place, since rename is atomic on most filesystems) avoids the reader ever seeing incomplete data, which matters specifically because the volume-sharing mechanism itself provides no coordination beyond basic filesystem visibility.

**This pattern extends naturally to more than two containers**: any number of containers can mount the same named volume, each with whatever read/write access level is appropriate for its role — a monitoring container might also mount the same volume read-only to check file freshness, for instance, without needing any change to the sharing design itself.

## Trade-offs

Volume sharing between containers on the same Docker host is simple and effective, but doesn't extend naturally to containers running on genuinely different hosts (a named volume is local to the Docker host it's created on) — for a multi-host deployment needing this same sharing pattern, a network-backed shared storage solution (NFS, a cloud file-storage service) would be needed instead, which is a meaningfully different and more complex setup than same-host volume sharing.

## Key Takeaways

- Docker named volumes can be mounted into multiple containers simultaneously — this is the core mechanism enabling controlled sharing.
- The `:ro` read-only flag on a consuming container's mount is the actual safety boundary, preventing that container from ever modifying data it's only meant to read.
- This works regardless of container startup order or whether the containers run simultaneously, since the volume's lifecycle is independent of any specific container.
- For genuinely concurrent write/read access, consider atomic write patterns (write-then-rename) to avoid a reader seeing partially-written data — the volume mechanism itself provides no coordination beyond basic visibility.

## Interview Follow-Up Questions

- How would you extend this pattern to work across containers running on different hosts, given a named volume is local to a single Docker host?
- What would you do if the reading container needs to be notified when new files arrive, rather than just periodically checking?
- How does this same sharing pattern translate to Kubernetes, given Pods have their own distinct volume-sharing model?

## References

- [Docker: Volumes — Share data among machines](https://docs.docker.com/storage/volumes/)
