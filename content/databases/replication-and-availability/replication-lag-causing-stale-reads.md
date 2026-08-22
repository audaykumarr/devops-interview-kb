---
id: databases-replication-availability-lag-stale-reads-001
title: "A user updates their profile, immediately reloads the page, and sees their old data — but only sometimes. What's causing this, and how do you fix it?"
category: databases
subcategory: replication-and-availability
technologies:
  - databases
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - databases
  - replication
  - consistency
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A user updates their profile, immediately reloads the page, and occasionally sees their old, pre-update data — but only sometimes, not consistently. What's causing this, and how do you fix it?

## Short Answer

This is a classic replication lag symptom: the write went to the primary database, but the immediate follow-up read got routed to a read replica that hasn't yet applied that write — the replica is milliseconds to seconds behind, and the user's reload happened to land in that window. Fix by routing reads that must reflect a user's own just-completed write back to the primary (or a replica confirmed to be caught up), rather than routing every read to whichever replica the load balancer picks.

## Detailed Explanation

Read replicas exist specifically to scale read throughput by distributing read traffic away from the primary, but they achieve this by asynchronously applying the primary's writes after the fact — there's inherently some delay (replication lag) between a write completing on the primary and that same write being visible on a given replica. Most of the time this lag is small enough to be invisible, but it becomes a visible, confusing bug exactly in the "user writes, then immediately reads their own write" pattern, since that's the scenario most likely to actually land within the lag window.

## Symptoms

- A user's own recent write appears to be "lost" or reverted when they immediately reload or re-fetch the data, but the write reappears correctly on a later reload.
- The issue is intermittent, not consistently reproducible — it depends on timing and which replica a given read happens to be routed to.
- Other users viewing the same data (not the one who just wrote it) don't typically report the issue, since they're less likely to read within the specific lag window right after the write.

## Possible Causes

- Reads are routed to read replicas by a general load-balancing rule (round-robin, least-connections) with no awareness of whether a given read needs to reflect a very recent write.
- A specific replica is lagging more than usual due to its own resource constraints (CPU, I/O) or a large, slow-to-replicate transaction on the primary.
- The application has no concept of "read-your-writes" consistency requirements, treating all reads identically regardless of whether they follow the current user's own recent write.

## Investigation Steps

1. Confirm the pattern correlates with reads shortly after the same user's own write, rather than being random data corruption or a caching issue — this distinguishes a replication-lag explanation from other possible causes.
2. Check actual replication lag metrics for your read replicas during the relevant time windows, to confirm lag was non-trivial (even a few hundred milliseconds can be enough to reproduce this with fast page reloads).
3. Check whether the read that returned stale data was actually routed to a replica (via connection routing logs, or by testing directly against a specific replica), confirming the read-routing hypothesis rather than assuming it.
4. Identify whether a specific replica lags more consistently than others, which would point to a resource or configuration issue on that specific replica rather than general replication lag being inherently the cause.

## Resolution

1. **Route "read-your-own-write" reads back to the primary** (or a replica specifically confirmed to have applied the write) for the specific requests where this matters — typically, any read immediately following a write in the same user session/request flow, rather than routing every read uniformly to replicas.
2. **Consider session-level read consistency**: some setups pin a user's reads to the primary (or a specific consistent replica) for a short window after they write, then fall back to normal replica-routed reads afterward — balancing consistency for the immediately-relevant case against not overloading the primary with all read traffic.
3. **Investigate and fix any replica with abnormally high lag** if that was contributing, addressing the resource constraint or slow-transaction pattern causing it.
4. **If eventual consistency is acceptable for this specific use case**, consider whether the actual fix is setting correct user expectations (e.g., an optimistic UI update showing the new value immediately, rather than re-fetching and risking a stale read) instead of architecting around strict consistency.

## Prevention

- Design read/write routing with explicit awareness of which reads need strong (read-your-own-write) consistency versus which can tolerate eventual consistency from a replica.
- Monitor replication lag as a first-class metric with alerting, so a replica falling meaningfully behind is caught proactively rather than discovered via user-reported bugs.
- Consider optimistic UI updates for user-facing write confirmations, reducing reliance on an immediate re-read to reflect what the user just did.

## Key Takeaways

- "My own recent write disappeared, but only sometimes" is a classic replication lag symptom, caused by reads landing on a replica that hasn't yet applied the write.
- Fix by routing reads that need to reflect a user's own just-completed write back to the primary or a confirmed-caught-up replica, not by trying to eliminate replication lag entirely.
- Not all reads need this treatment — apply read-your-own-write routing specifically where it matters, to avoid overloading the primary with all read traffic.
- Monitor replication lag as a first-class metric, since abnormal lag on a specific replica is itself worth catching and fixing independently of this particular symptom.

## Interview Follow-Up Questions

- How would you design this for a system with many read replicas across multiple regions, where routing back to the primary might mean much higher latency?
- What's the trade-off of using synchronous replication to eliminate this lag entirely, versus the read-routing approach?
- How would you communicate acceptable consistency guarantees to frontend engineers building features that depend on this data?

## References

- [PostgreSQL Docs: Streaming Replication](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION)
- [AWS: Replication lag for Amazon RDS Read Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
