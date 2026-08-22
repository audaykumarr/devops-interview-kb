---
id: docker-volumes-anonymous-volumes-accumulating-disk-space-001
title: "A Docker host's disk usage keeps growing even though containers are regularly removed — how do anonymous volumes cause this, and how do you clean them up?"
category: docker
subcategory: volumes
technologies:
  - docker
difficulty: intermediate
question_type:
  - troubleshooting
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

A Docker host's disk usage steadily grows over time, even though the team regularly runs `docker rm` on old containers and `docker rmi` on old images. Investigation traces the growth to accumulating volumes nobody's aware of creating. What are anonymous volumes, why do they accumulate, and how do you actually clean them up?

## Short Answer

An anonymous volume is created automatically whenever a Dockerfile's `VOLUME` instruction (or an equivalent runtime flag without an explicit name) is used — Docker generates a random name for it, and critically, `docker rm` on the container does *not* automatically remove the anonymous volume it was using unless you explicitly pass `-v`/`--volumes` to the removal command, meaning every container removed without that flag leaves its anonymous volume behind, orphaned and accumulating indefinitely.

## Detailed Explanation

Anonymous volumes exist specifically to satisfy a Dockerfile's `VOLUME` declaration (which some base images use to mark a path as needing volume-backed storage) without requiring the user to name one explicitly — this convenience is exactly what makes them easy to lose track of, since there's no memorable name pointing back to which container they belonged to.

## Symptoms

- Disk usage on the Docker host grows steadily over time, even with regular container and image cleanup.
- `docker volume ls` shows a large number of volumes with random, non-descriptive hash-like names.
- These volumes aren't obviously associated with any currently-running container.

## Possible Causes

- One or more images in use have a Dockerfile `VOLUME` instruction, causing Docker to automatically create an anonymous volume for that path every time a container is started from that image, unless an explicit named volume or bind mount is provided for that same path instead.
- Containers are being removed via `docker rm` (or `docker-compose down`) without the `-v`/`--volumes` flag, which is required to also remove any anonymous volumes the container was using — without it, the volume survives the container's removal.
- No regular volume cleanup process exists at all, meaning orphaned anonymous volumes simply accumulate indefinitely with nothing ever reclaiming the disk space.

## Investigation Steps

**Check `docker volume ls` for the volume of unnamed, hash-named volumes**: the sheer count and their non-descriptive names (long random hex strings, rather than meaningful names) directly confirms this is the anonymous-volume-accumulation pattern rather than some other disk usage source.

**Check which currently-running (or recently-run) containers/images actually declare a `VOLUME` in their Dockerfile**: `docker image inspect <image> | grep -A5 Volumes` (or examining the Dockerfile source directly, if available) reveals which images are actually the source of this automatic anonymous volume creation.

**Check the actual container removal process/commands in use**: reviewing deployment scripts, CI/CD pipeline steps, or `docker-compose` configuration for whether `-v` (or `docker-compose down -v`) is included confirms whether this is the specific gap causing volumes to survive container removal.

**Check `docker system df -v` for a breakdown of actual disk usage attributable to volumes specifically**: this gives a concrete measurement of how much disk space the accumulated anonymous volumes are actually consuming, which is useful both for confirming the scale of the problem and for prioritizing the cleanup.

## Resolution

Run `docker volume prune` to remove all volumes not currently referenced by any container (this is generally safe for genuinely orphaned anonymous volumes, but review the list first, since it removes *any* unreferenced volume, not just anonymous ones — a named volume you intended to keep for a stopped-but-not-removed container would also be caught if that container itself gets cleaned up). Going forward, update container removal processes to include `-v`/`--volumes` (or `docker-compose down -v`) so anonymous volumes are cleaned up automatically alongside their containers, and consider whether images with a `VOLUME` instruction should instead be run with explicit named volumes for anything that genuinely needs to persist, making the volume's purpose and ownership clear rather than anonymous.

## Key Takeaways

- Anonymous volumes are created automatically to satisfy a Dockerfile `VOLUME` instruction, given a random, non-descriptive name.
- `docker rm` does not remove a container's anonymous volumes unless `-v`/`--volumes` is explicitly passed — without it, they're silently orphaned and accumulate.
- `docker volume prune` cleans up genuinely unreferenced volumes, but review the list first since it removes any unreferenced volume, not just anonymous ones.
- Prevent recurrence by including `-v` in removal commands going forward, and using explicit named volumes for anything genuinely meant to persist, rather than relying on anonymous volumes.

## Interview Follow-Up Questions

- How would you set up automated, scheduled volume cleanup as an ongoing process, rather than a one-time manual fix?
- What's the risk of running `docker volume prune` on a host with named volumes you intend to keep for containers that are currently stopped but not removed?
- How would you audit a Dockerfile you don't control (a third-party base image) to determine whether it declares a `VOLUME` instruction that will cause this behavior?

## References

- [Docker: Volumes — Remove volumes](https://docs.docker.com/storage/volumes/#remove-volumes)
- [Dockerfile reference: VOLUME](https://docs.docker.com/reference/dockerfile/#volume)
