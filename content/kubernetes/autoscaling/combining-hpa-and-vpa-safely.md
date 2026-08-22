---
id: kubernetes-autoscaling-combining-hpa-vpa-safely-001
title: "A team wants to run HPA and VPA on the same Deployment for both CPU and memory — what breaks if you're not careful, and how do you combine them safely?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: expert
question_type:
  - architecture
  - scenario
tags:
  - kubernetes
  - hpa
  - vpa
  - autoscaling
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A team wants both HPA (to scale replica count with load) and VPA (to right-size each pod's CPU/memory automatically) running on the same Deployment. Naively enabling both, targeting the same resource metric, can cause the two controllers to fight each other. What actually goes wrong, and how would you combine them safely?

## Short Answer

The conflict happens when HPA scales on a metric (typically CPU utilization) that VPA is simultaneously adjusting the baseline for — VPA changing a pod's CPU request changes what "100% utilization" even means for HPA's percentage-based calculation, causing both controllers to react to changes the other one caused, potentially oscillating. The safe combination is to have VPA manage memory (or run in recommendation-only mode) while HPA scales on CPU or a custom metric VPA doesn't touch, keeping each controller's responsibility non-overlapping.

## Detailed Explanation

HPA and VPA each solve a real, legitimate scaling problem, but they weren't designed with each other in mind by default — combining them safely means understanding exactly which shared state creates the conflict, and deliberately partitioning responsibility so neither controller reacts to changes the other one caused.

## Requirements

- Both horizontal scaling (replica count responding to load) and vertical right-sizing (per-pod resource requests matching actual usage) are needed for the workload.
- The two controllers must not both be actively adjusting the same underlying signal, to avoid feedback-loop oscillation.
- The combination should be genuinely safer/better than using either controller alone, not just theoretically compatible.

## Architecture

**The core conflict: VPA changes the baseline HPA measures against**: HPA's CPU-based scaling computes utilization as a percentage of the pod's `requests.cpu` — if VPA is simultaneously updating that same `requests.cpu` value based on its own observed usage, HPA's percentage calculation is now measured against a constantly shifting baseline, and a VPA-driven request increase can itself look like a utilization drop to HPA (or vice versa), triggering scaling decisions that don't reflect genuine load changes.

**Split responsibility by resource dimension**: assign VPA to manage memory (`updateMode` targeting memory requests/limits) while HPA scales on CPU utilization (or, better, a custom application-level metric like request rate or queue depth that neither controller's own adjustments affect) — this keeps the two controllers acting on non-overlapping signals, eliminating the feedback loop entirely.

**VPA's `updateMode: "Off"` (recommendation-only) is the safest starting point**: running VPA in `Off` mode means it computes and exposes its resource recommendations without actually applying them automatically — this lets a team observe what VPA *would* set, validate it looks reasonable, and apply it manually or via a controlled process, rather than trusting full automatic application (`Auto` mode, which can also restart pods to apply new resource values) from day one.

**If VPA does need to manage CPU too, use a custom metric for HPA instead of CPU utilization**: for workloads where request-rate or queue-depth is a more meaningful scaling signal than CPU anyway, using that as HPA's target metric (via the custom metrics API) sidesteps the conflict entirely, since VPA adjusting CPU requests has no effect on a metric that isn't CPU-percentage-based.

**Test the combination's behavior under a realistic load pattern before trusting it in production**: because the failure mode here is an oscillation that might only manifest under sustained variable load (not obvious from a quick smoke test), validating the combined HPA/VPA setup against a load test that mimics real production traffic patterns — watching for repeated scale-up/scale-down or resource-request churn — is necessary before relying on it for a genuinely critical workload.

## Trade-offs

Splitting responsibility (VPA on memory, HPA on CPU or a custom metric) is simpler to reason about and avoid conflict, but doesn't get you fully-automatic vertical *and* horizontal scaling on the same dimension simultaneously — if a workload's CPU usage per pod genuinely also needs right-sizing, that has to happen through VPA's recommendation-only mode and periodic manual review, rather than full automation. Running VPA in `Off` mode is safer but requires an ongoing human or automated process to actually act on its recommendations, or the benefit of having VPA at all is lost.

## Key Takeaways

- The conflict arises specifically when VPA adjusts the same resource baseline (CPU requests) that HPA measures its scaling percentage against.
- Split responsibility by resource dimension (VPA on memory, HPA on CPU or a custom metric) to keep the two controllers acting on non-overlapping signals.
- VPA's `updateMode: "Off"` (recommendation-only) is the safest starting point, letting a team validate recommendations before any automatic application.
- Test the combined setup against realistic, sustained load patterns specifically to catch oscillation, which may not be obvious from a quick check.

## Interview Follow-Up Questions

- How would you monitor for HPA/VPA oscillation in production, before it causes a customer-visible problem?
- What would you do if the workload genuinely needs both HPA and VPA acting on CPU simultaneously, with no way to split responsibility?
- How does VPA's pod-restart behavior in `Auto` mode interact with a workload that has strict availability requirements during scaling events?

## References

- [Kubernetes: Vertical Pod Autoscaler (GitHub)](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
