---
id: networking-load-balancing-sticky-sessions-tradeoffs-001
title: "An application currently relies on sticky sessions (a user's requests always route to the same backend) to work correctly. Why is this considered an anti-pattern, and how would you actually remove the dependency?"
category: networking
subcategory: load-balancing
technologies:
  - networking
difficulty: intermediate
question_type:
  - architecture
tags:
  - networking
  - load-balancing
  - sticky-sessions
  - scalability
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An application currently depends on sticky sessions — the load balancer routes a given user's requests to the same backend server every time, based on a session cookie — because the application stores session state in that server's local memory. Why is this widely considered an anti-pattern, and how would you actually remove the dependency?

## Short Answer

Sticky sessions undermine the core value of horizontal scaling and load balancing: they concentrate a given user's load onto one specific server for the duration of their session, prevent clean rolling deployments (that server can't be safely drained without disrupting active sessions), and turn any single backend failure into a session loss for every user pinned to it. The fix is moving session state out of individual server memory into a shared, external store (Redis, a database, or a signed client-side token), so any backend can handle any request statelessly.

## Detailed Explanation

Sticky sessions exist to work around a specific architectural gap — session state living only in one server's local process memory — and the anti-pattern label reflects that they're treating a symptom (needing to route consistently) rather than the actual problem (state that shouldn't have been server-local in the first place).

## Requirements

- Any backend server should be able to handle any request for any user, without needing session affinity.
- Session state must survive a specific backend server being restarted, scaled down, or failing.
- The migration should be achievable incrementally, without requiring a risky simultaneous cutover of the entire application.

## Architecture

**Externalize session state to a shared store**: moving session data (login state, cart contents, whatever the application currently keeps in server memory) to a shared, fast external store like Redis means any backend can read and write the same session data — this is the structural fix, directly removing the reason sticky sessions were needed in the first place.

**Alternatively, move session state to the client via signed tokens**: for session data that doesn't need to be server-side at all (or can be safely represented as a signed/encrypted JWT the client holds and sends with each request), eliminating server-side session storage entirely removes the stickiness dependency without even needing a shared external store — appropriate when the session data is small and doesn't need server-side revocation/mutation beyond what a token refresh can handle.

**Migrate incrementally, verifying behavior under real load balancing before removing stickiness**: introduce the shared session store while sticky sessions are still active (so nothing breaks yet), verify session reads/writes are working correctly against the shared store, then remove the sticky session configuration and confirm the application behaves correctly when requests for the same user genuinely land on different backends — testing this deliberately (not just hoping) is important, since a subtle remaining assumption of local state can otherwise surface as a hard-to-reproduce bug only under real traffic distribution.

**Removing stickiness unlocks real operational benefits beyond just "cleaner architecture"**: rolling deployments become genuinely safe (draining a backend doesn't strand active sessions), load distributes evenly across all backends rather than being skewed by whichever users happen to be pinned where, and a single backend failure only affects whatever requests were in-flight to it, not every user's entire session.

## Trade-offs

Moving to a shared external session store introduces a new dependency (the store's own availability and latency now directly affect every request needing session data) and some added latency per request compared to reading from local process memory — a real cost, generally well worth the scalability and resilience benefits, but worth being deliberate about (the shared store itself now needs to be highly available, since it becomes critical infrastructure for every backend).

## Key Takeaways

- Sticky sessions are a workaround for server-local session state, not a good load-balancing pattern in their own right — the actual fix is externalizing that state.
- Moving session state to a shared store (Redis) or eliminating server-side session storage entirely (client-held signed tokens) both remove the stickiness dependency.
- Migrate incrementally: introduce the shared store first, verify it works, then remove stickiness and confirm behavior under genuinely distributed request routing.
- Removing stickiness unlocks safe rolling deployments, even load distribution, and smaller failure blast radius — real operational benefits beyond architectural cleanliness.

## Interview Follow-Up Questions

- How would you handle session data that's genuinely too large or too frequently mutated to comfortably fit in a signed client-side token?
- What would you monitor to confirm the shared session store isn't becoming a new bottleneck or single point of failure after the migration?
- How would you test that the application truly has no remaining server-local session assumptions before fully removing sticky session configuration in production?

## References

- [AWS: Sticky sessions for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/sticky-sessions.html)
- [Redis: Session Store Patterns](https://redis.io/docs/latest/develop/use/patterns/)
