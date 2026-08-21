---
id: python-scripting-docker-cgroup-oom-vs-host-oom-001
title: "What's the difference between a Docker container being OOM-killed by its own cgroup memory limit versus the host machine itself running out of memory?"
category: python
subcategory: scripting
technologies:
  - docker
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - docker
  - oom
  - memory
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A container can get OOM-killed for two structurally different reasons: exceeding its own configured memory limit, or the host machine running out of memory overall. What's the actual difference, and why does it matter which one happened?

## Short Answer

A container hitting its own `--memory` limit is contained and precise — the kernel's cgroup memory controller kills a process inside that specific container the instant it crosses its own limit, with every other container on the host completely unaffected. A host running out of memory overall (the sum of all containers' actual usage, plus host-level processes, exceeding physical memory) is a shared-resource event — the kernel's system-wide OOM killer picks some process to kill based on its own scoring, which might not even be the container that was actually responsible for pushing memory usage over the edge.

## Detailed Explanation

**Container-limit OOM**: Docker implements `--memory` (or `mem_limit` in Compose) as a Linux cgroup memory limit scoped specifically to that container. When the container's processes' combined memory usage crosses that limit, the cgroup OOM killer intervenes immediately and precisely, killing a process within that cgroup only — no other container on the host is affected, since the cgroup boundary fully contains the consequence. This is a deliberate, predictable safety mechanism: it's exactly what setting a memory limit is meant to provide, so one container's excessive memory usage can't affect its neighbors.

**Host-level OOM**: this happens when the actual combined memory usage across *everything* running on the host — all containers' real usage (which can be less than their individual limits but still sum to more than the host has available), plus the host OS's own processes — exceeds the host's physical (or otherwise available) memory. The Linux kernel's system-wide OOM killer then has to choose some process to terminate, using a scoring heuristic (`oom_score_adj`) that isn't necessarily the container actually responsible for the excess — a well-behaved, low-memory container can be killed by the host-level OOM killer purely due to its calculated score, even though a completely different container was the one that pushed the host over the edge. This is a meaningfully less contained, less predictable failure mode than the precise, per-container cgroup limit case.

**Why the distinction matters practically**: if you only ever set individual container memory limits without also thinking about the host's total capacity relative to the sum of what's running on it, you can end up in a situation where individual containers are all comfortably within their own limits, yet the host still runs out of memory overall — because the limits themselves were never validated against actual combined usage on that host. Understanding which kind of OOM event occurred (checking `dmesg`/kernel logs for OOM killer activity, and specifically which process/cgroup it targeted) tells you whether the fix is tightening or debugging one specific container's own usage (container-limit case) or reconsidering the overall memory budget across everything scheduled on that host (host-level case) — genuinely different problems requiring different fixes.

## Key Takeaways

- A container exceeding its own memory limit triggers a precise, cgroup-scoped kill affecting only that container.
- Host-level OOM is a shared-resource event where the kernel picks among all processes on the host using a scoring heuristic, potentially killing an uninvolved container.
- Individual containers can all be within their own limits while the host still runs out of memory overall, if the limits weren't validated against the host's actual total capacity.
- Checking kernel/dmesg logs for which specific process the OOM killer targeted tells you which of the two scenarios actually occurred, pointing toward the correct fix.

## Interview Follow-Up Questions

- How would you check `dmesg` or kernel logs to determine which specific container/process the OOM killer actually targeted during a host-level event?
- How would you plan memory limits across many containers on one host to avoid ever reaching the host-level OOM scenario?
- How does this same distinction play out differently once you move to Kubernetes, with its QoS-class-based OOM scoring?

## References

- [Docker Docs: Runtime options with Memory, CPUs, and GPUs](https://docs.docker.com/engine/containers/resource_constraints/)
- [Linux man-pages: proc(5) — oom_score_adj](https://man7.org/linux/man-pages/man5/proc.5.html)
