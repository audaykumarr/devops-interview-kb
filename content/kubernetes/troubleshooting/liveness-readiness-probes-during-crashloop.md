---
id: kubernetes-troubleshooting-probes-during-crashloop-001
title: "How do liveness and readiness probes interact with a Pod that's already crash-looping on startup?"
category: kubernetes
subcategory: troubleshooting
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - probes
  - troubleshooting
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Pod is stuck in `CrashLoopBackOff`. How do liveness and readiness probes actually interact with that situation — can a misconfigured probe be the actual cause of the crash-looping, rather than just a bystander?

## Short Answer

Yes — a misconfigured liveness probe is a very common actual *cause* of crash-looping, not just something observing it: if the liveness probe is set to fire before the application has genuinely finished starting up (too short an `initialDelaySeconds`, or a probe hitting an endpoint that isn't ready yet), Kubernetes will kill and restart the container for "failing" its liveness check even though the application was actually in the middle of legitimately starting up — creating a self-inflicted crash loop where the real problem is the probe's timing, not the application itself. Readiness probes don't cause restarts (they only control whether the Pod receives traffic), so they can't directly cause crash-looping, but a failing readiness probe alongside a genuinely crash-looping container compounds the visible symptoms.

## Detailed Explanation

**Liveness probes** determine whether Kubernetes considers a container "alive" — if a liveness probe fails enough times (per its configured `failureThreshold`), Kubernetes kills and restarts the container, treating the failure as evidence the application is stuck or broken. This is exactly why a liveness probe configured too aggressively for the application's actual startup time is a real, common cause of crash-looping: an application that genuinely takes 30 seconds to initialize (loading data, warming a cache, establishing database connections) but has a liveness probe with `initialDelaySeconds: 5` will get killed by Kubernetes at the 5-second mark for "failing" the probe — not because the application is actually broken, but because it hadn't finished starting yet when the probe checked. Kubernetes then restarts the container, which again takes 30 seconds to start, again gets killed at 5 seconds — a self-perpetuating crash loop entirely caused by probe misconfiguration, not any actual application defect. This is a genuinely common real-world cause of `CrashLoopBackOff`, and worth checking specifically (comparing the probe's `initialDelaySeconds`/`periodSeconds`/`failureThreshold` against the application's actual observed startup time) before assuming the crash-looping reflects a real application bug.

**Readiness probes** work differently in consequence: a failing readiness probe doesn't cause Kubernetes to kill or restart the container at all — it only removes the Pod from a Service's Endpoints, meaning it stops receiving traffic while still running. A readiness probe can't directly *cause* crash-looping, since it has no restart-triggering mechanism. However, a container that's genuinely crash-looping for an unrelated reason will also naturally fail its readiness probe (since a crashing container obviously isn't ready to serve traffic), which is expected, correct behavior in that case — not itself a separate problem, just a compounding symptom of the underlying crash.

The practical diagnostic distinction: when investigating `CrashLoopBackOff`, checking `kubectl describe pod` for events explicitly mentioning "Liveness probe failed" (versus the application's own logs showing a genuine crash/exception) tells you immediately whether the restart was Kubernetes-initiated due to a probe failure, or application-initiated due to the process actually exiting on its own — a critical distinction, since the fix is entirely different (adjust probe timing versus fix an actual application bug).

## Key Takeaways

- A liveness probe configured too aggressively for the application's real startup time is a genuine, common cause of self-inflicted crash-looping, not just something observing an unrelated problem.
- Readiness probe failures don't trigger restarts at all — they only remove the Pod from traffic — so they can't directly cause crash-looping.
- A container crash-looping for an unrelated reason will also naturally fail readiness checks, which is expected compounding behavior, not a separate issue.
- `kubectl describe pod` events distinguish a probe-triggered restart from a genuine application-initiated crash — critical for choosing the right fix.

## Interview Follow-Up Questions

- How would you tune `initialDelaySeconds`, `periodSeconds`, and `failureThreshold` correctly for an application with variable startup time?
- What's the difference between a liveness probe and a startup probe, and how does a startup probe solve this exact class of problem more directly?
- How would you distinguish, from `kubectl describe pod` output alone, a liveness-probe-triggered restart from an OOMKill-triggered restart?

## References

- [Kubernetes Docs: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes Docs: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
