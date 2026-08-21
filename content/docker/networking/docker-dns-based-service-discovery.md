---
id: docker-networking-dns-service-discovery-001
title: "How does Docker's DNS-based service discovery actually work under the hood for containers on a user-defined network?"
category: docker
subcategory: networking
technologies:
  - docker
difficulty: intermediate
question_type:
  - conceptual
tags:
  - docker
  - networking
  - dns
estimated_time_minutes: 6
companies: []
related_questions:
  - docker-networking-inter-container-connectivity-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Containers on a Docker user-defined network can reach each other by container name, without any manual DNS configuration. How does that DNS-based service discovery actually work under the hood?

## Short Answer

Docker runs an embedded DNS server inside the Docker daemon (listening internally at `127.0.0.11` within each container's network namespace), and every container on a user-defined bridge network gets its `/etc/resolv.conf` automatically pointed at that internal DNS server; when a container looks up another container's name (or an alias), the embedded DNS server resolves it directly from Docker's own internal network state — the current IP address assigned to that container on that network — rather than through any conventional external DNS infrastructure.

## Detailed Explanation

When a container is created and attached to a **user-defined bridge network** (as opposed to the legacy default `bridge` network, which doesn't support this feature), Docker automatically configures that container's `/etc/resolv.conf` to point at `127.0.0.11` — a special internal address that Docker's embedded DNS resolver listens on within each container's own network namespace, not a shared external IP. This is why the resolver "just works" per-container without any explicit configuration: it's set up automatically as part of attaching to a user-defined network.

When application code inside a container does a DNS lookup for another container's name (e.g. `resolve('database')`), that query goes to `127.0.0.11`, and Docker's embedded resolver answers it directly from its own internal state — the current mapping of container names (and any network aliases) to their assigned IP addresses on that specific network — rather than forwarding the query to any external DNS infrastructure. This internal state updates dynamically as containers are created, removed, or restarted, which is exactly why container names keep resolving correctly even after a container restarts and gets a new IP address — the name-to-IP mapping is Docker's own live internal bookkeeping, not a static entry that could go stale.

Queries for names Docker's embedded resolver doesn't recognize (an external hostname, not a container on that network) get forwarded to whatever DNS servers are configured for the host (or explicitly set via Docker's `--dns` option), making the embedded resolver a genuine DNS server for the container — handling internal container-name resolution itself, forwarding everything else — rather than a separate, parallel mechanism only for container names.

This is also exactly why the legacy default `bridge` network doesn't support name-based resolution the same way: it predates this embedded-DNS feature and instead relied on manually-managed `/etc/hosts` entries via `--link`, a much more limited and largely deprecated mechanism — a common source of confusion when someone expects name resolution to "just work" on a container not attached to a user-defined network.

## Key Takeaways

- Docker's embedded DNS server listens at `127.0.0.11` inside each container's network namespace on a user-defined bridge network, automatically configured via `/etc/resolv.conf`.
- Container name lookups resolve directly from Docker's own live internal network state (current name-to-IP mappings), which is why resolution stays correct even after a container restarts with a new IP.
- Queries for names Docker doesn't recognize as containers on that network get forwarded to the host's configured DNS servers, making the embedded resolver a full DNS server, not a separate name-only mechanism.
- The legacy default `bridge` network doesn't support this — it predates the embedded DNS feature and relies on the older, largely-deprecated `--link` mechanism instead.

## Interview Follow-Up Questions

- How would you troubleshoot a container that can't resolve another container's name, given this internal DNS mechanism?
- What's the difference between a container's name and a network alias for DNS resolution purposes, and when would you use an alias explicitly?
- How does this embedded DNS mechanism change (or not) when using Docker Compose, which has its own network-naming conventions?

## References

- [Docker Docs: Networking overview — embedded DNS server](https://docs.docker.com/engine/network/#dns-services)
- [Docker Docs: Networking with standalone containers](https://docs.docker.com/engine/network/tutorials/standalone/)
