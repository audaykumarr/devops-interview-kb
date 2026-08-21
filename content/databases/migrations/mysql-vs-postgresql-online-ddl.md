---
id: databases-migrations-mysql-vs-postgresql-online-ddl-001
title: "How would the safe-migration approach for adding a NOT NULL column to a large table differ on MySQL versus PostgreSQL, given their different online-DDL capabilities?"
category: databases
subcategory: migrations
technologies:
  - mysql
  - postgresql
difficulty: advanced
question_type:
  - comparison
  - conceptual
tags:
  - databases
  - migrations
  - mysql
  - postgresql
estimated_time_minutes: 8
companies: []
related_questions:
  - databases-migrations-not-null-column-large-table-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The safe pattern for adding a `NOT NULL` column to a large table (nullable column first, batch backfill, `NOT VALID` constraint, then validate) is fairly PostgreSQL-specific in its mechanics. How would the equivalent approach look on MySQL, given its different online-DDL capabilities?

## Short Answer

PostgreSQL's approach relies on `NOT VALID` constraints to separate "enforce going forward" from "validate existing rows" as two distinct low-lock steps — a mechanism MySQL doesn't have an exact equivalent for. MySQL/InnoDB instead has broader built-in **online DDL** support for many `ALTER TABLE` operations (including certain column additions), performing the operation with a much shorter metadata-only lock via `ALGORITHM=INSTANT` or `ALGORITHM=INPLACE` where supported, but adding a `NOT NULL` column without a default still generally requires the same "nullable column first, backfill, then convert to NOT NULL" staged approach, since MySQL doesn't have a direct constraint-deferral mechanism split the way PostgreSQL's `NOT VALID` does.

## Detailed Explanation

**PostgreSQL's mechanism**, as covered in the base pattern: add the column nullable (fast, metadata-only), backfill in batches, add the `NOT NULL` constraint as `NOT VALID` (enforces immediately for new/changed rows, doesn't scan existing rows), then `VALIDATE CONSTRAINT` separately (scans existing rows under a `SHARE UPDATE EXCLUSIVE` lock, which permits concurrent reads/writes). This four-step split is specifically enabled by `NOT VALID` existing as a first-class constraint state in PostgreSQL.

**MySQL/InnoDB's mechanism** works differently at the storage-engine level. MySQL's online DDL framework (`ALGORITHM=INSTANT`, `INPLACE`, or the older `COPY`) determines, per operation type, how much locking and table rebuilding a given `ALTER TABLE` requires. Some operations (adding a nullable column with certain MySQL versions, since 8.0) can use `ALGORITHM=INSTANT` — a genuinely instant, metadata-only change with no table rebuild or extended lock at all, even faster than PostgreSQL's already-fast nullable-column-add in some cases. However, MySQL doesn't have a direct equivalent to `NOT VALID` — there's no "enforce a NOT NULL constraint for new writes without validating existing rows" split. Converting a column to `NOT NULL` in MySQL, particularly via `ALGORITHM=INPLACE` where supported, still needs to actually check that no existing row violates the new constraint, and depending on MySQL version and specific configuration, this can involve more locking than PostgreSQL's dedicated `VALIDATE CONSTRAINT` step.

The practical approach converges on the same shape regardless: add the column nullable first (fast on both), backfill existing rows in batches (identical pattern on both — small batches, brief pauses, avoiding one giant transaction), and then convert to `NOT NULL` — but the *locking characteristics* of that final conversion step differ by engine and version, making it worth explicitly checking the specific MySQL version's online DDL support table (`ALTER TABLE ... ALGORITHM=INPLACE, LOCK=NONE` where supported) rather than assuming PostgreSQL's `NOT VALID`-based low-lock guarantee carries over directly — on some MySQL versions/configurations, that final step still requires more caution (testing on a replica, running during a lower-traffic window) than PostgreSQL's dedicated mechanism provides.

## Key Takeaways

- PostgreSQL's `NOT VALID` constraint state is a specific mechanism for splitting "enforce going forward" from "validate existing rows" — MySQL has no direct equivalent.
- MySQL's online DDL framework (`ALGORITHM=INSTANT`/`INPLACE`) can make some operations, including certain nullable column additions, genuinely instant and metadata-only.
- The nullable-column-first, batch-backfill pattern is identical in shape on both engines; the final NOT NULL conversion's locking behavior is where they meaningfully differ.
- Always check the specific MySQL version's online DDL support table for the exact operation, rather than assuming PostgreSQL's low-lock guarantee for the final step carries over.

## Interview Follow-Up Questions

- How would you verify, before running it in production, which `ALGORITHM` MySQL will actually use for a specific `ALTER TABLE` statement?
- What's the risk of testing a migration's locking behavior only on a replica rather than against production-scale data and traffic?
- How does this comparison change for a cloud-managed database service (RDS, Cloud SQL) that might have its own online-DDL tooling on top of the base engine?

## References

- [MySQL: Online DDL for InnoDB Tables](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl.html)
- [PostgreSQL Docs: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
