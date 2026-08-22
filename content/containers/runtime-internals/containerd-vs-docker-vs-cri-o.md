---
id: containers-runtime-internals-containerd-vs-docker-vs-crio-001
title: "Kubernetes dropped direct Docker support years ago in favor of containerd/CRI-O. What's the actual relationship between Docker, containerd, and CRI-O, and why did this change happen?"
category: containers
subcategory: runtime-internals
technologies:
  - containers
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - containers
  - containerd
  - docker
  - runtime
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Kubernetes deprecated and eventually removed direct "dockershim" support, requiring a CRI-compliant runtime like containerd or CRI-O instead. What's the actual relationship between Docker, containerd, and CRI-O, and why did this change happen?

## Short Answer

Docker is actually a layered product built on top of containerd — containerd is the lower-level container runtime doing the actual work of pulling images and running containers, while Docker adds a daemon, CLI, build tooling, and networking on top of it. Kubernetes doesn't need Docker's higher-level tooling at all — it just needs something that can run containers via a standard interface (the Container Runtime Interface, CRI) — so removing the Docker-specific shim and talking directly to containerd (or another CRI-compliant runtime like CRI-O) removed an unnecessary compatibility layer, not "removed Docker" in the sense of containers no longer working.

## Detailed Explanation

The relationship between these components is a common source of confusion, largely because Docker (as a product) bundles several distinct pieces that most users interact with as one thing, when they're actually separable layers with different responsibilities.

**containerd is the actual container runtime doing the core work**: pulling images from a registry, managing the container lifecycle (create, start, stop), and managing storage/networking primitives at a low level — it implements the Container Runtime Interface (CRI), the standard Kubernetes uses to talk to any compliant container runtime, without needing anything Docker-specific.

**Docker is a higher-level product built on top of containerd**: the `docker` CLI, the Docker daemon, image building (`docker build`), and Docker's own networking abstractions are all layered on top of containerd, which Docker itself uses internally to actually run containers — Docker's value-add is the developer-friendly tooling and workflow around container management, not the low-level container execution itself, which it delegates to containerd underneath.

**Kubernetes originally talked to Docker directly via "dockershim"**: since Docker predates the CRI standard, Kubernetes originally included a Docker-specific compatibility shim translating Kubernetes' internal calls into Docker API calls — this worked, but meant Kubernetes had to maintain Docker-specific integration code, and every layer of Docker's own tooling (much of which Kubernetes never actually used) sat between Kubernetes and the actual container execution containerd was already doing underneath.

**Removing dockershim and talking directly to containerd (or CRI-O) cuts out the unnecessary middle layer**: since containerd already implements CRI directly (and CRI-O was purpose-built specifically as a lightweight, Kubernetes-focused CRI implementation), Kubernetes can talk to either directly without needing Docker's higher-level daemon and tooling at all — this is a simplification removing redundant layers, not a removal of "container support," since the same underlying container execution (which was containerd all along, even when using Docker) continues working exactly as before.

**The practical impact for most Kubernetes users was minimal**: images built with `docker build` remain fully compatible (both Docker and containerd work with the same OCI image format), and workloads running in Kubernetes pods aren't affected by which CRI-compliant runtime the cluster uses underneath — the change mainly affected node-level tooling (you couldn't use the `docker` CLI directly on a node to interact with Kubernetes-managed containers anymore, needing `crictl` or similar instead) and cluster operators, not application developers' day-to-day workflow.

**CRI-O is a separate, purpose-built alternative to containerd**: rather than being Docker's underlying runtime repurposed for Kubernetes, CRI-O was built from the ground up specifically as a minimal CRI implementation with no ambitions beyond serving Kubernetes' needs — both containerd and CRI-O are valid, widely-used choices, differing mainly in project history and scope rather than a fundamental capability gap.

## Key Takeaways

- containerd is the actual low-level container runtime; Docker is a higher-level product built on top of it, adding developer tooling that Kubernetes never actually needed.
- Kubernetes' removal of "Docker support" (dockershim) removed an unnecessary Docker-specific compatibility layer, not container support itself — the same containerd underneath continues doing the actual work.
- Images built with `docker build` remain fully compatible with containerd/CRI-O, since both work with the standard OCI image format.
- CRI-O is a separate, purpose-built CRI implementation (not a repurposed piece of Docker), offering another valid choice alongside containerd.

## Interview Follow-Up Questions

- How would you troubleshoot a container on a Kubernetes node when the `docker` CLI is no longer available, using `crictl` instead?
- What functionality, if any, do application developers lose by a cluster using containerd/CRI-O instead of Docker underneath?
- How does the OCI (Open Container Initiative) image and runtime specification relate to this ecosystem, and why does it matter for compatibility across these tools?

## References

- [Kubernetes: Dockershim removal FAQ](https://kubernetes.io/blog/2022/02/17/dockershim-faq/)
- [containerd](https://containerd.io/)
- [CRI-O](https://cri-o.io/)
