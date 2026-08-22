---
id: containers-runtime-internals-oom-killed-distinction-001
title: "A container keeps getting killed, and both the container's own memory limit and the host's overall available memory look potentially responsible. How do you determine which one actually caused it?"
category: containers
subcategory: runtime-internals
technologies:
  - containers
  - linux
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - containers
  - linux
  - oom
  - memory
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A container is repeatedly getting killed. The container has a configured memory limit, and you also notice the host itself is running fairly close to its total available memory. Both could plausibly explain the kills. How do you determine definitively which one actually caused it — the container's own cgroup memory limit, or the host's overall memory pressure?

## Short Answer

Check `dmesg` (or the kernel log) for the actual OOM killer invocation details — the log entry explicitly shows which cgroup triggered the kill, distinguishing a cgroup-level OOM (the container exceeded its own configured memory limit, killed by the cgroup's own OOM killer scoped to that cgroup) from a system-level OOM (the host itself ran out of available memory, triggering the global OOM killer, which then picks a victim process using its own heuristics that may or may not be the container you're investigating).

## Detailed Explanation

Modern Linux cgroups (v2 especially) have their own scoped OOM killer that activates independently of the host's global OOM killer — a container can be killed because it individually exceeded its own configured memory limit, entirely independent of whether the host has plenty of free memory overall, or it can be killed as a side effect of the host running low on memory system-wide, where the global OOM killer picks a victim across all processes on the host, which might happen to be your container's process or might be something else entirely.

## Symptoms

- A container process terminates unexpectedly, often visible as exit code 137 (128 + SIGKILL) in `docker inspect` or Kubernetes Pod status.
- The container's memory usage may or may not have been close to its configured limit at the time of the kill.
- Other containers or host processes may or may not show signs of memory pressure at the same time.

## Possible Causes

- The container's own memory usage exceeded its configured cgroup memory limit, triggering the cgroup-scoped OOM killer specifically for that container, independent of overall host memory availability.
- The host's overall available memory dropped low enough to trigger the global, system-wide OOM killer, which then selected a victim process using its own scoring (based on `oom_score_adj` and memory usage) — this victim could be the container in question, but the underlying cause is host-wide memory pressure, not that specific container's individual limit.
- The container's memory limit is set close to or matching the host's overall available memory in an environment with poor resource allocation practices, making the two failure modes hard to distinguish just from symptoms without checking the actual OOM killer log.

## Investigation Steps

1. Check `dmesg` or `/var/log/kern.log` (or the equivalent kernel log location) around the time of the kill for the actual OOM killer invocation message.
2. Look specifically at whether the log entry references a cgroup-scoped OOM ("Memory cgroup out of memory") versus a system-wide OOM ("Out of memory: Killed process") — this single distinction is the definitive answer to which failure mode occurred.
3. If cgroup-scoped, check exactly how close the container's actual memory usage was to its configured limit leading up to the kill, to understand whether this was a hard limit hit under normal load or a genuine leak/spike.
4. If system-wide, check what else was running on the host at the time and its own memory usage, to understand the broader host-level memory pressure and whether other processes were also at risk.

## Resolution

1. **For a cgroup-scoped OOM (container exceeded its own limit)**: either the container's memory limit needs to be raised to match its actual legitimate memory needs (if the limit was simply set too low), or the application has a genuine memory leak/inefficiency that needs to be fixed at the application level, distinguished by whether memory usage plateaus at a reasonable level or grows unboundedly under sustained load.
2. **For a system-wide OOM (host ran out of memory)**: the fix is at the host/scheduling level, not the individual container — either the host is over-committed (too many containers' combined memory requests/limits exceed what the host can actually support), or something on the host outside your investigation's initial focus is consuming unexpected memory, requiring broader host-level memory audit.
3. **Verify the fix** by monitoring for recurrence under similar load conditions, checking the same `dmesg`/kernel log signal to confirm the specific failure mode you addressed doesn't recur.

## Prevention

- Set container memory requests/limits (in Kubernetes, or equivalent Docker configuration) based on actual measured usage data, with reasonable headroom, rather than arbitrary defaults.
- Monitor host-level memory pressure as its own metric, independent of individual container memory usage, so over-commitment is caught before it causes unpredictable system-wide OOM kills across multiple containers.
- In Kubernetes specifically, set appropriate resource requests (not just limits) so the scheduler can make informed placement decisions that avoid over-committing a node's actual available memory.

## Key Takeaways

- The kernel log (`dmesg`) definitively distinguishes a cgroup-scoped OOM (container exceeded its own limit) from a system-wide OOM (host ran out of memory, killed a process via global heuristics) — don't guess based on symptoms alone.
- A cgroup-scoped OOM points to either a too-low configured limit or a genuine application-level memory issue; a system-wide OOM points to host-level over-commitment or unexpected host memory consumption.
- These require genuinely different fixes — adjusting one container's limit doesn't help a system-wide OOM problem, and host-level memory investigation doesn't help a container that's genuinely leaking within its own limit.
- Exit code 137 alone doesn't tell you which failure mode occurred — it just confirms a SIGKILL happened, requiring the kernel log to determine the actual cause.

## Interview Follow-Up Questions

- How would you set appropriate memory requests and limits in Kubernetes to minimize the risk of both failure modes?
- How would you distinguish a genuine memory leak from a container that's simply under-provisioned for its actual legitimate peak usage?
- How does the Linux OOM killer's scoring (`oom_score_adj`) work, and how would you influence which process is chosen as the victim during a system-wide OOM?

## References

- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Linux man-pages: cgroups(7)](https://man7.org/linux/man-pages/man7/cgroups.7.html)
