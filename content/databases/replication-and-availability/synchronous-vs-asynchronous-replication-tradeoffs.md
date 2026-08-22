---
id: databases-replication-availability-sync-vs-async-001
title: "What's the actual trade-off between synchronous and asynchronous database replication, and how would you decide which to use for a payments system versus an analytics dashboard?"
category: databases
subcategory: replication-and-availability
technologies:
  - databases
difficulty: advanced
question_type:
  - comparison
tags:
  - databases
  - replication
  - consistency
  - availability
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Synchronous replication waits for a replica to confirm a write before acknowledging it to the client; asynchronous replication acknowledges immediately and replicates in the background. What's the actual trade-off, and how would you decide which to use for a payments system versus an analytics dashboard?

## Short Answer

Synchronous replication guarantees a write is durable on at least one replica before the client is told it succeeded — no data loss on primary failure, at the direct cost of higher write latency (every write waits on a network round-trip to the replica) and reduced availability (if the replica is unreachable, writes can stall or fail, depending on configuration). Asynchronous replication acknowledges writes immediately for low latency and high availability, but risks losing the most recent writes if the primary fails before they've replicated. A payments system should lean synchronous (or a hybrid) because losing a confirmed transaction is unacceptable; an analytics dashboard can comfortably use asynchronous replication, since losing a few seconds of the most recent data on a rare failure is a non-event.

## Detailed Explanation

This is fundamentally a durability-versus-latency-and-availability trade-off, and the right choice depends entirely on what a given write actually represents and what happens if it's lost.

**Synchronous replication ties write acknowledgment to replica confirmation**: the primary doesn't tell the client "write succeeded" until at least one replica has also durably received it — this means if the primary fails immediately after acknowledging a write, that write is guaranteed to exist on the replica too, so promoting the replica to primary loses nothing. The cost is real: every write now includes a network round-trip to the replica in its latency, and if the replica becomes unreachable, the system either has to stall writes (protecting durability, sacrificing availability) or fall back to asynchronous mode temporarily (sacrificing the durability guarantee to keep accepting writes) — a real operational decision with no free option.

**Asynchronous replication acknowledges immediately, replicating in the background**: writes are fast (no waiting on replica confirmation) and the primary keeps accepting writes even if a replica is temporarily unreachable, but if the primary fails before a recently-acknowledged write has replicated, that write is genuinely lost when a replica is promoted — the client was told it succeeded, but it's gone.

**For a payments system, losing a confirmed transaction is close to the worst possible failure mode**: a customer was told their payment succeeded, and if that specific write is lost on a primary failure, you now have a genuinely inconsistent state (a charge that may have happened on the payment processor's side, but no record of it, or an accounting error) — this is exactly the scenario synchronous replication (or synchronous replication to at least one replica, in a "semi-synchronous" configuration many systems support) is designed to prevent, and the added write latency is usually an acceptable cost given what's at stake.

**For an analytics dashboard, losing the most recent few seconds of writes on a rare primary failure is a minor, recoverable inconvenience**: the data is often re-derivable or simply slightly stale until the next update cycle, and the value of low write latency and high write availability (not stalling on replica confirmation) clearly outweighs the durability guarantee that synchronous replication would provide, since the cost of occasionally losing this specific data is genuinely low.

**Many real systems use a hybrid**: semi-synchronous replication (waiting for confirmation from at least one, but not all, replicas) or applying synchronous replication only to specific, high-value write paths (payment confirmations) while using asynchronous replication for the bulk of less-critical writes — matching the replication strategy to the actual value and recoverability of what's being written, rather than a single uniform choice for the entire system.

## Key Takeaways

- Synchronous replication guarantees durability (no data loss on primary failure) at the cost of write latency and potential availability impact if a replica is unreachable.
- Asynchronous replication optimizes for low latency and availability, at the cost of potentially losing the most recent writes on primary failure.
- Match the replication strategy to what's actually being written — payments and other high-value, non-recoverable writes justify synchronous replication's cost; recoverable or low-value data (analytics) doesn't need it.
- Hybrid approaches (semi-synchronous, or synchronous only for specific critical write paths) let you apply the right trade-off per data type rather than a single system-wide choice.

## Interview Follow-Up Questions

- How would you handle the availability trade-off when a synchronous replica becomes unreachable — stall writes, or temporarily fall back to asynchronous?
- How would you measure the actual added write latency synchronous replication introduces for your specific network topology, before committing to it?
- How would you design a system that applies synchronous replication only to specific critical operations while keeping the rest asynchronous?

## References

- [PostgreSQL Docs: Synchronous Replication](https://www.postgresql.org/docs/current/warm-standby.html#SYNCHRONOUS-REPLICATION)
- [MySQL Docs: Semisynchronous Replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html)
