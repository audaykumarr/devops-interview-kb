---
id: azure-pipelines-pipeline-design-caching-strategy-001
title: "How would you use the Cache task in Azure Pipelines to speed up dependency installation, and what determines whether your cache key is actually effective?"
category: azure-pipelines
subcategory: pipeline-design
technologies:
  - azure-pipelines
difficulty: intermediate
question_type:
  - practical
  - configuration
tags:
  - azure-pipelines
  - caching
  - performance
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your Azure Pipelines build reinstalls the same dependencies from scratch on every run. How would you use the built-in `Cache` task to speed this up, and what actually determines whether your cache key is effective versus silently useless or, worse, silently stale?

## Short Answer

Use the `Cache` task keyed on a hash of your dependency lockfile (e.g., `key: 'npm | "$(Agent.OS)" | package-lock.json'`), pointing at the package manager's download/store directory as the cached path — the key must change exactly when your actual dependencies change (via the lockfile hash) so the cache is reused whenever nothing's changed and correctly misses, falling back to a full install, the moment the lockfile does change.

## Detailed Explanation

The `Cache` task's effectiveness and safety both come down entirely to the cache key design — a key that's too static risks serving genuinely stale content after a real dependency change; a key that changes too often (or on the wrong thing) gives you no caching benefit despite the added complexity.

```yaml
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | package-lock.json'
    restoreKeys: |
      npm | "$(Agent.OS)"
    path: $(npm_config_cache)
  displayName: Cache npm packages

- script: npm ci
  displayName: Install dependencies
```

**Include the lockfile's content in the key, not just its filename**: Azure Pipelines' `Cache` task supports keying on file content (effectively hashing the specified file), which is what actually ties the cache to your real dependency set — if the lockfile's content changes (a version bump, a new dependency), the key changes and the cache correctly misses, forcing a fresh install rather than silently reusing stale cached packages.

**Include the OS/agent image in the key** if your pipeline runs on multiple agent types — dependencies that involve compiled native modules can produce OS-specific artifacts, and a cache built on one OS restored on another can cause subtle, hard-to-diagnose failures; keying on `$(Agent.OS)` keeps caches scoped correctly per platform.

**Use `restoreKeys` as a fallback, not a substitute for a precise primary key** — a partial match (same OS, different lockfile) can still warm part of the cache for a faster partial restore, but the actual install command (`npm ci`, or equivalent) should still run and reconcile against the current lockfile, rather than trusting a restoreKeys fallback hit as if it were a complete, current cache.

**Cache the package manager's own store/download directory, not the fully-installed dependency tree directly**, letting the normal install command still do its real dependency resolution and linking against the cached downloads — this is generally more robust than trying to cache and restore an entire installed `node_modules`-equivalent directory as-is.

## Key Takeaways

- The `Cache` task's safety and effectiveness depend entirely on the key design — hash the actual lockfile content so the cache correctly invalidates exactly when dependencies genuinely change.
- Include the agent OS in the key if running across multiple platforms, since compiled/native dependencies can produce OS-specific artifacts that shouldn't cross-contaminate caches.
- Use `restoreKeys` for partial-match fallback warming, not as a substitute for the install command still reconciling against the current lockfile.
- Cache the package manager's download/store directory rather than a fully-installed dependency tree, letting normal install resolution still run against the cache.

## Interview Follow-Up Questions

- How would you debug a build that appears to be using a stale cache despite a lockfile-hash-based key?
- How would you measure whether your caching strategy is actually saving meaningful build time, versus adding overhead for a marginal benefit?
- How would this caching strategy change for a monorepo with multiple independently-versioned lockfiles?

## References

- [Azure Pipelines: Cache task](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching)
