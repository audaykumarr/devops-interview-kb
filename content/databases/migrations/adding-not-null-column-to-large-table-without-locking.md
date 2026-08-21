---
id: databases-migrations-not-null-column-large-table-001
title: "How do you safely add a NOT NULL column to a large production table without locking it for the duration of a slow backfill?"
category: databases
subcategory: migrations
technologies:
  - postgresql
difficulty: advanced
question_type:
  - scenario
  - practical
tags:
  - databases
  - migrations
  - postgresql
  - production
estimated_time_minutes: 9
companies: []
related_questions:
  - databases-migrations-mysql-vs-postgresql-online-ddl-001
  - databases-migrations-monitoring-batched-backfill-001
  - databases-migrations-backfill-high-write-throughput-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You need to add a `NOT NULL` column to a table with hundreds of millions of rows in a production database that can't tolerate extended downtime. A naive `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT ...` would lock the table for the entire backfill. How do you do this safely?

## Short Answer

Split it into multiple small, individually-fast steps instead of one big blocking statement: add the column as nullable first (fast, metadata-only in modern Postgres), backfill existing rows in small batches to avoid long-running transactions and lock contention, then add the `NOT NULL` constraint as a separate step using `NOT VALID` + `VALIDATE CONSTRAINT` (Postgres) so the constraint is enforced for new writes immediately without a full-table validation scan blocking anything.

## Detailed Explanation

The naive single-statement approach fails for two separate reasons that are worth distinguishing. First, `ADD COLUMN ... NOT NULL DEFAULT <value>` historically required rewriting every row of the table to populate the default, which on a large table means holding an `ACCESS EXCLUSIVE` lock (blocking all reads and writes) for however long that rewrite takes — potentially minutes to hours depending on table size (modern Postgres, 11+, actually optimized the *constant-default* case to be metadata-only and fast, but this optimization doesn't apply to non-constant defaults or to a `NOT NULL` constraint requiring validation against existing data). Second, even if the column addition itself is fast, adding a `NOT NULL` constraint requires validating that every existing row satisfies it, which by default is a full table scan under a lock.

The safe pattern breaks this into independently fast, low-lock steps:

1. **Add the column as nullable, no default (or a genuinely constant default on modern Postgres)**: `ALTER TABLE t ADD COLUMN c integer;` — this is a fast metadata-only change with a brief lock, not a table rewrite.
2. **Backfill in batches**: update existing rows in small chunks (e.g. by primary key range, a few thousand rows per transaction) with a brief pause between batches, rather than one `UPDATE` touching every row in a single transaction — this avoids holding locks or generating a massive amount of write-ahead-log/replication traffic in one burst, and keeps any individual transaction short enough not to block other activity.
3. **Add the constraint as `NOT VALID` first**: `ALTER TABLE t ADD CONSTRAINT c_not_null CHECK (c IS NOT NULL) NOT VALID;` — this starts enforcing the constraint for all new/updated rows immediately, with only a brief lock, but does *not* validate it against existing rows yet.
4. **Validate separately**: `ALTER TABLE t VALIDATE CONSTRAINT c_not_null;` — this scans existing rows to confirm the constraint holds, but takes only a `SHARE UPDATE EXCLUSIVE` lock, which permits concurrent reads and writes (just not other schema changes), so it doesn't block normal application traffic the way the original single-statement approach would have.

The general principle behind all four steps: separate "make the schema change" from "validate/backfill existing data" into distinct operations, and prefer lock modes and batch sizes that coexist with live traffic over anything requiring an exclusive lock for an extended, data-size-dependent duration.

## Key Takeaways

- A single `ALTER TABLE ... ADD COLUMN ... NOT NULL` on a large table risks a long-held exclusive lock, blocking all reads and writes for the duration.
- Splitting into add-nullable-column, batch backfill, add-constraint-as-`NOT VALID`, then `VALIDATE CONSTRAINT` turns one risky operation into several fast, low-lock ones.
- `NOT VALID` constraints enforce immediately for new/changed rows while deferring the expensive existing-data validation to a separate, less-blocking step.
- Batch size and pacing during backfill matter as much as the schema mechanics — a single giant `UPDATE` reintroduces the same lock/traffic risk this pattern is meant to avoid.

## Interview Follow-Up Questions

- How would this approach differ on MySQL versus PostgreSQL, given they have different online-DDL capabilities?
- How would you monitor a batched backfill in production to know it's progressing safely and not falling behind or causing replication lag?
- What would you do differently if the table were actively receiving high write throughput during the migration window?

## References

- [PostgreSQL Docs: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Docs: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL Wiki: Don't Do This (ALTER TABLE caveats)](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
