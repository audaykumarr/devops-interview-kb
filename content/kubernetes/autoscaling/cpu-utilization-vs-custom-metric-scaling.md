---
id: kubernetes-autoscaling-cpu-vs-custom-metric-scaling-001
title: "What's the difference between HPA scaling on CPU utilization versus a custom metric like queue depth, and when is CPU actually the wrong signal?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - comparison
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

HPA can scale on built-in resource metrics like CPU utilization, or on custom application-level metrics like queue depth (via the custom metrics API). What's mechanically different between these, and specifically when does CPU utilization fail to be a meaningful scaling signal even though it's the easiest one to set up?

## Short Answer

CPU utilization is a proxy for load that works well when CPU usage genuinely correlates with the actual bottleneck — but for workloads where the real constraint is something else (waiting on I/O, processing a queue, holding open connections), CPU can stay low even while the workload is genuinely under-provisioned, meaning HPA never scales despite a real capacity problem. Custom metrics let you scale directly on the signal that actually reflects load for that specific workload, at the cost of needing a metrics adapter and an instrumented, exposed metric to scale on.

## Detailed Explanation

**CPU-based scaling requires only metrics-server, which is why it's the default starting point**: metrics-server is a near-universal cluster component, and CPU/memory utilization scaling works out of the box with no additional instrumentation — this low setup cost is exactly why it's the default choice, independent of whether it's actually the right signal for a given workload's bottleneck.

**CPU utilization fails as a signal when the workload's actual bottleneck isn't CPU-bound**: a worker process pulling jobs from a queue might spend most of its time waiting on a slow downstream API call or database query — CPU usage during that wait is low, so CPU-based HPA sees no reason to scale, even though the queue is backing up and users are experiencing real delay. The workload is genuinely under-provisioned; CPU just isn't the metric that reveals it.

**Custom metrics scale on the signal that actually represents the bottleneck**: for the queue-worker example, scaling on queue depth (via the custom or external metrics API, commonly backed by a Prometheus adapter reading a metric the application or queue system exposes) directly targets "how much backlog exists," which is the actual thing that matters for deciding whether more workers are needed — independent of what CPU usage happens to look like.

**Setting up custom metrics scaling requires more infrastructure than CPU-based scaling**: it needs the metric to actually be exposed somewhere HPA can read it (commonly Prometheus, via the Prometheus Adapter implementing the custom metrics API), the application or queue system to expose that metric in the first place, and correctly configuring the HPA to target it — meaningfully more setup than CPU scaling's near-zero-configuration default.

**Request-rate or latency-based metrics are another common non-CPU signal**: for a request-serving workload where response time under load is the real user-facing concern, scaling on request rate or a latency percentile (rather than CPU) can more directly protect the actual SLO the workload is trying to meet, especially for workloads with a request pattern where CPU usage doesn't scale linearly with meaningful load.

**Choosing the right metric requires understanding what actually constrains the workload, not defaulting to whatever's easiest to wire up**: the diagnostic question is "what resource or condition, if insufficient, actually causes user-visible degradation for this specific workload?" — CPU is the right answer for genuinely CPU-bound workloads, and the wrong answer for anything I/O-bound, queue-driven, or otherwise bottlenecked on something CPU usage doesn't reflect.

## Key Takeaways

- CPU-based scaling requires only metrics-server, making it the low-setup-cost default — but that ease of setup doesn't mean it's the right signal for every workload.
- CPU utilization fails specifically for workloads bottlenecked on something other than CPU (I/O waits, queue backlog, external API latency) — usage stays low even when the workload is genuinely under-provisioned.
- Custom metrics (queue depth, request rate, latency) let HPA scale on the signal that actually represents the workload's real bottleneck, at the cost of needing a metrics adapter and instrumentation.
- The right diagnostic question is "what actually causes user-visible degradation for this workload," not which metric is easiest to wire up.

## Interview Follow-Up Questions

- How would you set up the Prometheus Adapter to expose a custom application metric to HPA, at a high level?
- What would you do if the ideal scaling metric (queue depth) is only available with significant lag, making it a poor real-time signal despite being conceptually correct?
- How would you combine a custom metric with CPU as a secondary safety-net signal, so HPA scales on whichever indicates the more urgent need?

## References

- [Kubernetes: HPA — Support for Metrics APIs](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-metrics-apis)
- [Kubernetes SIGs: Prometheus Adapter (GitHub)](https://github.com/kubernetes-sigs/prometheus-adapter)
