---
id: docker-fundamentals-image-vs-container-001
title: "What's the actual difference between a Docker image and a Docker container? People use the words interchangeably, but they're not the same thing."
category: docker
subcategory: fundamentals
technologies:
  - docker
difficulty: beginner
question_type:
  - conceptual
tags:
  - docker
  - fundamentals
  - images
  - containers
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

"Image" and "container" get used almost interchangeably in casual conversation, but Docker treats them as distinctly different things. What's the actual difference, and why does the distinction matter in practice?

## Short Answer

A Docker image is a read-only, layered template — the packaged filesystem and metadata needed to run something, built once and never modified. A container is a running (or stopped) instance created *from* an image, with its own writable layer on top and its own process, network namespace, and lifecycle. The relationship is the same as a class versus an object, or a program file versus a running process: one image can spawn many independent containers.

## Detailed Explanation

An image is built from a `Dockerfile` as a stack of read-only layers — each instruction (`FROM`, `RUN`, `COPY`, etc.) typically adds one layer, and Docker caches and reuses layers across builds and images that share history, which is why images with a common base build faster and share disk space. Once built, an image never changes; running it doesn't modify it. Images are identified by name and tag (`node:20-alpine`) or a content-addressed digest, and they can be pushed to and pulled from a registry independent of anything actually running.

A container is created by taking an image and adding a thin writable layer on top, plus its own isolated runtime state: its own process tree (via PID namespace), its own network interfaces, its own mounted filesystem view, and its own lifecycle (`docker run`, `docker stop`, `docker rm`). Any files a running process writes go into that container's writable layer, not into the underlying image — which is why deleting a container and starting a fresh one from the same image gives you a clean slate, and why two containers started from the identical image are completely independent of each other despite sharing the same read-only base layers underneath.

This distinction is why `docker run node:20-alpine` can be executed many times to produce many independent containers from the same image, why stopping and removing a container doesn't affect the image it came from, and why "rebuild the image" and "restart the container" are different operations solving different problems — rebuilding is needed when the underlying template (code, dependencies, base OS) changes; restarting is enough when you just need a fresh runtime instance of what's already built.

## Key Takeaways

- An image is a read-only, layered template; a container is a running (or stopped) instance created from an image, with its own writable layer.
- One image can produce many independent containers, each with isolated runtime state.
- Changes made inside a running container (writes to the filesystem) live in that container's own writable layer, not the underlying image.
- "Rebuild the image" and "restart the container" solve different problems — one changes the template, the other just gets a fresh instance of it.

## Interview Follow-Up Questions

- What happens to a container's writable-layer changes when the container is removed — are they recoverable?
- How do Docker volumes relate to this layered filesystem model, and why are they used for data that needs to outlive a container?
- Why do multiple containers from the same image share disk space for their read-only layers but not for their writable layers?

## References

- [Docker Docs: What is an image?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/)
- [Docker Docs: What is a container?](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/)
- [Docker Docs: Storage drivers and layers](https://docs.docker.com/engine/storage/drivers/)
