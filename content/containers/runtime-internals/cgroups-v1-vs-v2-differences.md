---
id: containers-runtime-internals-cgroups-v1-vs-v2-001
title: "What actually changed between cgroups v1 and v2, and why did some container resource limit behavior change when a host migrated to a v2-only kernel/distro?"
category: containers
subcategory: runtime-internals
technologies:
  - containers
  - linux
difficulty: advanced
question_type:
  - comparison
tags:
  - containers
  - linux
  - cgroups
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

After migrating hosts to a newer Linux distribution that defaults to cgroups v2 (unified hierarchy) instead of v1, some container resource limit and monitoring behavior changed subtly. What actually changed between cgroups v1 and v2, and why does it matter for container workloads specifically?

## Short Answer

cgroups v1 allowed each resource controller (CPU, memory, I/O, etc.) to have its own separate hierarchy, which processes could be organized into differently per controller — flexible, but genuinely confusing and inconsistent to reason about. cgroups v2 unifies this into a single hierarchy where all controllers apply consistently to the same process groupings, which is simpler and more predictable, but changed some specific behaviors (particularly around memory accounting and I/O controller capabilities) that container runtimes and monitoring tooling needed to be updated to handle correctly.

## Detailed Explanation

The core architectural change between v1 and v2 is moving from multiple independent per-controller hierarchies to a single, unified hierarchy — this sounds like a small structural detail but has real, practical consequences for how resource limits are organized and how monitoring tools need to query resource usage.

**cgroups v1's per-controller hierarchies allowed genuine flexibility, at the cost of consistency**: under v1, you could organize processes into one grouping structure for CPU limiting and an entirely different grouping structure for memory limiting — theoretically powerful, but practically confusing, since understanding "what resource limits actually apply to this process" required checking multiple, potentially differently-structured hierarchies rather than one consistent view.

**cgroups v2's unified hierarchy applies all controllers consistently to the same grouping**: every process belongs to one place in one hierarchy, and all enabled controllers (CPU, memory, I/O, PIDs) apply based on that single position — this is simpler to reason about and matches how container runtimes actually think about resource limits (a container's resource limits as one coherent set, not scattered across independent per-controller structures).

**Memory accounting changed in ways that affected some monitoring tooling**: v2's memory controller provides different (in some ways more accurate) memory usage statistics than v1's, and some existing monitoring tools or dashboards built assuming v1's specific memory accounting fields needed updates to correctly interpret v2's memory statistics — a real, practical migration friction point for teams upgrading, not just an internal implementation detail.

**I/O controller capabilities differ between versions**: v2's I/O controller (`io` in v2, versus `blkio` in v1) has some different capabilities and configuration interface, meaning I/O throttling/limiting configuration written for v1 needed adaptation for v2 — another concrete area where the underlying architectural change surfaces as a real, practical difference in what container runtime configuration or monitoring needed updating.

**Container runtimes needed explicit v2 support, which took time to mature across the ecosystem**: Docker, containerd, and Kubernetes all needed to add explicit cgroups v2 support (rather than just working automatically), meaning the transition period involved real compatibility considerations — checking whether your specific container runtime version and Kubernetes version fully support cgroups v2 was a genuine, practical migration concern, not just an academic architecture question.

**Why this matters for troubleshooting container resource issues specifically**: understanding which cgroups version a host is running (checking `/sys/fs/cgroup` structure, or via `mount | grep cgroup`) is often a necessary first step when debugging a resource-limit-related container issue, since the exact files, statistics fields, and even some specific limiting behaviors differ between the two versions — troubleshooting steps that assume v1's file locations and format simply won't find the right information on a v2 host, and vice versa.

## Key Takeaways

- cgroups v1 used separate, independent hierarchies per resource controller; v2 unifies everything into one consistent hierarchy where all controllers apply to the same process groupings.
- v2's unified model is simpler and more predictable, but changed specific behaviors (memory accounting fields, I/O controller capabilities) that required container runtime and monitoring tooling updates.
- Container runtimes (Docker, containerd, Kubernetes) needed explicit v2 support, meaning the ecosystem transition involved real, practical compatibility considerations, not just an internal kernel detail.
- When troubleshooting container resource-limit issues, first determine which cgroups version the host is running, since the relevant files, statistics, and some limiting behaviors genuinely differ between versions.

## Interview Follow-Up Questions

- How would you check which cgroups version a given host or Kubernetes node is currently running?
- What specific Kubernetes features or behaviors depend on cgroups v2 being available?
- How would you handle a mixed-fleet migration where some nodes run cgroups v1 and others v2 during a gradual rollout?

## References

- [Kubernetes: About cgroup v2](https://kubernetes.io/docs/concepts/architecture/cgroups/)
- [Linux kernel documentation: Control Group v2](https://docs.kernel.org/admin-guide/cgroup-v2.html)
