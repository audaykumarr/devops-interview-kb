---
id: docker-networking-inter-container-connectivity-001
title: "Two containers on the same Docker host can't talk to each other over the network, even though both are running. How would you debug the connection?"
category: docker
subcategory: networking
technologies:
  - docker
difficulty: beginner
question_type:
  - troubleshooting
tags:
  - docker
  - networking
  - containers
estimated_time_minutes: 8
companies: []
related_questions:
  - docker-images-multi-stage-optimization-001
  - docker-networking-dns-service-discovery-001
  - docker-networking-container-port-vs-published-port-001
  - docker-networking-troubleshooting-moving-to-kubernetes-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Two containers on the same Docker host are supposed to talk to each other — say, an API container calling a database container — but the connection fails, even though `docker ps` shows both running. How would you debug it?

## Short Answer

Check whether the two containers are actually on the same user-defined Docker network first — containers on the default bridge network can't resolve each other by container name, which is the single most common cause of this exact symptom. If they are on the same network, confirm the calling container is using the right hostname and port, and that the target process is actually listening on the container's network interface rather than only on `localhost`.

## Detailed Explanation

Docker's default bridge network (the one containers land on if you don't specify `--network`) doesn't provide automatic DNS-based service discovery between containers — you'd have to use legacy `--link` flags or hardcoded IPs, both fragile and effectively deprecated patterns. A user-defined bridge network (created with `docker network create`, or implicitly by Docker Compose) does provide automatic DNS resolution by container name, which is why "it works in my docker-compose setup but not when I run containers by hand" is such a common variant of this problem — Compose puts everything on a shared user-defined network by default, while manually-run containers often land on the default bridge unless you explicitly set `--network`.

If both containers genuinely are on the same user-defined network and DNS resolution isn't the problem, the next most common cause is the target application only binding to `127.0.0.1` inside its own container instead of `0.0.0.0` (or the container's actual interface) — a service bound to localhost only accepts connections from within its own container's network namespace, so it looks "up" from a health-check perspective but refuses connections from any other container on the network, including ones on the same Docker network. This is easy to miss because the application logs will show it "running" with no errors.

## Symptoms

- Connection refused, connection timeout, or DNS resolution failure ("could not resolve host") when one container tries to reach another by name.
- Both containers show as `Up` in `docker ps`.
- The same connection works fine if tested from the host machine directly against a published port.

## Possible Causes

- The two containers are on different networks (e.g. one on the default bridge, one on a user-defined network created separately), so they can't reach each other by name or, in some configurations, at all.
- The calling container is using the target's container name, but they're not on a network that provides DNS resolution for that name (default bridge network).
- The target application is bound to `127.0.0.1` inside its container instead of `0.0.0.0`, so it only accepts connections from its own network namespace.
- A typo or mismatch between the hostname used in application config and the actual container/service name.
- The target container's port isn't actually the port the application is listening on internally (confusing published/host ports with container-internal ports, which are a separate concept).

## Investigation Steps

1. `docker network ls` and `docker inspect <container>` (or `docker network inspect <network>`) to confirm both containers are attached to the same network.
2. From inside the calling container, attempt to resolve the target's hostname: `docker exec <container> getent hosts <target-name>` or a similar DNS check.
3. From inside the calling container, attempt a raw connection to the target's IP and port (not just hostname) to isolate DNS resolution from actual connectivity.
4. Check what the target application is actually bound to, either from its logs/config or by running `docker exec <target> netstat -tlnp` (or equivalent) to see the listening address.
5. Confirm the port used in the connection attempt matches the container-internal port the application listens on, not a host-published port (those are different unless explicitly mapped 1:1).

## Commands

```bash
docker network ls
docker inspect my-api-container --format '{{json .NetworkSettings.Networks}}'
docker network inspect my-network

docker exec my-api-container getent hosts my-db-container
docker exec my-api-container sh -c "nc -zv my-db-container 5432"

docker exec my-db-container netstat -tlnp
```

## Resolution

If the containers are on different networks, either move them onto the same user-defined network (`docker network connect my-network my-container`) or, more durably, define the network explicitly in your Compose file or run commands so this can't drift apart again. If the target is bound to `127.0.0.1` only, fix the application's bind address (or its container's startup config) to listen on `0.0.0.0` so it accepts connections from outside its own network namespace. If it's a hostname mismatch, correct the application configuration to use the actual container/service name as defined on the shared network.

## Prevention

- Always define networking explicitly (Docker Compose networks, or explicit `docker network create` plus `--network` flags) rather than relying on the default bridge network for anything beyond a single standalone container.
- Default application configuration to bind to `0.0.0.0` inside containers, reserving `127.0.0.1` binding for genuinely local-only tooling.
- Use Docker Compose (or equivalent) for local multi-container setups specifically because it removes the manual-network-wiring failure mode by default.
- Document the expected network topology for multi-container local setups so "which network is this container supposed to be on" isn't tribal knowledge.

## Interview Follow-Up Questions

- How does Docker's DNS-based service discovery actually work under the hood for containers on a user-defined network?
- What's the difference between a container's internal port and a host-published port, and how does that distinction cause confusion in debugging?
- How would this troubleshooting approach change once these containers move to Kubernetes, where networking works differently?

## Key Takeaways

- The default bridge network doesn't provide DNS-based container name resolution — that's a common source of "it works in Compose but not standalone."
- A service bound to `127.0.0.1` inside its container looks healthy but refuses connections from other containers.
- Distinguish DNS resolution failures from raw connectivity failures by testing both hostname resolution and direct IP connection separately.
- Container-internal ports and host-published ports are different concepts — confusing them is a common source of "wrong port" errors.

## References

- [Docker docs: Networking overview](https://docs.docker.com/engine/network/)
- [Docker docs: Networking with standalone containers](https://docs.docker.com/engine/network/tutorials/standalone/)
- [Docker docs: Compose networking](https://docs.docker.com/compose/how-tos/networking/)
