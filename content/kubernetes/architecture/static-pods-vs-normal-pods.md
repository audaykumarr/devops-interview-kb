---
id: kubernetes-architecture-static-pods-vs-normal-pods-001
title: "What's the difference between a static pod and a normal pod, and why does the control plane often run as static pods?"
category: kubernetes
subcategory: architecture
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - static-pods
  - control-plane
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Inspecting a `kubeadm`-provisioned control-plane node, you find the API server, scheduler, and controller-manager all running as pods — but `kubectl get pods -n kube-system` shows them with unusual owner references, and they can't be deleted the normal way. What's a static pod, and why is this the mechanism used to run the control plane itself?

## Short Answer

A static pod is managed directly by the kubelet on a specific node, from manifest files in a local directory the kubelet watches (not through the API server/scheduler at all) — the kubelet creates a "mirror pod" in the API server so it's visible via `kubectl`, but the API server has no actual control over the static pod's lifecycle, which is exactly why deleting the mirror pod via `kubectl delete` doesn't actually remove it (the kubelet just recreates it from the local manifest). This bootstrapping independence is precisely why it's used for the control plane itself — the API server can't be responsible for scheduling and managing the very components (including itself) that need to exist before the API server is fully up and reachable.

## Detailed Explanation

**Static pods are defined by local files, not API objects, and are entirely kubelet-managed**: the kubelet on a given node watches a configured directory (commonly `/etc/kubernetes/manifests`) for pod manifest files — any manifest present there is run as a pod by that kubelet directly, with no scheduler decision, no API server object driving it, and no other control-plane component involved in creating or managing it.

**The "mirror pod" makes static pods visible via the normal API, without giving the API server actual control**: the kubelet creates a read-only mirror object in the API server so tools like `kubectl get pods` can see the static pod exists and inspect its status — but this mirror is just a reflection; changing or deleting it through the API server doesn't affect the real, kubelet-managed pod at all, which is why `kubectl delete pod` on a static pod's mirror just results in the kubelet recreating the mirror moments later, since the actual pod (driven by the local manifest file) never stopped.

**This solves a genuine chicken-and-egg bootstrapping problem for the control plane**: a normal pod requires the scheduler to assign it a node and the API server to persist its state — but the control plane's own components (including the API server itself) can't depend on a fully-functioning API server/scheduler existing yet, since they *are* what makes the API server exist in the first place. Static pods sidestep this entirely: the kubelet on a control-plane node can start the API server (and other control-plane components) directly from local manifest files, with zero dependency on the API server already being up.

**This is specifically how `kubeadm`-provisioned clusters run their control plane**: `kubeadm init` places API server, scheduler, controller-manager, and (in stacked topology) etcd manifests directly in `/etc/kubernetes/manifests` on control-plane nodes — the kubelet on each of those nodes picks them up and runs them as static pods, entirely independent of whether a functioning control plane exists anywhere yet at that moment. Managed Kubernetes offerings (EKS, GKE, AKS) often abstract this away entirely, running the control plane as infrastructure the cloud provider manages outside the visible cluster, but self-managed/`kubeadm` clusters make this mechanism directly visible.

**Static pods are occasionally used for other node-level bootstrapping needs beyond the control plane too**: any workload that genuinely needs to exist on a specific node independent of API server/scheduler availability (rare, but occasionally used for critical node-level infrastructure) can use the same mechanism — though this is uncommon outside the control-plane use case, since most workloads genuinely benefit from being scheduler-managed and API-server-visible in the normal way.

## Key Takeaways

- Static pods are defined by local manifest files the kubelet watches directly, with no scheduler or API server involvement in creating or managing them.
- The kubelet creates a read-only mirror pod in the API server for visibility, but modifying/deleting that mirror doesn't affect the real, kubelet-managed pod.
- This solves the control plane's own bootstrapping problem: control-plane components can't depend on a fully-working API server existing yet, since they're what makes it exist.
- `kubeadm`-provisioned clusters make this mechanism directly visible; managed cloud offerings typically abstract the control plane away entirely.

## Interview Follow-Up Questions

- How would you modify a running control-plane component's configuration (e.g., changing an API server flag) given it's managed as a static pod, not through a normal Deployment update?
- What happens to a static pod if the kubelet itself restarts or the node reboots — does the pod come back automatically?
- How would you troubleshoot a control-plane component that's failing to start as a static pod, given normal `kubectl describe pod` troubleshooting assumes API-server/scheduler involvement that doesn't apply here?

## References

- [Kubernetes: Static Pods](https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/)
