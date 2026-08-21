---
id: databases-migrations-backfill-high-write-throughput-001
title: "What would you do differently for a large-table backfill migration if the table were actively receiving high write throughput during the migration window?"
category: databases
subcategory: migrations
technologies:
  - postgresql
difficulty: expert
question_type:
  - scenario
  - practical
tags:
  - databases
  - migrations
  - postgresql
  - production
estimated_time_minutes: 8
companies: []
related_questions:
  - databases-migrations-not-null-column-large-table-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The standard batch-backfill pattern assumes you can iterate through a table's existing rows in some stable order. What changes if the table is receiving high, continuous write throughput throughout the entire migration window — new rows being inserted and existing rows being updated while the backfill is still running?

## Short Answer

The core risk with high concurrent writes is a moving target: batching by a simple primary-key range can miss rows inserted after the batch already passed that range, or can repeatedly re-touch rows being concurrently updated, causing unnecessary lock contention. The fix is batching by a stable, monotonically-increasing checkpoint (like an auto-incrementing ID or a captured snapshot boundary) combined with a follow-up pass specifically targeting rows created or modified *during* the backfill window, rather than assuming one linear pass captures everything.

## Detailed Explanation

The standard backfill pattern (iterate by ID range, small batches, brief pauses) implicitly assumes the table is relatively static during the backfill — but under high write throughput, several things can go wrong that a low-write-volume backfill wouldn't encounter:

**New rows outside the current batch range**: if a backfill is working through IDs 1-1,000,000 and new rows are being inserted with higher IDs continuously, those new rows might already have the correct value by application logic (if the application code has already been updated to always populate the new column), in which case they don't need backfilling — but this needs to be explicitly verified, not assumed, since a gap in that assumption means some new rows silently never get backfilled.

**Concurrent updates to rows the backfill is about to process**: a row being actively updated by application traffic at the same moment the backfill's `UPDATE` targets it increases lock contention specifically on that hot row — under high write throughput, this collision becomes much more likely than in a low-traffic table, and can manifest as increased lock wait times or, in the worst case, deadlocks between the backfill's transaction and application transactions.

**A backfill batch taking meaningfully longer under contention**, throwing off the pacing assumptions (batch size and pause duration) tuned for a quieter table — a batch that was sized for a 100ms execution time under normal conditions might take much longer under lock contention, changing the effective throughput and replication-lag risk profile calculated for the quieter case.

The adjusted approach: **batch by a captured snapshot boundary** — record the maximum ID (or a timestamp) at the start of the backfill, and have the backfill only process rows up to that boundary, explicitly excluding rows inserted afterward, since those are handled separately. **Rely on application-level dual-write** if the application code has already been updated to populate the new column for all new writes going forward (this should be true before or at the start of the backfill) — this means the backfill only needs to handle the historical backlog up to the snapshot boundary, not a continuously moving target. **Add a verification/reconciliation pass** after the main backfill completes, specifically checking for any rows still missing the expected value (which would indicate either a dual-write gap or a race condition), rather than assuming the batched pass alone caught everything. **Tune batch size and pacing conservatively, and monitor actively** (per the batched-backfill monitoring approach) rather than assuming the same batch size that worked in staging or on a quieter table will behave the same way under real production write contention.

## Key Takeaways

- High concurrent write throughput turns the backfill's target into a moving one — new rows and concurrent updates can be missed or cause contention that a static-table assumption doesn't account for.
- Application code should be updated to populate the new column for all new writes *before* or at the start of the backfill, so the backfill only needs to handle the historical backlog, not an ongoing stream.
- Batching against a captured snapshot boundary (not an open-ended "all rows") keeps the backfill's scope well-defined despite ongoing writes.
- A reconciliation pass after the main backfill catches any rows missed due to race conditions or dual-write gaps, rather than assuming the batched pass alone was complete.

## Interview Follow-Up Questions

- How would you design the dual-write logic to be safely rolled back if the migration needs to be aborted partway through?
- What would you do if the reconciliation pass found a meaningful number of rows still missing the backfilled value — how would you investigate why?
- How would you decide whether to slow down application traffic temporarily versus just accepting slower backfill progress under high write load?

## References

- [PostgreSQL Docs: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL Wiki: Don't Do This (ALTER TABLE caveats)](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
