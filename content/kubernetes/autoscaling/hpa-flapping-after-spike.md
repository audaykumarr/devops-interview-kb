---
id: kubernetes-autoscaling-hpa-flapping-after-spike-001
title: "An HPA scales up rapidly during a spike, then flaps up and down repeatedly for the next hour — what's causing it, and how do you fix it?"
category: kubernetes
subcategory: autoscaling
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - hpa
  - autoscaling
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A traffic spike causes an HPA to scale a Deployment from 5 to 20 replicas quickly, which is correct behavior. But for the next hour, `kubectl get hpa` shows the replica count repeatedly climbing and dropping — 20, 12, 18, 10, 16 — long after the original spike has passed and traffic has actually stabilized. What's causing this oscillation, and how do you fix it?

## Short Answer

This is almost always an insufficient (or absent) stabilization window, particularly on the scale-down side — the default 5-minute scale-down stabilization is meant to prevent exactly this, so flapping this persistent usually means `behavior.scaleDown.stabilizationWindowSeconds` was reduced or the metric itself is genuinely noisy at a timescale the averaging isn't smoothing out. The fix is widening the stabilization window and/or tuning scaling behavior policies to change the rate at which replicas can be added or removed per cycle.

## Detailed Explanation

HPA's stabilization windows exist specifically to prevent this class of oscillation — persistent flapping well past the original trigger usually means that protection is either misconfigured or being overwhelmed by a metric (or a self-inflicted feedback loop) it wasn't tuned to handle.

## Symptoms

- Replica count repeatedly increases and decreases over an extended period, well after the triggering traffic event has passed.
- Traffic/request metrics, if checked independently, show the load has actually stabilized — the flapping isn't a response to genuinely fluctuating real load.
- The pattern isn't a one-time overshoot-and-correct; it continues cyclically.

## Possible Causes

- `behavior.scaleDown.stabilizationWindowSeconds` was set too low (or removed from a default that would otherwise apply), so the HPA reacts to short-term dips in the metric rather than smoothing over a longer window.
- The underlying metric itself is genuinely noisy at a short timescale (a metric that swings significantly second-to-second even under stable real load), and the HPA's evaluation window isn't wide enough to average that noise out.
- Scaling down reduces replica count enough that the remaining pods' utilization spikes back up (because there are fewer of them handling the same load), immediately triggering another scale-up — a self-inflicted oscillation from scaling down too aggressively.

## Investigation Steps

**Check the HPA's current `behavior` configuration**: `kubectl get hpa <name> -o yaml` — specifically `spec.behavior.scaleDown.stabilizationWindowSeconds` (default 300s if unset) and `spec.behavior.scaleUp.stabilizationWindowSeconds` (default 0s) — a scale-down window that's been reduced from the default, or a scale-up window of 0 combined with a noisy metric, are the first things to check.

**Correlate the replica count changes against the raw metric values over the same period**: `kubectl get hpa <name> -w` (or scraping the underlying metric directly from Prometheus/metrics-server if available) shows whether the metric itself is genuinely oscillating or whether it's actually stable and the replica count is oscillating independently — these point to different causes (noisy metric vs. self-inflicted feedback loop).

**Check whether scale-down events are directly followed by scale-up events on a short delay**: if the pattern is specifically "scale down, then scale up again within a minute or two, repeated," this is consistent with the self-inflicted feedback loop — removing replicas increases per-pod load on the smaller remaining set enough to immediately cross the scale-up threshold again.

## Resolution

Increase `stabilizationWindowSeconds` for scale-down (and, if the metric is genuinely noisy, for scale-up too) to smooth over the noise or the self-inflicted feedback cycle — a longer window means the HPA uses the highest recommendation seen over that window for scale-down decisions, which specifically prevents dropping replicas prematurely. If the self-inflicted feedback loop is the cause, also consider tuning `scaleDown.policies` to limit how many replicas can be removed per evaluation cycle (rather than removing a large batch in one step, which is what creates the sudden per-pod load spike that triggers the next scale-up). Confirm the fix by watching the HPA's behavior across a similar future traffic event, since the original one-time trigger may have already passed.

## Key Takeaways

- Persistent flapping well after the original triggering event usually points to an insufficient stabilization window, especially on the scale-down side.
- Distinguish a genuinely noisy underlying metric from a self-inflicted feedback loop (scaling down triggers a per-pod load spike that immediately triggers scaling back up) — they need different fixes.
- Widening `stabilizationWindowSeconds` uses the highest recent recommendation for scale-down decisions, directly preventing premature replica removal.
- Limiting how many replicas can be removed per cycle (`scaleDown.policies`) prevents the sharp per-pod load spike that a large single scale-down step can cause.

## Interview Follow-Up Questions

- How would you choose the right stabilization window length for a workload with a genuinely fast, legitimate traffic ramp, without over-correcting into sluggish scaling?
- What's the relationship between this stabilization tuning and the multi-window burn-rate alerting approach used for SLO alerting?
- How would you distinguish, from monitoring alone, whether a given scale-down event was premature versus genuinely appropriate for the load at that moment?

## References

- [Kubernetes: Horizontal Pod Autoscaling — Support for Scaling Behavior](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#support-for-configurable-scaling-behavior)
