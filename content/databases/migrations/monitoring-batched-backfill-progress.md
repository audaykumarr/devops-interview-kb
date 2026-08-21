---
id: databases-migrations-monitoring-batched-backfill-001
title: "How would you monitor a batched backfill in production to know it's progressing safely, not falling behind, and not causing replication lag?"
category: databases
subcategory: migrations
technologies:
  - postgresql
difficulty: advanced
question_type:
  - practical
  - scenario
tags:
  - databases
  - migrations
  - monitoring
  - postgresql
estimated_time_minutes: 7
companies: []
related_questions:
  - databases-migrations-not-null-column-large-table-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A batched backfill is running against a large production table as part of a schema migration. How would you actually monitor it — to know it's making healthy progress, not falling behind, and not silently causing replication lag or other side effects?

## Short Answer

Track batch-level progress explicitly (rows processed, batches completed, estimated time remaining) rather than treating it as a black box, monitor replication lag on read replicas throughout (since backfill writes are exactly the kind of sustained write load that can cause lag to grow), and set an automatic pause/abort condition tied to replication lag or database load thresholds so the backfill backs off automatically rather than requiring a human to notice a problem and intervene manually.

## Detailed Explanation

**Explicit progress tracking**: the backfill script itself should log or record its own progress — which batch it's on, rows processed so far, and (once a stable per-batch timing emerges) an estimated completion time. This can be as simple as a progress table (`backfill_progress` with a last-processed-id checkpoint) that both resumes the backfill correctly if interrupted and gives an operator a concrete answer to "how far along is this" without guessing from database-level metrics alone.

**Replication lag monitoring**: a sustained batch write workload is exactly the kind of load that can cause read replicas to fall behind, since replicas apply the same write volume the primary just generated, sequentially. Actively watching replica lag (via the database's own replication status views, or infrastructure monitoring already in place) throughout the backfill — not just checking once at the start — catches a growing lag trend before it becomes a real problem for anything reading from those replicas.

**Database load and lock monitoring beyond just replication**: watching general database metrics during the backfill (CPU, I/O, active connections, lock wait times) catches problems replication lag alone might not surface — a backfill that's technically not causing replica lag yet but is meaningfully increasing query latency for other production traffic hitting the same primary is still a problem worth catching.

**Automatic backoff, not just alerting**: the most robust version of this doesn't just alert a human when replication lag crosses a threshold — it has the backfill script itself check current replication lag (or another load signal) before starting each batch, and pause automatically if the signal indicates the database is under strain, resuming once it recovers. This removes the dependency on a human noticing an alert and manually pausing the script in time, which is a real gap during off-hours or a busy on-call rotation.

**Batch size and pacing as tunable, not fixed**: treating batch size and the pause between batches as configurable (not hardcoded) means the same monitoring signals that trigger a pause can also inform a smaller batch size or longer pause going forward, without needing to stop and redeploy the script entirely — an operationally significant difference when a backfill is expected to run for hours.

## Key Takeaways

- Explicit progress tracking (a checkpoint table, batch/row counters) gives concrete visibility rather than treating the backfill as an opaque long-running process.
- Actively monitor replication lag throughout the backfill, not just once at the start, since sustained batch writes are a common cause of growing lag.
- Watch broader database load signals (CPU, I/O, lock waits) too, since a backfill can degrade production performance without necessarily causing measurable replication lag.
- Automatic pause/backoff tied to load signals is more robust than alert-and-hope-a-human-responds, especially for a long-running backfill spanning off-hours.

## Interview Follow-Up Questions

- How would you design the checkpoint table so the backfill can safely resume after an unexpected interruption without double-processing or skipping rows?
- What specific replication lag threshold would you choose as a pause trigger, and how would you justify that number?
- How would you communicate backfill progress to stakeholders who aren't going to check a dashboard themselves?

## References

- [PostgreSQL Docs: Monitoring Database Activity](https://www.postgresql.org/docs/current/monitoring.html)
- [PostgreSQL Docs: Streaming Replication — monitoring](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION-MONITORING)
