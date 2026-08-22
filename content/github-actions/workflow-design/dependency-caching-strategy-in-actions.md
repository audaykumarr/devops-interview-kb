---
id: github-actions-workflow-design-dependency-caching-001
title: "Your GitHub Actions build spends 3 of its 5 minutes reinstalling the same dependencies every single run. How would you design caching to fix that without risking stale or corrupted cache issues?"
category: github-actions
subcategory: workflow-design
technologies:
  - github-actions
difficulty: intermediate
question_type:
  - practical
  - configuration
tags:
  - github-actions
  - caching
  - performance
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your GitHub Actions CI build spends 3 of its 5 total minutes reinstalling the exact same dependencies on every single run. How would you design a caching strategy to fix that, without introducing stale or corrupted-cache issues down the line?

## Short Answer

Use `actions/cache` (or a language ecosystem's built-in caching, like `actions/setup-node`'s `cache` option) keyed on a hash of your dependency lockfile, so the cache is reused whenever the lockfile hasn't changed and automatically misses (falling back to a fresh install) whenever it has — the lockfile hash is what keeps the cache both effective (reused most of the time) and safe (never silently serving stale dependencies after a real change).

## Detailed Explanation

The core design principle for dependency caching is that the cache key must precisely reflect what would make the cached content invalid — if the key is too loose (e.g., a static key that never changes), you risk serving a stale cache after a genuine dependency change; if it's too strict (e.g., keyed on something that changes every run), you get no caching benefit at all. A lockfile hash is the right level of precision because it changes exactly when, and only when, your actual dependency set changes.

**Key the cache on a hash of the lockfile**: `key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json') }}` (or the equivalent for your ecosystem's lockfile) means the cache is a hit whenever the lockfile is byte-identical to a previous run, and a clean miss the moment it changes — this is what prevents the classic stale-cache bug of an updated dependency silently continuing to use old cached content.

**Use restore-keys as a fallback, not a primary match**: `restore-keys` lets you fall back to a close-but-not-exact-match cache (e.g., from a previous lockfile version) to at least partially warm the cache even on a miss, but the actual dependency install step still needs to run and reconcile against the current lockfile — this speeds up partial cache hits without risking serving fully stale content as if it were current.

**Scope the cache path to exactly what the package manager actually needs restored**, not your entire working directory — caching the package manager's own download/store directory (not `node_modules` directly, for ecosystems where that distinction matters) is generally the more robust pattern, since it lets the package manager's own install step do its normal dependency resolution and linking against the cached downloads, rather than trying to cache and restore an entire installed dependency tree as-is.

**Set a reasonable cache eviction expectation**: GitHub Actions caches are automatically evicted after a period of inactivity and have an overall size limit per repository — a caching strategy that assumes a cache will always be present is fragile; the install step should always be capable of running a full, correct install from scratch if the cache is missing, with caching purely as a speed optimization, never a correctness dependency.

## Key Takeaways

- Key the cache on a hash of your dependency lockfile — this is what keeps caching both effective and safe from serving stale content after a real dependency change.
- Use `restore-keys` as a fallback for partial cache warming, not as a way to skip a genuine dependency reconciliation step.
- Cache the package manager's download/store directory rather than a fully installed dependency tree, letting the normal install process still run against the cache.
- Design the install step to work correctly from a cold cache (eviction happens automatically) — caching should be a speed optimization, never a correctness dependency.

## Interview Follow-Up Questions

- How would you debug a build that's intermittently using a stale cache despite a lockfile-hash key?
- How would you handle caching for a monorepo with multiple independently-versioned lockfiles?
- What's the trade-off between GitHub's built-in `actions/cache` and a language ecosystem's own native caching support (like `setup-node`'s `cache` input)?

## References

- [GitHub Docs: Caching dependencies to speed up workflows](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
