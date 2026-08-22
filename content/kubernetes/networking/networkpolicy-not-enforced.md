---
id: kubernetes-networking-networkpolicy-not-enforced-001
title: "A NetworkPolicy is applied but pods that should be blocked can still communicate — why might it not be enforced?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - networkpolicy
  - cni
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A NetworkPolicy is applied to a namespace, intended to block traffic between two sets of pods. `kubectl get networkpolicy` shows the object exists and looks correctly configured. Traffic between the pods it should be blocking still works. Why might the policy not actually be enforced?

## Short Answer

The single most common cause is that the cluster's CNI plugin doesn't implement NetworkPolicy enforcement at all — NetworkPolicy is a Kubernetes API object, but enforcing it is entirely the CNI plugin's responsibility, and not every CNI plugin does it (some, like a default flannel installation, silently accept the object without enforcing anything). The second most common cause is a selector mismatch that means the policy isn't actually being applied to the pods you think it is.

## Detailed Explanation

NetworkPolicy is a specification, not a mechanism — creating the object doesn't cause any enforcement to happen on its own. The Kubernetes API server stores it like any other object, but actually restricting traffic is entirely delegated to whatever CNI plugin the cluster uses, and this delegation is a genuinely common source of "the policy exists but does nothing" confusion.

## Symptoms

- A NetworkPolicy object exists and, on inspection, appears correctly scoped.
- Traffic the policy should block continues to flow between the affected pods.
- No error or warning is shown anywhere indicating the policy isn't being enforced.

## Possible Causes

- The cluster's CNI plugin doesn't support NetworkPolicy enforcement at all (a bare flannel installation is the classic example — it provides networking but not policy enforcement, unless paired with something like Calico specifically for the policy layer).
- The NetworkPolicy's `podSelector` (or the `namespaceSelector`/`podSelector` in its ingress/egress rules) doesn't actually match the pods intended — a label mismatch means the policy is technically active but not applied to the traffic being tested.
- A separate, broader NetworkPolicy (or the absence of any default-deny policy) means that even though this specific policy exists, its intended restriction isn't the only rule in effect, and other traffic paths remain open.

## Investigation Steps

**Confirm the CNI plugin actually supports NetworkPolicy enforcement**: identify which CNI plugin the cluster runs (`kubectl get pods -n kube-system` for CNI-related pods, or checking cluster provisioning config) and check that specific plugin's documentation for NetworkPolicy support — this is the first and most important thing to rule in or out, since if the plugin doesn't enforce policies at all, nothing else in the investigation matters until that's addressed.

**Verify the policy's `podSelector` actually matches the intended pods**: `kubectl get pods --show-labels -n <namespace>` compared against the NetworkPolicy's `spec.podSelector` — confirm the selector matches the pods you're actually testing against, since a policy targeting the wrong (or no) pods will exist and look valid while doing nothing for the traffic you're observing.

**Test enforcement with a known-good, minimal reproduction**: rather than debugging the original complex scenario directly, apply a simple default-deny-all NetworkPolicy to a test namespace and confirm basic pod-to-pod traffic is actually blocked — if even this minimal case doesn't enforce, that's conclusive evidence the CNI plugin itself isn't enforcing policies at all, isolating the problem from anything specific to the original policy's configuration.

**Check for any other NetworkPolicy objects that might interact**: `kubectl get networkpolicy -A` — NetworkPolicies are additive within a namespace (multiple policies can each independently allow traffic), so a separate, broader policy allowing the traffic you're trying to block could coexist with the one meant to restrict it, and both are in effect simultaneously.

## Resolution

If the CNI plugin doesn't support NetworkPolicy enforcement, the fix is a genuinely significant one — either migrating to a CNI plugin that does support it, or adding a policy-enforcement layer (like installing Calico specifically for policy enforcement alongside an existing non-policy-enforcing CNI, where that combination is supported). If it's a selector mismatch, correct the `podSelector`/`namespaceSelector` to actually target the intended pods. Confirm the fix with the same minimal-reproduction test used in the investigation, not just the original complex scenario, to isolate whether enforcement itself now works before re-testing the more complex intended policy.

## Key Takeaways

- NetworkPolicy is a specification the API server stores — actual enforcement is entirely delegated to the CNI plugin, and not every CNI plugin implements it.
- Test enforcement with a minimal default-deny reproduction first, to separate "the CNI doesn't enforce policies at all" from "this specific policy's selector doesn't match what I think it matches."
- NetworkPolicies are additive — a separate, broader policy can coexist with and undermine the intent of a more restrictive one.
- Confirming CNI plugin support for NetworkPolicy should happen before deep-diving into a specific policy's configuration, since it's a prerequisite that makes everything else moot if absent.

## Interview Follow-Up Questions

- How would you design NetworkPolicies for a namespace using a default-deny-all baseline, while still allowing necessary traffic?
- How would you audit an entire cluster to confirm NetworkPolicy enforcement is actually active, rather than assuming based on the CNI plugin's name?
- What's the migration path and risk profile for moving from a non-enforcing CNI plugin to one that does enforce NetworkPolicy, on an already-running production cluster?

## References

- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
