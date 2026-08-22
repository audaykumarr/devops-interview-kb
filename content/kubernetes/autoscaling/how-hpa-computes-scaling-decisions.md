---
id: kubernetes-autoscaling-how-hpa-computes-decisions-001
title: "How does HPA's scaling decision actually get computed from raw metrics — walk through what happens between a CPU spike and a new replica appearing?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - hpa
  - autoscaling
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Deployment's CPU usage spikes under load. Some time later, the HPA adds a new replica. Walk through exactly what happens in between — how does raw CPU usage data actually turn into a scaling decision?

## Short Answer

The HPA controller periodically (every 15 seconds by default) pulls current resource usage from the metrics pipeline (metrics-server for CPU/memory, or a custom/external metrics adapter for other signals), computes each pod's utilization as a percentage of its resource request, averages this across all pods, and compares it to the HPA's target — if the ratio of current-to-target utilization implies more replicas are needed, it computes a new desired replica count using a defined formula, then applies scaling behavior constraints (stabilization window, scaling policies) before actually updating the Deployment's replica count.

## Detailed Explanation

**The metrics pipeline is the data source, and it isn't instantaneous**: metrics-server itself scrapes kubelets on its own interval and the HPA controller's periodic sync (`--horizontal-pod-autoscaler-sync-period`, default 15s) polls the metrics API — meaning there's inherent latency between an actual CPU spike and the HPA controller even seeing it, before any scaling logic runs at all.

**Utilization is computed per-pod as a percentage of the pod's own resource request**: for CPU, this is `(current CPU usage) / (requested CPU) * 100` for each pod, then averaged across all pods targeted by the HPA — this is exactly why a missing `requests.cpu` breaks the calculation entirely, since there's no denominator to compute a percentage against.

**The desired replica count formula scales proportionally to how far utilization is from target**: the core formula is `desiredReplicas = ceil(currentReplicas * (currentMetricValue / desiredMetricValue))` — if current average utilization is double the target, this computes roughly double the current replica count as desired (subject to `minReplicas`/`maxReplicas` bounds), which is why HPA can make a large jump in one step for a large deviation, not just a fixed increment.

**Scaling behavior policies and the stabilization window are applied after the raw calculation**: the computed desired count isn't necessarily applied immediately — `behavior.scaleUp`/`scaleDown` policies can cap how much or how fast replicas change per sync interval, and the stabilization window looks back over a recent time period to avoid reacting to a single brief spike, using the highest (for scale-up) or lowest (for scale-down) recommendation from that window rather than just the most recent calculation.

**Only after all of that does the Deployment's replica count actually change**: the HPA controller patches the target Deployment's `spec.replicas`, which then goes through the normal Deployment/ReplicaSet reconciliation and pod scheduling — meaning the full path from "CPU spike happens" to "new pod is actually Ready and serving traffic" includes metrics latency, the HPA's own sync interval and stabilization logic, and then ordinary pod scheduling/startup time on top of all of that.

**This end-to-end latency is why HPA isn't a substitute for handling brief traffic bursts**: for a spike that resolves faster than this whole pipeline can react, HPA will still be in the process of reacting even after the spike has already passed — this is a structural property of the mechanism, not a misconfiguration, and matters for deciding whether HPA alone is sufficient for a workload's actual traffic pattern.

## Key Takeaways

- The HPA controller polls the metrics pipeline periodically (not continuously), introducing structural latency before any scaling decision is even considered.
- Utilization is computed as a percentage of each pod's resource request, averaged across pods — this is why missing requests break CPU-based scaling entirely.
- The desired replica count formula scales roughly proportionally to how far current utilization is from target, which is why HPA can jump replica counts significantly in one step.
- Stabilization windows and scaling behavior policies are applied after the raw calculation, specifically to avoid reacting to brief, non-sustained spikes.

## Interview Follow-Up Questions

- An HPA scales up rapidly during a spike, then flaps up and down repeatedly for the next hour — what's causing it, and how do you fix it?
- How would you tune the HPA sync period or metrics pipeline for a workload that needs a faster reaction time than the defaults provide?
- What's the difference between HPA scaling on CPU utilization versus a custom metric like queue depth, and when is CPU actually the wrong signal?

## References

- [Kubernetes: Horizontal Pod Autoscaling — Algorithm Details](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#algorithm-details)
