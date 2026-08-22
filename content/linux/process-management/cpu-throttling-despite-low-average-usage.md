---
id: linux-process-management-cpu-throttling-low-average-001
title: "A containerized process shows only 40% average CPU usage, well under its configured limit, but application metrics show frequent latency spikes correlating with CPU throttling events. How is this possible?"
category: linux
subcategory: process-management
technologies:
  - linux
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - linux
  - cgroups
  - cpu-throttling
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A containerized process's CPU usage graph shows a comfortable 40% average, well under its configured CPU limit. Yet application-level metrics show frequent latency spikes, and the container's own throttling metrics (`nr_throttled` in its cgroup CPU stats) confirm it's being throttled regularly. How is a process with only 40% average CPU usage getting throttled at all?

## Short Answer

CPU limits under cgroups (specifically the CFS bandwidth controller most container runtimes use) are enforced over short, fixed time windows (a 100ms period is the default), not as a smooth, continuous average — a process can have a low overall average usage while still bursting well above its per-period allotment during specific short windows (a garbage collection pause, a burst of concurrent requests, a synchronous blocking operation catching up all at once), and those brief bursts get throttled even though the longer-term average looks comfortably low.

## Detailed Explanation

The mismatch between "low average usage" and "getting throttled" exists because averaging smooths out exactly the short bursts that trigger throttling — a metric reporting usage averaged over minutes or even seconds can look perfectly healthy while the actual enforcement mechanism operates on a much shorter, 100-millisecond-by-default window where a brief spike can consume the entire period's CPU allotment almost instantly.

## Symptoms

- Application-level latency spikes or stalls occur intermittently, without an obvious corresponding spike in average CPU usage metrics.
- The container's cgroup CPU statistics (`nr_throttled`, `throttled_time` in `/sys/fs/cgroup/.../cpu.stat`) show non-zero, ongoing throttling events.
- Average CPU usage over typical monitoring intervals (minutes) stays comfortably under the configured limit.

## Possible Causes

- The workload has genuinely bursty CPU demand (garbage collection pauses in managed-runtime languages, a batch of concurrent requests processed together, synchronous initialization work) that consumes a full period's CPU quota within a very short window, even though the process is idle or lightly loaded most of the rest of the time.
- The CPU limit itself is set too low for the workload's actual peak, short-window demand, even if it's comfortably sufficient for the workload's average demand.
- Multiple threads within the container burst concurrently, consuming the shared per-period CPU quota faster than a single-threaded burst would, since the quota is shared across all threads in the cgroup.

## Investigation Steps

1. Check the container's actual cgroup CPU statistics directly (`cat /sys/fs/cgroup/cpu/.../cpu.stat` for cgroups v1, or the v2 equivalent) for `nr_throttled` (count of throttled periods) and `throttled_time` (total time spent throttled) — this confirms and quantifies the throttling directly, rather than inferring it from application symptoms alone.
2. Correlate the timing of throttling events against application-level latency spikes, to confirm they're actually related rather than coincidental.
3. Examine CPU usage at a much finer granularity than the default monitoring interval — sub-second sampling, if available, can reveal short bursts that a minute-level average completely smooths away.
4. Check whether the workload has known bursty characteristics (a garbage-collected runtime, batch processing patterns, synchronous startup work) that would explain short, intense CPU demand spikes.

## Resolution

1. **Raise the CPU limit to accommodate actual peak short-window demand, not just average demand** — since the throttling mechanism operates on short periods, the limit needs headroom for genuine bursts, even if the long-term average usage would suggest a lower limit is "sufficient."
2. **If the bursty behavior comes from something addressable in the application itself** (e.g., garbage collection tuning to reduce pause intensity, spreading concurrent request processing more evenly rather than batching), addressing the root cause of the burst can reduce peak demand without simply raising the limit.
3. **Consider whether CPU requests/limits are the right mechanism at all for this specific workload**, versus removing the limit entirely (relying only on a request, if the cluster's scheduling model and multi-tenancy requirements allow it) — a hard limit is specifically what causes throttling; a workload that's fundamentally bursty may be better served by generous headroom or no hard limit, if isolation requirements permit that trade-off.
4. **Verify the fix** by monitoring both average usage and throttling metrics after the change, confirming `nr_throttled` drops to near zero under realistic load, not just that the symptom (application latency) appears to improve.

## Prevention

- Monitor cgroup throttling metrics (`nr_throttled`, `throttled_time`) as a first-class signal alongside average CPU usage, since average usage alone can hide this class of problem entirely.
- Set CPU limits based on actual measured peak short-window demand, not just average usage, for any workload with known or suspected bursty CPU characteristics.
- Load-test with realistic burst patterns (not just steady-state average load) when validating resource limits for a new or changed workload.

## Key Takeaways

- CFS CPU quota enforcement (the mechanism behind Kubernetes/container CPU limits) operates on short, fixed periods (100ms by default), not as a smooth average — a low long-term average can coexist with frequent short-window throttling.
- Bursty workloads (garbage collection pauses, batched concurrent request processing) can exceed their per-period quota briefly even while their overall average usage looks comfortably low.
- `nr_throttled`/`throttled_time` in the container's cgroup CPU statistics directly confirm and quantify throttling — don't rely on average usage metrics alone to rule it out.
- The fix is providing headroom for actual peak short-window demand (or addressing the root cause of the burst, or reconsidering whether a hard limit is appropriate at all), not just looking at whether average usage fits under the configured limit.

## Interview Follow-Up Questions

- How would you tune garbage collection settings to reduce the intensity of CPU bursts in a managed-runtime language, if that's the identified root cause?
- What's the trade-off of removing CPU limits entirely (using only requests) in a shared, multi-tenant Kubernetes cluster?
- How does the CFS bandwidth controller's period length itself affect the granularity of this throttling behavior, and could that be tuned?

## References

- [Kubernetes: CPU limits and aggressive throttling explained (via kubernetes/kubernetes#67577 discussion)](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Linux kernel documentation: CFS Bandwidth Control](https://docs.kernel.org/scheduler/sched-bwc.html)
