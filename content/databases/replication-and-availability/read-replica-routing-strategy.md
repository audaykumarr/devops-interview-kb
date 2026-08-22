---
id: databases-replication-availability-read-replica-routing-001
title: "How would you design the actual mechanism that decides whether a given database query goes to the primary or a read replica, for an application that wasn't originally built with this split in mind?"
category: databases
subcategory: replication-and-availability
technologies:
  - databases
difficulty: advanced
question_type:
  - architecture
tags:
  - databases
  - read-replicas
  - scalability
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your application currently sends every query — reads and writes alike — to a single primary database, which is now becoming a bottleneck under read-heavy load. You've provisioned read replicas, but the application code has no existing concept of routing queries differently. How would you design the actual mechanism that decides whether a given query goes to the primary or a replica?

## Short Answer

The safest, lowest-risk default is routing based on query type detected at the data-access layer (SELECT statements go to a replica, everything else — INSERT/UPDATE/DELETE, and any read that must be strongly consistent — goes to the primary), implemented as a single, centralized routing layer (either in your ORM/data-access code or via a proxy like PgBouncer/ProxySQL configured for read/write splitting) rather than requiring every call site in the application to manually specify where to send each query.

## Detailed Explanation

The core design challenge is doing this safely without requiring every developer to correctly reason about consistency requirements at every individual call site — a centralized routing mechanism with a safe default, plus an explicit override for the specific cases that need it, is what actually makes this maintainable and avoids `the-one-place-someone-forgot` becoming a subtle production bug.

## Requirements

- Reads that don't require strict consistency should be routable to replicas, to actually relieve primary load.
- Writes must always go to the primary, since replicas are read-only by design in most replication topologies.
- Reads that need to reflect a very recent write (read-your-own-write scenarios) must have a way to be routed to the primary or a confirmed-caught-up replica, not just any replica.
- The routing decision shouldn't require every application call site to manually get this right — a default that's safe by construction is much more maintainable than relying on universal developer diligence.

## Architecture

**Centralize the routing decision in one place**: implement read/write splitting either in the data-access layer (many ORMs support this natively, or it can be added as a wrapper) or via a proxy sitting between the application and database (PgBouncer, ProxySQL, or a cloud-native read/write splitting proxy) — a single, centralized mechanism means the routing logic is defined and maintained once, rather than scattered across every place in the application code that issues a query.

**Default to safe, conservative routing, with explicit opt-in for replica reads**: a reasonable starting design routes everything to the primary by default (the current, known-safe behavior) and requires an explicit signal (a query hint, a specific method call, a session flag) to route a specific read to a replica — this means adopting read/replica routing is an incremental, deliberate migration per query/endpoint, rather than a risky wholesale behavior change applied everywhere at once.

**Provide an explicit mechanism for read-your-own-write consistency**: for the specific flows where a read must reflect the current user's own immediately-preceding write (see the related replication-lag question), the routing layer needs a way to force that specific read to the primary (or wait for replica catch-up) — typically implemented as a short-lived session-level override right after a write, rather than a global setting.

**Monitor replica lag as an input to the routing decision itself, not just an observability metric**: a more sophisticated version of this routing layer can check current replication lag and route around a replica that's fallen too far behind, rather than blindly trusting round-robin distribution across replicas regardless of their actual current state — this adds real complexity but meaningfully improves the consistency behavior actually experienced by users under real, variable replication lag conditions.

## Trade-offs

Centralizing routing in a proxy adds infrastructure and a new potential point of failure/latency (the proxy itself), while centralizing in the application's data-access layer avoids that extra hop but requires the routing logic to be correctly implemented and maintained within application code, potentially across multiple services if your architecture is distributed. Either approach requires real migration discipline — moving from "everything hits the primary" to "reads can go to replicas" incrementally, verifying correctness at each step, rather than flipping a global switch and hoping nothing depended on strong consistency somewhere unexpected.

## Key Takeaways

- Centralize read/write routing in one place (data-access layer or a proxy) rather than requiring every application call site to manually decide — this is what makes the system maintainable and avoids scattered, easy-to-miss mistakes.
- Default to the primary (safe, known behavior) and require explicit opt-in for replica routing, migrating incrementally rather than switching everything at once.
- Provide an explicit mechanism to force read-your-own-write consistency for the specific flows that need it, rather than a single global consistency setting.
- A more advanced routing layer can factor in actual current replication lag, avoiding a replica that's fallen too far behind rather than blindly trusting even distribution.

## Interview Follow-Up Questions

- How would you migrate an existing large application to this routing model incrementally, without a risky big-bang change?
- How would you test that a given endpoint's read doesn't actually require primary-level consistency before routing it to a replica?
- How would you handle a proxy-based routing layer becoming itself a bottleneck or single point of failure at very high query volume?

## References

- [PostgreSQL Docs: High Availability, Load Balancing, and Replication](https://www.postgresql.org/docs/current/high-availability.html)
- [ProxySQL: Read/Write Split](https://proxysql.com/documentation/)
