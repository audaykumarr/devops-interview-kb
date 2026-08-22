---
id: databases-replication-availability-split-brain-001
title: "During a network partition, both your old primary and a newly promoted replica briefly accept writes at the same time. How does automatic failover cause this, and how do you design against it?"
category: databases
subcategory: replication-and-availability
technologies:
  - databases
difficulty: expert
question_type:
  - architecture
tags:
  - databases
  - failover
  - split-brain
  - high-availability
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

During a network partition, your automatic failover system decides the primary database is unreachable and promotes a replica to take over. But the original primary wasn't actually dead — it was just cut off from the failover system by the network partition, and it's still accepting writes from clients that can still reach it. For a brief window, both databases think they're the primary and accept writes. How does automatic failover cause this "split-brain" scenario, and how do you design against it?

## Short Answer

Split-brain happens because "unreachable to the failover system" and "actually down" are different conditions that automatic failover can't always distinguish during a network partition — the fix is fencing: ensuring the old primary is actually prevented from accepting writes (not just presumed dead) before or as part of promoting a new one, typically via STONITH ("shoot the other node in the head") mechanisms, quorum-based decision-making, or a fencing token the storage layer itself enforces.

## Detailed Explanation

The fundamental problem is that a failover system observing "I can't reach the primary" cannot, from that observation alone, distinguish between "the primary is actually down" and "there's a network partition between me and the primary, and the primary is fine and still reachable by clients on the other side of the partition" — both look identical from the failover system's vantage point, but they call for very different responses, and assuming the former when it's actually the latter is exactly what causes split-brain.

## Requirements

- A failover decision must not result in two nodes simultaneously believing they're the primary and accepting writes.
- The system must still be able to fail over during a genuine primary outage, not sacrifice availability entirely to avoid split-brain.
- The fencing/prevention mechanism must be reliable even during the exact network conditions (partition) that triggered the failover decision in the first place.

## Architecture

**Fencing (STONITH) ensures the old primary can't accept writes, rather than assuming it's dead**: before or as part of promoting a new primary, the failover system takes an action that actually prevents the old primary from continuing to serve writes — this could be power-cycling the old primary's host, revoking its network access, or forcibly closing its connections at the storage/network layer — rather than just assuming "I couldn't reach it, so it must not be serving writes anymore," which is precisely the unsafe assumption that causes split-brain.

**Quorum-based decision-making reduces false-positive failover triggers**: requiring agreement from a majority of nodes (not just one observer) before declaring the primary down and triggering failover means a single node's network partition (which might only affect that one node's connectivity, not a genuine primary outage) is less likely to trigger an unnecessary, unsafe failover — this is the same underlying principle as consensus protocols like Raft or Paxos, applied to failover decision-making specifically.

**A fencing token enforced at the storage layer provides a stronger guarantee than trusting the failover system's own actions**: rather than relying entirely on the failover system successfully fencing the old primary, some systems use a monotonically increasing fencing token that the storage/write layer itself checks — a write from a node with an outdated token is rejected by the storage layer regardless of what the node itself believes about its own primary status, providing a safety net even if the fencing action itself was incomplete or failed.

**Design for "fail safe toward unavailability, not toward inconsistency"**: when the failover system genuinely can't confirm the old primary is fenced (e.g., the fencing action itself failed or is unconfirmed), the safer default is refusing to promote a new primary and accepting a period of unavailability, rather than promoting anyway and risking split-brain — data inconsistency from split-brain is typically much harder to repair after the fact than an availability gap is to simply wait out.

## Trade-offs

Fencing mechanisms add real complexity and, if the fencing action itself is slow or unreliable, can increase the time-to-recovery during a genuine primary outage — there's a real tension between failing over fast (minimizing downtime) and failing over safely (guaranteeing fencing completed first). Quorum-based approaches require enough nodes to actually achieve quorum during a partition, which itself has failure modes (a partition that splits your cluster roughly in half, with neither side reaching quorum) worth designing around explicitly.

## Key Takeaways

- Split-brain happens because "unreachable" and "actually down" are indistinguishable from the failover system's perspective during a network partition — assuming the latter when it's actually the former is the root cause.
- Fencing (STONITH) actively prevents the old primary from continuing to accept writes, rather than passively assuming it's no longer doing so.
- Quorum-based failover decisions reduce false-positive triggers from a single node's isolated network issue.
- When fencing can't be confirmed, fail toward unavailability rather than risking inconsistency — split-brain data conflicts are typically much harder to repair than downtime is to simply wait out.

## Interview Follow-Up Questions

- How would you design fencing for a cloud environment where you don't have direct physical power control over the database hosts?
- What would you do if a network partition splits your cluster in a way where neither side can achieve quorum?
- How would you detect and repair data written during a split-brain window that occurred despite your safeguards?

## References

- [PostgreSQL Docs: High Availability, Load Balancing, and Replication](https://www.postgresql.org/docs/current/high-availability.html)
- [Martin Kleppmann: How to do distributed locking (fencing tokens)](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
