---
id: kubernetes-networking-service-routing-001
title: "You deploy a new version of a Kubernetes Deployment. The pods show Running and pass their readiness checks, but the Service in front of them stops routing traffic entirely. Where do you look?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - kubernetes
  - services
  - networking
  - endpoints
estimated_time_minutes: 10
companies: []
related_questions:
  - kubernetes-troubleshooting-crashloopbackoff-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You deploy a new version of a Kubernetes Deployment. `kubectl get pods` shows the new pods `Running`, and they pass their readiness probes. But the Service in front of them stops routing traffic entirely — requests just hang or connection-refuse. Where do you look?

## Short Answer

Check whether the Service's `selector` labels actually match the new pods' labels — a label change in the Deployment template (even one that looks cosmetic, like a version label used elsewhere) can silently break the match, leaving the Service with zero Endpoints even though every pod is healthy. Confirm with `kubectl get endpoints` before looking anywhere else, since a Service with no matching pods produces exactly this symptom regardless of how healthy the pods themselves are.

## Detailed Explanation

A Kubernetes Service doesn't route to pods directly — it routes to whatever's listed in its `Endpoints` (or `EndpointSlice`) object, which is populated automatically by matching the Service's `spec.selector` against pod labels, filtered further by pods that are Ready. "Pods are Running and passing readiness checks" rules out one half of that equation (readiness) but says nothing about the other half (label match) — a Service can be perfectly configured, and every pod perfectly healthy, and still have zero Endpoints if the labels simply don't line up.

This most commonly happens after a change that looks unrelated to networking: a new label added to the pod template for a tracking or version-pinning purpose, a label value that changed as part of an unrelated refactor, or a copy-pasted Deployment manifest where the `selector` was updated but the pod template's labels weren't (or vice versa). Kubernetes doesn't warn you when a Service's selector matches nothing — an empty Endpoints list is a completely valid, silent state.

It's worth distinguishing this from a related but different failure: if Endpoints *are* populated but traffic still isn't reaching pods, the more likely causes shift to `kube-proxy` not having synced the new rules yet (rare, but possible during high API server load or on certain CNI configurations), a NetworkPolicy blocking ingress to the pods that didn't exist before this deploy, or — for cross-namespace or cross-cluster setups — a DNS resolution issue for the Service name itself rather than routing to the Service's IP.

## Symptoms

- Requests to the Service hang, time out, or get connection-refused.
- `kubectl get pods` shows the target pods `Running` with readiness checks passing.
- The issue appeared immediately after a Deployment rollout.

## Possible Causes

- The Service's `spec.selector` no longer matches the new pods' labels (a label was added, removed, or changed on the pod template without updating the Service, or vice versa).
- Endpoints are populated, but a NetworkPolicy newly blocks ingress traffic to the pods.
- Endpoints are populated, but `kube-proxy` hasn't synced the updated rules on the node(s) handling traffic.
- The Service's `targetPort` doesn't match the container's actual listening port after a change to the container image or startup command.
- DNS resolution for the Service name is failing or stale, independent of the Service/Endpoints themselves being correct.

## Investigation Steps

1. `kubectl get endpoints <service-name>` (or `kubectl get endpointslices -l kubernetes.io/service-name=<service-name>`) to see whether any pod IPs are actually listed.
2. If Endpoints is empty, compare `kubectl get service <service-name> -o yaml` (`spec.selector`) against `kubectl get pods --show-labels` for the target pods to find the mismatch.
3. If Endpoints is populated but traffic still fails, check `kubectl get networkpolicy` in the namespace for anything that could block ingress to these pods.
4. Confirm the Service's `targetPort` matches the port the container is actually listening on (`kubectl exec` into a pod and check, or review the container's startup logs).
5. Test connectivity directly to a pod IP (bypassing the Service) to isolate whether the problem is in Service routing specifically or in the application itself.
6. Check DNS resolution for the Service name from within another pod, to rule out a DNS-layer issue.

## Commands

```bash
kubectl get endpoints my-service -n my-namespace
kubectl get service my-service -n my-namespace -o yaml
kubectl get pods -n my-namespace --show-labels
kubectl get networkpolicy -n my-namespace
kubectl run debug --rm -it --image=busybox -n my-namespace -- wget -qO- http://<pod-ip>:<port>
kubectl run debug --rm -it --image=busybox -n my-namespace -- nslookup my-service
```

## Resolution

If the selector/label mismatch is the cause, fix the Service's `selector` or the pod template's `labels` so they align again, then confirm `kubectl get endpoints` populates with the expected pod IPs. If a NetworkPolicy is the blocker, add an explicit allow rule for the traffic that needs to reach these pods rather than removing the policy wholesale. If it's a `targetPort` mismatch, correct the Service definition to match the container's actual listening port. Once fixed, re-verify end to end through the Service (not just via direct pod IP) to confirm the whole path works.

## Prevention

- Avoid selectors and label sets that are easy to accidentally diverge — keep the set of labels a Service selects on minimal and stable, separate from labels used for other purposes like tracking or cost allocation.
- Add a CI check or admission policy that flags a Service whose selector doesn't currently match any pod, since this is a purely mechanical check that doesn't need a human to notice.
- Alert on a Service having zero ready Endpoints for longer than a brief rollout window, rather than relying on user-facing errors to surface the problem.
- Document (or enforce via templating) the convention that Deployment `selector`/pod-template labels and any fronting Service's `selector` must be changed together, never independently.

## Interview Follow-Up Questions

- How does this failure mode differ between a ClusterIP Service and a Service fronted by an Ingress controller?
- How would you debug this differently if you were using a service mesh (e.g. Istio) instead of plain kube-proxy-based Services?
- What's the difference between Endpoints and EndpointSlices, and why did Kubernetes introduce the latter?

## Key Takeaways

- A Service routes to its Endpoints, not directly to pods — pod health is necessary but not sufficient for traffic to flow.
- `kubectl get endpoints` is the fastest way to distinguish "no matching pods" from "matching pods, but traffic still isn't getting through."
- Label mismatches are silent — Kubernetes doesn't warn when a Service's selector matches nothing.
- Once Endpoints are confirmed populated, shift the investigation to NetworkPolicy, port mismatches, or DNS rather than re-checking pod health.

## References

- [Kubernetes: Service](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Connecting Applications with Services](https://kubernetes.io/docs/tutorials/services/connect-applications-service/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
