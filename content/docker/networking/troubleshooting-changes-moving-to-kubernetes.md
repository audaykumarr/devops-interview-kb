---
id: docker-networking-troubleshooting-moving-to-kubernetes-001
title: "How would container-to-container networking troubleshooting change once these containers move to Kubernetes, where networking works differently from plain Docker?"
category: docker
subcategory: networking
technologies:
  - docker
  - kubernetes
difficulty: intermediate
question_type:
  - comparison
tags:
  - docker
  - kubernetes
  - networking
estimated_time_minutes: 7
companies: []
related_questions:
  - docker-networking-inter-container-connectivity-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Troubleshooting container-to-container connectivity in plain Docker relies on Docker's own bridge networks and embedded DNS. How does that troubleshooting approach need to change once the same containers move to Kubernetes, where the networking model is meaningfully different?

## Short Answer

Kubernetes introduces a new unit of network identity (the Pod, not the individual container) and a different service-discovery mechanism (Kubernetes Services and cluster DNS, not Docker's embedded per-daemon DNS), so troubleshooting shifts from "check the Docker bridge network and container names" to "check Pod-to-Pod networking (often via a CNI plugin, not a simple bridge), Service objects and their endpoint selection, and cluster DNS (CoreDNS) resolution" — related concepts, but implemented by entirely different underlying mechanisms.

## Detailed Explanation

**Network identity shifts from container to Pod**: in Docker, each container has its own network namespace and IP. In Kubernetes, all containers within the same Pod *share* a single network namespace and IP — they communicate with each other via `localhost`, similar to processes on the same machine, not via container-to-container Docker networking at all. Troubleshooting "container A can't reach container B" first needs to establish whether A and B are in the same Pod (localhost communication, an entirely different failure mode — likely a port binding or process issue, not networking) or different Pods (genuine network traffic, subject to the mechanisms below).

**Pod-to-Pod networking is implemented by a CNI plugin, not a Docker bridge**: Kubernetes doesn't use Docker's bridge networking model at all for Pod-to-Pod traffic — a CNI (Container Network Interface) plugin (Calico, Cilium, AWS VPC CNI, etc.) implements the actual Pod networking, and different CNI plugins have different underlying mechanisms (overlay networks, direct VPC routing, eBPF-based dataplanes) with different troubleshooting tools and failure modes. "Check the Docker bridge" isn't a meaningful troubleshooting step in Kubernetes at all; instead, troubleshooting Pod-to-Pod connectivity often means checking the CNI plugin's own status/logs, NetworkPolicy objects that might be restricting traffic, and whether both Pods' nodes can actually route to each other.

**Service discovery shifts from Docker's embedded DNS to Kubernetes Services + CoreDNS**: Kubernetes' equivalent of "reach another container by name" is a Service object, which provides a stable virtual IP/DNS name in front of a dynamic set of Pod IPs (since Pods are ephemeral and get replaced with new IPs constantly, unlike a more stable container). Kubernetes cluster DNS (typically CoreDNS) resolves Service names (`my-service.my-namespace.svc.cluster.local`) to that Service's virtual IP, which then load-balances across the currently-healthy Pod endpoints backing it. Troubleshooting a failed name-based connection in Kubernetes means checking whether the Service object exists and has the expected selector, whether it has healthy Endpoints (Pods matching the selector and passing readiness checks), and whether CoreDNS itself is resolving correctly — a meaningfully different chain than Docker's simpler "embedded resolver looks up the container name directly" model.

**Published/host ports become a different concept entirely**: Docker's host-port-publishing model doesn't directly carry over — Kubernetes has its own set of related-but-distinct concepts (`NodePort`, `LoadBalancer`, `Ingress`) for exposing a Service outside the cluster, each with its own mechanics and troubleshooting approach, rather than a single `-p` flag equivalent.

## Key Takeaways

- Kubernetes' network identity unit is the Pod (shared namespace across its containers), not the individual container — containers in the same Pod talk via localhost, a different failure mode from cross-Pod networking.
- Pod-to-Pod networking is implemented by a CNI plugin, not Docker's bridge model — troubleshooting tools and failure modes depend on which CNI plugin is in use.
- Service discovery moves from Docker's embedded per-daemon DNS to Kubernetes Services (stable virtual IP over dynamic Pod endpoints) plus cluster DNS (CoreDNS).
- Exposing traffic outside the cluster uses a different concept set entirely (NodePort/LoadBalancer/Ingress) rather than Docker's simple host-port-publish model.

## Interview Follow-Up Questions

- How would you troubleshoot a NetworkPolicy that's unexpectedly blocking Pod-to-Pod traffic that used to work fine in plain Docker?
- What tools would you use to verify a CNI plugin is functioning correctly versus a Service/Endpoints misconfiguration?
- How would you debug CoreDNS itself if Service name resolution is failing cluster-wide, not just for one specific Service?

## References

- [Kubernetes Docs: Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Kubernetes Docs: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes Docs: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
