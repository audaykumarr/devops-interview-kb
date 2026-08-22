---
id: databases-replication-availability-connection-pool-exhaustion-001
title: "Under a traffic spike, your application starts throwing 'too many connections' errors from the database, even though the database itself isn't under heavy CPU or memory load. What's happening?"
category: databases
subcategory: replication-and-availability
technologies:
  - databases
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - databases
  - connection-pooling
  - scalability
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

During a traffic spike, your application starts throwing "too many connections" errors from the database. Oddly, the database server itself isn't under heavy CPU or memory load — it looks mostly idle. What's actually happening, and how do you fix it?

## Short Answer

Database connections are a genuinely finite resource, capped independently of CPU/memory headroom (each connection has a fixed maximum set on the database server, often surprisingly low for the traffic scale), and each application instance opening its own uncoordinated pool of connections can collectively exceed that cap during a traffic spike — especially if application instances are also autoscaling, since each new instance adds its own connection pool on top of existing ones. The fix is usually introducing (or properly sizing) a connection pooler between the application and database, so the database sees a small, bounded number of actual connections regardless of how many application instances or requests are active.

## Detailed Explanation

The confusion in this scenario comes from assuming database capacity is purely a function of CPU/memory — but `max_connections` (or the equivalent) is typically a separate, fixed configuration limit, and each open connection carries meaningful per-connection memory overhead on the database server regardless of whether it's actively doing work, which is exactly why database maintainers set a cap rather than allowing unlimited connections even when CPU/memory would technically allow more.

## Symptoms

- Applications receive "too many connections," "connection refused," or similar errors from the database during traffic spikes.
- The database server's own CPU and memory utilization remain moderate or low during the same period, ruling out a simple resource-exhaustion explanation.
- The problem correlates with either a traffic spike, an autoscaling event adding more application instances, or both happening together.

## Possible Causes

- Each application instance maintains its own connection pool sized for that instance's expected load, without any awareness of the database's total connection limit or how many other instances exist — the sum across all instances during a scale-out event can exceed the database's `max_connections`.
- The database's `max_connections` setting is configured conservatively (a common default, or set based on available memory rather than expected instance count) and was never revisited as the application's scale (number of instances) grew.
- No connection pooler sits between the application and database, meaning every application-level connection maps directly to a database-level connection, with no consolidation.
- Connections aren't being properly released back to the pool after use (a connection leak in application code), meaning the effective number of held connections grows faster than actual concurrent request load would explain.

## Investigation Steps

1. Check the database's current `max_connections` (or provider-equivalent) setting and compare it against the actual number of connections observed during the incident.
2. Count the total number of application instances active during the spike, multiplied by each instance's configured connection pool size, to see whether that total plausibly exceeds the database's connection limit.
3. Check whether connections are being properly released after use, or whether the active connection count grows disproportionately to actual concurrent request volume (a sign of a connection leak rather than purely a capacity issue).
4. Determine whether a connection pooler (PgBouncer, ProxySQL, or a cloud-native equivalent) already sits between the application and database, and if so, whether it's configured with an appropriate connection limit itself.

## Resolution

1. **Introduce or properly configure a connection pooler** (like PgBouncer for PostgreSQL) between the application and database — the pooler maintains a small, bounded pool of actual database connections and multiplexes many more application-level logical connections onto them, meaning the database sees a stable, capped connection count regardless of how many application instances scale up.
2. **Right-size each application instance's own connection pool** relative to the actual number of instances expected at peak scale, so the collective total (instances × per-instance pool size) stays comfortably under the database's actual connection limit, whether or not a pooler is also in place.
3. **Fix any identified connection leaks** in application code (connections not being released back to the pool after use), since this can exhaust available connections even without genuinely high concurrent load.
4. **Revisit `max_connections` itself** if it's genuinely too conservative for your actual scale — but be aware this isn't a free lever, since each additional connection the database allows for also consumes real server memory, so this needs to be balanced against the server's actual available resources, not just raised arbitrarily.

## Prevention

- Use a connection pooler as standard infrastructure for any application expected to scale to multiple instances, rather than adding it reactively after hitting this exact problem.
- Calculate and document the relationship between application instance count, per-instance pool size, and the database's connection limit, so autoscaling configuration changes are made with this constraint in mind.
- Monitor active database connection count as its own metric with alerting, so approaching the limit is caught proactively rather than discovered via user-facing errors.

## Key Takeaways

- Database connection limits are typically a separate, fixed cap independent of CPU/memory headroom — a database can look idle by those metrics while still being at its connection limit.
- Uncoordinated per-instance connection pools, especially combined with autoscaling, can collectively exceed the database's connection limit even though no single instance is misbehaving.
- A connection pooler between application and database is the standard fix, consolidating many logical connections onto a small, bounded number of actual database connections.
- Raising `max_connections` isn't a free fix — each additional allowed connection consumes real server memory, so it needs to be balanced against actual available resources.

## Interview Follow-Up Questions

- How would you size a connection pooler's own connection limit appropriately for your database's actual capacity?
- How would you detect a connection leak in application code before it causes a production incident?
- How does this problem and its fix change in a serverless or highly elastic compute environment where instance count can fluctuate very rapidly?

## References

- [PostgreSQL Docs: Connections and Authentication (max_connections)](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
