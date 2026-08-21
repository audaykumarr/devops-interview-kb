---
id: cicd-deployment-strategies-schema-migration-impact-001
title: "How does a database schema migration change your deployment strategy for either blue-green or canary — what breaks if you don't account for it?"
category: cicd
subcategory: deployment-strategies
technologies:
  - databases
difficulty: advanced
question_type:
  - conceptual
  - scenario
tags:
  - cicd
  - deployment-strategies
  - databases
  - migrations
estimated_time_minutes: 8
companies: []
related_questions:
  - cicd-deployment-strategies-blue-green-canary-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Blue-green and canary deployments both assume two versions of an application can coexist safely. A database schema migration complicates that assumption significantly. How does it change the strategy, and what actually breaks if it's not accounted for?

## Short Answer

Both strategies assume old and new application code can run simultaneously against the *same* database, but a schema migration that isn't backward-compatible breaks that assumption directly — old code can crash against a changed schema (a renamed/dropped column it still expects), or new code can crash against an unmigrated schema. The fix is the "expand/contract" pattern: migrate the schema in backward-compatible stages so both old and new application code can run against it simultaneously throughout the deployment, rather than treating the schema change as an atomic all-or-nothing step alongside the code deployment.

## Detailed Explanation

Blue-green deployment keeps two full environments (old and new) running, cutting traffic over from one to the other; canary keeps both running simultaneously at partial traffic, gradually shifting the split. Both fundamentally rely on old and new application code being safe to run *concurrently* for some period — but they typically share a single database, and a non-backward-compatible schema change violates the assumption that both versions can safely operate against that shared state at the same time.

Concretely: if a migration drops a column the old code still reads, the old version (still receiving some traffic during the canary/blue-green window) crashes on that shared database. If a migration adds a `NOT NULL` column the old code doesn't know to populate, inserts from the old version can start failing. Either direction breaks the coexistence assumption these strategies depend on.

The standard fix is the **expand/contract** (or "parallel change") pattern, splitting the migration into stages that never break either version:

1. **Expand**: add the new column/table alongside the old one, without removing anything — both old code (using the old column) and new code (which can start using the new column) work fine against this schema.
2. **Deploy application code** that writes to both old and new columns (dual-write) or, if only new code needs the new column, deploy the new version — old code is unaffected since nothing it depends on was removed.
3. **Backfill** existing data into the new column/table if needed, as a separate step, not bundled into the deployment itself.
4. **Contract**: only once all traffic is confirmed running the new version (the canary/blue-green cutover is fully complete and the old version won't run again) is it safe to drop the old column/table in a later, separate migration.

This turns one risky atomic schema-and-code change into several individually-safe steps, each compatible with both versions coexisting — which is exactly what blue-green and canary need in order to actually deliver the safety they're designed to provide, rather than silently breaking on the database layer while the application layer looks like it's deploying safely.

## Key Takeaways

- Blue-green and canary both assume old and new code can run concurrently against the same database — a non-backward-compatible schema change breaks that assumption directly.
- A migration that removes or newly-requires something the old code doesn't expect can crash either version during the coexistence window.
- The expand/contract pattern splits a migration into backward-compatible stages, keeping both versions safe throughout the deployment.
- Only drop old schema elements (the "contract" step) after confirming the old version will never run again — a separate, later migration from the deployment itself.

## Interview Follow-Up Questions

- How would you handle a migration that's fundamentally difficult to make backward-compatible, like a data type change on an existing column?
- How would dual-writing during the expand phase affect data consistency if the old and new versions write slightly different values?
- How would you automate verification that a migration is genuinely backward-compatible before it ships, rather than relying on manual review?

## References

- [Martin Fowler: Evolutionary Database Design (Parallel Change)](https://martinfowler.com/bliki/ParallelChange.html)
- [PostgreSQL Docs: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
