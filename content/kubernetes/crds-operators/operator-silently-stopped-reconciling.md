---
id: kubernetes-crds-operator-silently-stopped-reconciling-001
title: "Custom resources are being created and updated, but the operator managing them appears to have silently stopped reconciling — how do you diagnose it?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - operators
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A custom resource is updated (a spec change meant to trigger the operator to make a corresponding change to the real resources it manages), but nothing happens — the operator doesn't appear to react at all. The operator's pod shows `Running`. How do you diagnose why reconciliation has effectively stopped, when the operator itself doesn't look obviously crashed?

## Short Answer

Check the operator's own logs first for reconciliation activity and errors — a healthy-looking pod can still have a reconcile loop that's silently erroring out, stuck, or not receiving the events it should be, and the operator's logs (if it logs reconciliation attempts, which well-built operators do) are the most direct source for what's actually happening internally, rather than inferring from external symptoms alone.

## Detailed Explanation

A `Running` pod only confirms the process hasn't crashed — it says nothing about whether the reconcile loop is actually processing events, succeeding, or has silently entered a broken state (a panic recovered internally, a permanently-failing informer, a leader-election problem in a multi-replica operator deployment).

## Symptoms

- Custom resource spec changes don't produce the expected corresponding changes to real, managed resources.
- The operator's pod shows `Running` with no restarts.
- No obvious error is visible from the custom resource's own status/events at first glance.

## Possible Causes

- The operator is genuinely erroring on every reconcile attempt for this specific resource (a bug triggered by this particular spec value, a permissions issue reaching an external system) and is stuck in an error-backoff retry loop that isn't obviously visible without checking logs.
- In a multi-replica operator deployment using leader election, this specific replica isn't the current leader and therefore isn't reconciling anything at all — a healthy-looking non-leader replica doing nothing is expected behavior, not a bug, but can be confusing if leader status isn't checked.
- The operator's informer/watch connection to the API server has silently broken (a long-lived watch connection dying without the client detecting and re-establishing it correctly) so it's no longer receiving change notifications for this resource type at all.
- The operator's RBAC permissions were changed or revoked, and it can no longer read or write the resources it needs — this often produces an obvious error in logs, but only if you look.

## Investigation Steps

**Check the operator's own logs directly, specifically around the time of the spec change**: `kubectl logs -n <namespace> <operator-pod>` for reconciliation-related log lines matching the specific custom resource's name — a well-built operator logs each reconcile attempt (even successful, uneventful ones, often at a debug level) and definitely logs errors; the presence or absence of any log activity for this resource is directly informative.

**If the operator runs multiple replicas, confirm which one is the current leader**: many operators use Kubernetes leader election (visible via a Lease object, `kubectl get lease -n <operator-namespace>`) to ensure only one replica actively reconciles at a time — checking logs on a non-leader replica would show nothing happening, which is entirely expected, not a bug; the investigation needs to target the actual leader's logs specifically.

**Check the custom resource's own `status` and events for operator-reported state**: `kubectl describe <customresource> <name>` — a well-designed operator writes status conditions and events reflecting its own view of what happened during the last reconcile attempt (including errors) directly onto the custom resource object, which can be more directly informative than searching through the operator's own broader log stream.

**Check the operator's RBAC permissions against what it currently needs**: `kubectl auth can-i <verb> <resource> --as=system:serviceaccount:<ns>:<operator-sa>` for the specific resources/verbs the operator needs to reconcile — a recently-changed or accidentally-narrowed RBAC grant is a common, concrete cause that produces clear errors in logs once you know to look for them.

**Restart the operator pod as a diagnostic (not just a fix) step, if logs are inconclusive**: if the operator's informer/watch connection is silently broken, restarting the pod forces a fresh connection — if reconciliation resumes correctly after a restart, that's strong evidence the watch connection itself was the actual problem, which then becomes worth investigating as its own root cause (why did it break, is this a recurring pattern) rather than just accepting periodic restarts as the ongoing fix.

## Resolution

Fix follows from the identified cause: address the specific reconcile-time error (a bug fix, a permissions correction) if the operator is erroring per-attempt; confirm the correct leader replica is healthy if leader election was the source of confusion; restart the operator (and investigate the underlying watch-reliability issue) if a broken informer connection was the cause. Confirm resolution by making a small, deliberate spec change to the custom resource and directly observing (via logs and the resource's own status) that reconciliation genuinely processes it.

## Key Takeaways

- A `Running` operator pod only confirms the process hasn't crashed — it says nothing about whether reconciliation is actually succeeding or happening at all.
- Check operator logs directly for reconcile activity specific to the affected resource before assuming a broader, harder-to-diagnose cause.
- In a multi-replica operator using leader election, only the current leader reconciles — check leader status before concluding a non-leader replica's silence is a bug.
- A well-designed operator writes status conditions/events directly onto the custom resource, which can be a more direct diagnostic source than searching the operator's broader log stream.

## Interview Follow-Up Questions

- How would you design an operator's own health/liveness checks to detect and recover from a silently-broken informer connection automatically, rather than requiring manual restart?
- What would you add to an operator's own observability (metrics, structured logs) to make this exact class of "silently stopped reconciling" problem faster to diagnose in the future?
- How would you test an operator's leader-election failover behavior deliberately, before relying on it in production?

## References

- [Kubernetes: Controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Kubernetes: Leases](https://kubernetes.io/docs/concepts/architecture/leases/)
