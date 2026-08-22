---
id: kubernetes-workloads-new-pods-scheduled-then-immediately-evicted-001
title: "A Deployment's new pods keep getting scheduled but immediately evicted, while old pods keep running fine — what changed?"
category: kubernetes
subcategory: workloads
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - deployments
  - resource-management
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

During a routine deployment, new-version pods are being successfully scheduled onto nodes, but get evicted almost immediately afterward — while the old-version pods, already running on those same nodes, continue running without issue. No code change was made to resource usage intentionally. What's actually different about the new pods that would cause this?

## Short Answer

Compare the new and old pod specs' resource `requests`/`limits` directly — the most common cause is that the new manifest (via a Helm value change, a copy-pasted spec, or a well-intentioned "bump the limits" PR) increased resource requests enough that, combined with what's already running on the node, the node now qualifies for eviction under memory/disk pressure once the new pod is counted, even though the old pod at its smaller request size didn't trigger it.

## Detailed Explanation

Eviction (as distinct from `OOMKilled`, which is a container-level kernel action) is the kubelet's own decision to remove pods from a node under resource pressure, prioritized by QoS class and how much a pod is exceeding its requests — a spec change that alters a pod's resource footprint or QoS class can make it a much more likely eviction target than the version it's replacing, even without the application itself using meaningfully more resources.

## Symptoms

- New-version pods reach `Running` briefly, then are evicted (visible as `Evicted` status, distinct from `CrashLoopBackOff` or `OOMKilled`).
- Old-version pods on the same nodes continue running without eviction.
- The rollout makes no forward progress, cycling through evicted new pods.

## Possible Causes

- The new pod spec's resource `requests` increased (deliberately or accidentally) enough to push the node into memory or disk pressure once combined with other pods already running there.
- The new pod's QoS class changed (e.g., from `Guaranteed` to `Burstable` or `BestEffort` due to a `requests`/`limits` mismatch introduced in the new spec), making it a higher-priority eviction target under the kubelet's QoS-based eviction ordering.
- The node itself is already close to a resource-pressure threshold, and the new pod's slightly larger footprint is just enough to tip it over — a resource margin problem, not solely a spec problem.

## Investigation Steps

**Confirm it's eviction, not `OOMKilled` or a crash**: `kubectl get pod <pod>` showing `Evicted` status (or `kubectl describe pod` showing an eviction-related message under Status) distinguishes this from a container-level OOM kill or an application crash — these have different causes and different fixes, so confirming which one is actually happening is the first step.

**Diff the resource requests/limits between old and new pod specs**: `kubectl get deployment <name> -o yaml` (current) versus the previous version's manifest in Git — a change to `resources.requests.memory` or `resources.requests.cpu` is the most direct thing to check, since eviction decisions are driven by requests relative to actual node capacity and usage, not just limits.

**Check the node's resource pressure conditions directly**: `kubectl describe node <node>` shows `Conditions` like `MemoryPressure`/`DiskPressure` — if the node is already under pressure, that context matters for understanding why a seemingly modest increase in the new pod's footprint was enough to trigger eviction.

**Compare the QoS class of old versus new pods**: `kubectl get pod <pod> -o jsonpath='{.status.qosClass}'` for both — a change in QoS class (caused by the new spec setting `limits` without matching `requests`, or vice versa) directly affects eviction priority ordering, independent of the raw resource numbers.

## Resolution

If the new spec's resource requests genuinely increased beyond what the node/cluster can accommodate, either reduce them back to a justified level or ensure the cluster has adequate spare capacity (more nodes, or cluster autoscaler headroom) before the rollout. If a QoS class change was accidental (a `limits`/`requests` mismatch introduced unintentionally), align them back to the prior, intended QoS class. Confirm the fix by watching the rollout actually reach `Available` with all new pods staying `Running`, not just briefly reaching `Running` before eviction again.

## Key Takeaways

- Eviction is the kubelet's own resource-pressure response, distinct from `OOMKilled` — confirm which one is actually happening before investigating further.
- A resource request increase in the new pod spec, even a seemingly modest one, can be enough to trigger eviction if the node is already near a pressure threshold.
- A QoS class change (from a `requests`/`limits` mismatch introduced in the new spec) affects eviction priority independent of the raw resource numbers.
- Confirm resolution by watching the rollout stay stable, not just reach `Running` once, since a marginal resource situation can cause repeated cycles of scheduling and eviction.

## Interview Follow-Up Questions

- How does Kubernetes' Guaranteed QoS class (requests equal to limits) change both the scheduling and eviction behavior discussed here?
- How would you set up alerting to catch a resource-request regression in a new deployment before it reaches production, rather than during the rollout itself?
- What's the relationship between a node's `--eviction-hard` kubelet configuration and this eviction behavior — how would you tune it?

## References

- [Kubernetes: Node-pressure Eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/)
- [Kubernetes: Pod Quality of Service Classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
