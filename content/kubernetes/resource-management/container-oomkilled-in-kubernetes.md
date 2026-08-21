---
id: kubernetes-resource-management-oomkilled-001
title: "Your container runs fine locally but repeatedly gets OOMKilled after you deploy it to Kubernetes. How would you investigate it?"
category: kubernetes
subcategory: resource-management
technologies:
  - kubernetes
  - containers
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - oomkilled
  - resource-limits
  - memory
  - kubernetes
estimated_time_minutes: 10
companies: []
related_questions:
  - kubernetes-troubleshooting-crashloopbackoff-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Your container works fine on your laptop but repeatedly gets `OOMKilled` after you deploy it to Kubernetes. How would you investigate it?

## Short Answer

Confirm it's actually a memory limit kill (`kubectl describe pod` will show `Reason: OOMKilled`, exit code 137) rather than some other crash, then compare the container's real memory usage against its configured `resources.limits.memory` — "runs fine locally" almost always means it was running without any memory ceiling at all, so the real question isn't why Kubernetes is killing it, it's what memory limit would actually be correct for this workload.

## Detailed Explanation

Running locally (`docker run` with no memory flags, or directly on your laptop) gives a process access to however much memory the host has free — there's no ceiling to hit. Kubernetes' `resources.limits.memory` imposes a hard ceiling per container, enforced by the kernel's cgroup memory controller: the instant the container's memory usage would exceed that limit, the kernel's OOM killer terminates the process, Kubernetes reports it as `OOMKilled`, and (assuming a restart policy that allows it) the container restarts — which is why this often shows up alongside `CrashLoopBackOff` if it happens repeatedly.

The investigation isn't really "why did Kubernetes kill my container" — the kernel did exactly what it's supposed to do. The real question is why the container's actual memory usage exceeds whatever limit was set, and whether that limit is simply wrong (too low for legitimate usage) or the application has a real problem (a memory leak, an unbounded cache, or a burst workload like a large file upload/report generation that spikes memory well above steady-state). Distinguishing these requires actually observing memory usage over time, not just noting that a kill happened.

It's also worth checking `resources.requests.memory` separately from `limits`: requests affect scheduling (which node a pod lands on and whether the node has room) but don't cap usage on their own; only `limits` does that. A pod with no `limits.memory` set at all won't OOMKill from a container-level cgroup limit, but can still contribute to node-level memory pressure that gets pods evicted — a related but distinct failure mode from a container hitting its own limit.

## Symptoms

- `kubectl get pods` shows the container restarting, often cycling into `CrashLoopBackOff` if it happens repeatedly.
- `kubectl describe pod` shows `Last State: Terminated`, `Reason: OOMKilled`, `Exit Code: 137`.
- The same application, run locally or in a container without a memory limit, doesn't exhibit the problem.

## Possible Causes

- The configured `resources.limits.memory` is simply too low for the application's legitimate memory usage under real load (as opposed to the light load of local testing).
- A genuine memory leak in the application, which only becomes visible over a longer runtime than a quick local test would exercise.
- A workload with a real memory spike (large request/response payloads, file processing, report generation, JVM/language-runtime behavior under load) that exceeds the limit only under specific conditions.
- Language-runtime memory behavior that doesn't respect the container's cgroup limit correctly (e.g. an older JVM defaulting its heap sizing off total host memory instead of the container's cgroup limit) and so oversizes itself relative to the container ceiling.
- A shared cache or in-memory buffer that grows unbounded over the container's uptime rather than staying flat.

## Investigation Steps

1. `kubectl describe pod <pod>` to confirm the exact reason (`OOMKilled`) and exit code (`137`), ruling out an unrelated crash.
2. `kubectl top pod <pod>` (requires metrics-server) or your cluster's monitoring stack to see actual memory usage over time, not just at the moment of the kill.
3. Compare peak observed usage against the configured `resources.limits.memory` to see how far over the limit the container was running.
4. Check whether memory grows steadily over the container's lifetime (leak/unbounded cache signature) or spikes sharply under specific requests (workload-driven spike signature).
5. If it's a JVM, Node.js, or similar managed runtime, check whether the runtime's own memory settings (heap size, etc.) are configured to respect the container's cgroup limit rather than the host's total memory.
6. Reproduce load locally with an explicit memory limit set (e.g. `docker run --memory=512m`) to see if the same behavior reproduces outside the cluster.

## Commands

```bash
kubectl describe pod my-pod -n my-namespace
kubectl top pod my-pod -n my-namespace --containers
kubectl get pod my-pod -n my-namespace -o jsonpath='{.spec.containers[0].resources}'

# reproduce locally with an explicit memory ceiling
docker run --memory=512m --memory-swap=512m my-image
```

## Resolution

If the limit is simply too low for legitimate usage, raise `resources.limits.memory` to a value with headroom above observed peak usage — and set `resources.requests.memory` close to typical steady-state usage so the scheduler places the pod on a node with adequate room. If it's a genuine leak, the fix is in the application, not the Kubernetes manifest — raising the limit only delays the eventual kill. If it's a managed-runtime sizing issue, explicitly configure the runtime's memory settings (e.g. JVM `-XX:MaxRAMPercentage` tuned for container awareness) so it respects the cgroup limit rather than guessing based on host memory.

## Prevention

- Load-test with production-like traffic and payload sizes before setting `resources.limits.memory`, rather than guessing or copying a default.
- Set up alerting on memory usage approaching the configured limit, so it's caught before a hard OOMKill in production.
- For managed runtimes, explicitly configure container-aware memory settings rather than relying on defaults that may predate proper cgroup awareness.
- Revisit resource limits periodically as the application's dependencies and traffic patterns change, rather than treating the original value as permanent.

## Interview Follow-Up Questions

- What's the difference in behavior between a container hitting its own memory limit versus a node running out of memory overall?
- How would you distinguish a memory leak from a legitimately growing cache using only Kubernetes-level metrics?
- How does `requests.memory` versus `limits.memory` affect pod scheduling and node-level eviction behavior differently?

## Key Takeaways

- "Runs fine locally" usually just means there was no memory ceiling locally — the real question is what limit is correct, not why the kill happened.
- OOMKilled (exit code 137) is the kernel enforcing a cgroup memory limit, not an application-level crash.
- Distinguish a limit that's too low from a genuine memory leak by observing usage over time, not just noting that a kill occurred.
- Managed runtimes (JVM, etc.) need explicit container-aware memory configuration or they can oversize themselves relative to the container's actual limit.

## References

- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Configure Quality of Service for Pods](https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/)
- [Kubernetes: Node-pressure Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
