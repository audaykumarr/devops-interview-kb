---
id: cloud-architecture-disaster-recovery-active-active-data-layer-001
title: "How would you design the data layer differently for an active-active multi-region architecture versus an active-passive (failover) one?"
category: cloud-architecture
subcategory: disaster-recovery
technologies:
  - aws
difficulty: expert
question_type:
  - architecture
  - comparison
tags:
  - multi-region
  - active-active
  - disaster-recovery
  - cloud-architecture
estimated_time_minutes: 10
companies: []
related_questions:
  - cloud-architecture-multi-az-vs-multi-region-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You're designing the data layer for a multi-region system. How would the design differ between an active-passive (failover) architecture and an active-active one, specifically in how each handles writes and replication?

## Short Answer

Active-passive keeps writes flowing to a single primary region, with the standby region(s) receiving asynchronous replication and doing nothing else until a failover promotes them — simple to reason about, but the standby capacity sits mostly idle and failover has real cutover time. Active-active accepts writes in multiple regions simultaneously, which is far more available and gives every region something useful to do, but it forces you to solve write conflicts — either by partitioning which data each region owns, or by adopting a data store and conflict-resolution strategy built for multi-writer replication — which is a substantially harder engineering problem than active-passive's single-writer simplicity.

## Detailed Explanation

The core difference comes down to how many regions are allowed to accept writes at once, and everything else — replication topology, conflict handling, failover behavior — follows from that one choice.

## Requirements

- Writes must be durable and eventually consistent across regions.
- The system must define an explicit answer to "what happens when the same record is written in two regions before replication catches up."
- Failover/recovery behavior must be well-defined and testable, not just assumed.

## Architecture

**Active-passive**: one region is the single source of truth for writes at any given time. The database (or equivalent) replicates asynchronously to one or more standby regions, which serve read replicas at most, never accepting direct writes. Because there's only ever one writer, there's no conflict-resolution problem to solve — replication is a straightforward one-directional stream, and standby regions are simply "behind" by some replication lag. Failover means detecting the primary is unhealthy, promoting a standby to primary, and redirecting traffic — a well-understood, if not instantaneous, process.

**Active-active**: multiple regions accept writes concurrently, and each region's writes need to eventually reach every other region. This requires one of two fundamentally different strategies. The first is **data partitioning**: give each region exclusive ownership of a data subset (e.g. shard users by region based on where their account was created), so within that subset there's still effectively only one active writer — this sidesteps conflicts entirely but requires the access pattern to actually align with a partitioning scheme, and cross-partition operations become genuinely harder. The second is **true multi-writer replication with conflict resolution**: use a data store designed for it (e.g. a CRDT-based store, or a database with built-in multi-region conflict resolution like last-write-wins or custom merge logic), accepting that the system needs an explicit, tested answer for "what happens when the same key is written in two regions within the same replication window" — last-write-wins is simple but can silently discard a legitimate concurrent write; application-level merge logic is more correct but adds real complexity to every write path touching contested data.

## Trade-offs

Active-passive: simpler to build, reason about, and test — but standby region capacity is mostly wasted (paying for infrastructure that does nothing until a failover), and failover has real cutover time (DNS/routing changes, promotion, validation) during which the system may be degraded or unavailable.

Active-active: significantly higher availability (every region does useful work, and losing one region doesn't require an active failover event, just routing around it) — but the conflict-resolution problem is a genuine, ongoing engineering cost, not a one-time design decision; it touches schema design, application logic, and testing for the life of the system, and partitioning-based approaches constrain what access patterns are efficient.

The practical decision: active-passive is the right default for most systems, since the operational simplicity is worth more than the idle standby capacity for the vast majority of workloads. Active-active is justified specifically when the availability improvement is worth taking on the conflict-resolution engineering cost — commonly for systems with strict global latency requirements (serving writes from the nearest region) or where even brief failover downtime is unacceptable.

## Key Takeaways

- Active-passive has a single writer at a time, making replication and failover conceptually simple at the cost of idle standby capacity and real cutover time.
- Active-active accepts concurrent writes across regions, which forces an explicit conflict-resolution strategy — either data partitioning or multi-writer-aware data stores with merge logic.
- Conflict resolution in active-active isn't a one-time decision; it's an ongoing cost that touches schema and application design throughout the system's life.
- Active-passive is the reasonable default; active-active is justified when the availability/latency gain is worth the added engineering complexity.

## Interview Follow-Up Questions

- How would last-write-wins conflict resolution silently cause a real bug, and how would you detect that it happened?
- What does a data-partitioning approach to active-active do to a feature that legitimately needs to query across all regions' data?
- How would you test an active-active system's conflict resolution logic before it's needed in production?

## References

- [AWS: Multi-Region Application Architecture](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS: Amazon DynamoDB Global Tables (multi-region active-active)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html)
