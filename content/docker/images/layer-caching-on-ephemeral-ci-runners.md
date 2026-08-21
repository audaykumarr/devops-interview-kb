---
id: docker-images-ci-layer-caching-ephemeral-runners-001
title: "How does Docker layer caching behave differently on CI runners without a persistent Docker daemon between builds, and how would you mitigate the resulting slowdown?"
category: docker
subcategory: images
technologies:
  - docker
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - docker
  - ci-cd
  - layer-caching
estimated_time_minutes: 6
companies: []
related_questions:
  - docker-images-multi-stage-optimization-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Docker's layer caching makes local rebuilds fast because the daemon keeps previously-built layers around. Many CI runners spin up a fresh, ephemeral environment for every build with no persistent Docker daemon. How does that change caching behavior, and how would you mitigate the resulting slowdown?

## Short Answer

On a fresh, ephemeral runner, there's no local layer cache at all to reuse — every build starts genuinely from scratch, rebuilding every layer regardless of what changed, since Docker's cache is a local daemon-side artifact with nothing to persist between isolated runner instances. Mitigation means explicitly reintroducing a cache across builds: registry-based cache (`--cache-from` pulling previously-pushed layers from a registry), a CI platform's own build-cache feature (many CI providers offer persistent cache storage across runs specifically for this), or a self-hosted runner pool with a genuinely persistent Docker daemon instead of ephemeral per-build environments.

## Detailed Explanation

Docker's layer cache is fundamentally local to the daemon that built the layers — the daemon checks each Dockerfile instruction against its local cache of previously-built layers, reusing a layer if the instruction and its build context are unchanged since last time. This works great on a developer's laptop (the same daemon persists across builds) or on a self-hosted CI runner with a persistent Docker daemon, but a fresh, ephemeral CI runner (common on hosted CI platforms specifically to guarantee build isolation and a clean environment per run) starts with an empty daemon and no prior layer cache at all — every build is a genuine cold build, rebuilding every layer from the first `FROM` instruction onward, regardless of how little actually changed since the last build.

This is a real, common source of "why is CI so much slower than my local build" confusion — the Dockerfile and caching strategy might be well-designed for local iteration, but the ephemeral CI environment structurally can't benefit from it without deliberate extra configuration.

**Registry-based caching** (`docker build --cache-from <registry-image> ...`, or BuildKit's more granular `--cache-from type=registry`) explicitly pulls previously-built layers from a container registry before building, giving the ephemeral runner a cache source even though its local daemon started empty — the trade-off is the time spent pulling the cache image itself, which needs to be smaller than the time saved by not rebuilding, to be a net win.

**CI-platform-native caching** (many providers — GitHub Actions' `actions/cache`, GitLab CI's cache configuration — support persisting arbitrary directories, including Docker's build cache, between runs) achieves a similar effect without needing an explicit registry round-trip, often with tighter integration and less manual cache-management logic in the pipeline itself.

**BuildKit's cache mount and export/import features** are specifically designed for this scenario — `--cache-to`/`--cache-from` with BuildKit's more granular cache backends (registry, local, or CI-platform-native) tend to give more precise, layer-level cache reuse than the older `docker build` cache mechanism, worth adopting specifically for CI pipelines that hit this problem.

**Self-hosted persistent runners** sidestep the problem structurally by keeping a genuinely persistent Docker daemon across builds — the trade-off being everything self-hosted infrastructure involves (provisioning, maintenance, and the loss of guaranteed clean-environment isolation per build that ephemeral runners provide).

## Key Takeaways

- Docker's layer cache is local to the daemon; an ephemeral CI runner with no persistent daemon has no cache to reuse by default, making every build a cold build.
- Registry-based caching (`--cache-from` pulling prior layers from a registry) and CI-platform-native cache persistence are the standard mitigations.
- BuildKit's more granular cache import/export mechanisms generally outperform the older `docker build` caching approach for this specific problem.
- Self-hosted persistent runners avoid the problem structurally but trade away the guaranteed clean-environment isolation ephemeral runners provide.

## Interview Follow-Up Questions

- What's the trade-off between registry-based caching's pull time and the actual build-time savings it provides — how would you measure whether it's a net win?
- How would you structure a Dockerfile specifically to maximize cache-hit rate given registry-based caching's granularity?
- How would BuildKit's cache mount feature (for package manager caches specifically, like `apt` or `npm`) complement layer caching for this same CI-speed problem?

## References

- [Docker Docs: Cache management with BuildKit](https://docs.docker.com/build/cache/)
- [Docker Docs: Registry cache backend](https://docs.docker.com/build/cache/backends/registry/)
- [GitHub Actions: Cache action](https://github.com/actions/cache)
