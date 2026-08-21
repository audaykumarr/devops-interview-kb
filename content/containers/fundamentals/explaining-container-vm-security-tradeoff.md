---
id: containers-fundamentals-explaining-security-tradeoff-untrusted-code-001
title: "How would you explain the security trade-off between containers and VMs to someone deciding whether to run untrusted third-party code?"
category: containers
subcategory: fundamentals
technologies:
  - containers
difficulty: intermediate
question_type:
  - conceptual
  - scenario
tags:
  - containers
  - virtual-machines
  - security
estimated_time_minutes: 6
companies: []
related_questions:
  - containers-fundamentals-container-vs-vm-os-level-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A non-infrastructure stakeholder is deciding whether to run untrusted, third-party-submitted code — think a code-execution feature, a plugin system, or a CI runner for external contributors. How would you explain, without jargon overload, why containers alone might not be the right isolation boundary for this specific case?

## Short Answer

Containers share the host's kernel, so a security vulnerability in that shared kernel could potentially let code inside a container break out and affect the host or other containers — a risk that's usually acceptable for trusted, internal workloads but is a meaningfully bigger concern when the code inside the container is deliberately untrusted (someone else's, submitted specifically to be run on your infrastructure). For genuinely untrusted code, either a real VM boundary or a "sandboxed container" technology (gVisor, Kata Containers, Firecracker microVMs) that adds a stronger isolation layer specifically to address this gap is the safer choice.

## Detailed Explanation

The plain-language version of the trade-off: think of a VM as a separate, locked apartment — even if someone in one apartment causes trouble, the building's other apartments are behind their own separate walls and locks. A container is more like a room divider inside one shared apartment — it creates real, useful separation for everyday purposes, but if someone finds a way to get through a shared wall (the kernel), they're now in the same building as everyone else, not just their own room.

For code you trust — your own application, a workload from within the organization — containers' isolation is a reasonable, well-established trade-off; the shared-kernel risk is real but low relative to the operational simplicity and performance benefit containers provide, and it's the industry-standard choice for exactly this reason. For code you deliberately don't trust — user-submitted plugins, a "run arbitrary code" feature, CI jobs from external, unvetted contributors — the calculus changes, because you're now specifically inviting the scenario containers' isolation model is weakest against: someone actively looking for a way through the shared kernel, rather than an accidental bug in trusted code.

The practical recommendation for genuinely untrusted code isn't necessarily "use full VMs for everything" (which gives up a lot of the operational and performance benefit that made containers attractive in the first place) — it's reaching for technologies specifically built to close this gap: gVisor (intercepts and re-implements syscalls in userspace rather than passing them straight to the host kernel, reducing the kernel's exposed surface to untrusted code), Kata Containers (runs each container inside its own lightweight VM, giving genuine kernel-level isolation with much of containers' usual workflow and tooling preserved), or Firecracker microVMs (AWS's lightweight VM technology, used specifically for this purpose in Lambda). These give most of a container's operational convenience while closing the specific gap that matters for untrusted code — a genuine, separate kernel boundary (or a much-reduced syscall surface) between the untrusted workload and the host.

## Key Takeaways

- Containers share the host kernel; a kernel vulnerability is a real, if low-probability, path for a container to affect the host or other containers.
- This trade-off is acceptable for trusted workloads but changes meaningfully for deliberately untrusted, user-submitted code — exactly the scenario where someone might actively look for that path.
- gVisor, Kata Containers, and Firecracker microVMs exist specifically to close this gap while preserving much of containers' operational convenience.
- The recommendation for untrusted code isn't necessarily full traditional VMs everywhere — it's a purpose-built stronger isolation layer for the specific untrusted workload.

## Interview Follow-Up Questions

- What's the performance trade-off of gVisor's userspace syscall interception compared to running containers normally?
- How would you decide between Kata Containers and gVisor for a specific untrusted-code-execution use case?
- How does AWS Lambda's own use of Firecracker microVMs relate to this same trust boundary problem?

## References

- [gVisor: Documentation](https://gvisor.dev/docs/)
- [Kata Containers: Architecture overview](https://katacontainers.io/learn/)
- [AWS: Firecracker microVMs](https://firecracker-microvm.github.io/)
