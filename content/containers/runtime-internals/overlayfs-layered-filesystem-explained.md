---
id: containers-runtime-internals-overlayfs-explained-001
title: "How does a container image's layered filesystem actually work at the OS level — what makes writes inside a running container not modify the underlying image?"
category: containers
subcategory: runtime-internals
technologies:
  - containers
  - linux
difficulty: intermediate
question_type:
  - conceptual
tags:
  - containers
  - linux
  - overlayfs
  - filesystem
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A container image is made of stacked, read-only layers, but a running container can write files and those writes disappear when the container is removed, without ever modifying the original image. How does this actually work at the OS level?

## Short Answer

Container runtimes use a union filesystem (most commonly OverlayFS on Linux) that stacks the image's read-only layers and adds one additional writable layer on top, specifically for the running container — any write appears to modify a file, but OverlayFS actually implements this via "copy-on-write": modifying a file that exists in a lower, read-only layer copies it up into the writable top layer first, then modifies the copy, leaving the original read-only layer completely untouched.

## Detailed Explanation

OverlayFS presents a single, unified view of multiple underlying directories (layers) stacked on top of each other, resolving what a process sees when it reads a given path by checking the layers from top to bottom and using the first version of that file it finds — this stacking, combined with copy-on-write semantics for writes, is what produces the "layered, but writes don't touch the original image" behavior.

**The image's layers are read-only and shared**: each layer in a container image (each `RUN`, `COPY`, or similar Dockerfile instruction typically produces its own layer) is stored once and mounted read-only — critically, multiple containers started from the same image can all share and reuse these same underlying read-only layers simultaneously, since none of them ever modify those layers directly, which is also why starting many containers from the same image is fast and space-efficient (no need to copy the image's data per container).

**A dedicated writable layer sits on top for each running container**: when a container starts, the runtime creates a new, empty writable layer specific to that container instance, mounted as the topmost layer in the OverlayFS stack — this is where all of that specific container's actual filesystem writes land.

**Copy-on-write handles modifying a file that exists in a lower layer**: if a process inside the container writes to a file that already exists in one of the read-only image layers, OverlayFS first copies that file up into the container's writable top layer (this "copy-up" operation is what the name copy-on-write refers to), then applies the write to that copy — the original file in the read-only layer is never touched, remaining exactly as it was in the shared image.

**Deleting a file works via "whiteout" markers, since a read-only layer can't actually be modified to remove something**: OverlayFS handles a deletion by creating a special marker file (a "whiteout") in the writable layer, which tells the filesystem to hide that path from the unified view, even though the actual file still physically exists, untouched, in the lower read-only layer.

**Removing the container discards the writable layer, restoring the pristine image**: since all of a specific container instance's actual changes (new files, modified copies, whiteout markers) live entirely in that container's own writable layer, deleting the container (and its writable layer) leaves the underlying shared, read-only image layers completely untouched and ready to be used again pristine by the next container started from that same image.

**This is also why frequent large writes inside a container can have real performance implications**: a copy-up operation for a large file that exists in a lower layer means copying that entire file before the write can proceed — for workloads doing heavy, repeated writes to files that originated in the image layers, this copy-on-write overhead is a real, sometimes underappreciated performance cost, which is part of why persistent, frequently-written data (like a database's data directory) is generally placed on a mounted volume rather than the container's own layered, copy-on-write filesystem.

## Key Takeaways

- OverlayFS (the most common Linux union filesystem for containers) stacks an image's read-only layers with one writable layer specific to each running container instance.
- Modifying a file that exists in a lower, read-only layer triggers copy-on-write: the file is copied up into the writable layer first, then modified, leaving the original layer untouched.
- Deletions are implemented via whiteout markers in the writable layer, hiding a file from the unified view without actually removing it from the read-only layer beneath.
- Removing a container discards only its writable layer, leaving the shared, read-only image layers pristine and reusable — this is why the same image can back many independent containers efficiently.

## Interview Follow-Up Questions

- Why does this copy-on-write behavior make OverlayFS a poor fit for a database's actual data directory, and what's the standard alternative?
- How would you inspect a running container's writable layer contents directly on the host filesystem?
- What happens to a container's writable layer if the container is stopped but not removed, versus fully removed?

## References

- [Docker Docs: About storage drivers (OverlayFS)](https://docs.docker.com/engine/storage/drivers/overlayfs-driver/)
- [Linux kernel documentation: Overlay Filesystem](https://docs.kernel.org/filesystems/overlayfs.html)
