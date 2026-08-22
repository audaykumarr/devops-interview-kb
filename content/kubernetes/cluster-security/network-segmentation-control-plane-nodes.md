---
id: kubernetes-cluster-security-network-segmentation-control-plane-nodes-001
title: "How would you design network-level segmentation between the control plane and worker nodes, beyond what Kubernetes' own RBAC and NetworkPolicy provide?"
category: kubernetes
subcategory: cluster-security
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - architecture
tags:
  - kubernetes
  - network-security
  - hardening
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

RBAC controls who can call the Kubernetes API, and NetworkPolicy controls pod-to-pod traffic — neither one restricts network-level reachability *to* the control plane itself, or between the control plane and worker nodes at the infrastructure layer. How would you design that layer of network segmentation, and why does it matter given RBAC/NetworkPolicy already exist?

## Short Answer

RBAC and NetworkPolicy both operate *within* the Kubernetes API/pod-networking model — they assume a request or packet has already reached the relevant component and control what happens next. Network-level segmentation (firewall rules, security groups, VPC/subnet design) controls whether a request can even *reach* the API server, etcd, or kubelet ports in the first place, which is a genuinely separate, lower layer of defense — an attacker who can reach the API server's network address at all still has to get past RBAC, but an attacker who can't reach it at the network layer never gets that far.

## Requirements

- The control plane's API server, etcd, and kubelet ports should only be reachable from sources that genuinely need to reach them.
- This restriction should hold regardless of any application-layer misconfiguration (an RBAC mistake, a NetworkPolicy gap) — it's a separate, independent layer.
- The design should account for legitimate reachability needs (worker nodes to API server, control plane to kubelets) without over-restricting to the point of breaking normal cluster operation.

## Detailed Explanation

Defense in depth means no single layer is trusted to be the only thing standing between an attacker and a critical component — network segmentation is specifically the layer that holds even if RBAC or NetworkPolicy has a mistake in it, since it operates independently, beneath the Kubernetes API model entirely.

## Architecture

**Restrict API server reachability to only legitimate callers**: the API server needs to be reachable by worker node kubelets, by anyone administering the cluster, and by any external system genuinely needing API access (a CI/CD pipeline, for instance) — a security group or firewall rule allowing API server port access only from these specific, known source ranges (rather than `0.0.0.0/0`) is the foundational restriction, independent of whatever RBAC additionally governs once a request does arrive.

**etcd should never be reachable from outside the control plane at all**: etcd holds the cluster's entire state, unencrypted-in-transit-by-default in some configurations, and has no RBAC of its own in the Kubernetes sense — network-level restriction limiting etcd's port to only the control-plane nodes themselves (never worker nodes, never external sources) is critical, since etcd compromise is effectively total cluster compromise, and RBAC provides zero protection for direct etcd access, which bypasses the API server (and therefore RBAC) entirely.

**Kubelet ports should only be reachable from the control plane, not from arbitrary worker-to-worker or external traffic**: the kubelet API (covered in more detail elsewhere) should only need to be reached by the API server itself for normal cluster operation — restricting kubelet port reachability to only control-plane source addresses, via node-level firewall rules or security groups, closes off lateral movement paths an attacker on one compromised node might otherwise use to reach another node's kubelet directly.

**VPC/subnet design can place the control plane in a genuinely separate network segment**: for self-managed clusters, placing control-plane nodes in a dedicated subnet with its own, more restrictive security group/firewall rules (distinct from the worker node subnet) gives an additional structural separation — for managed Kubernetes offerings (EKS, GKE, AKS), the control plane is often already isolated by the provider, though the reachability of the API server endpoint itself (public vs. private endpoint configuration) remains a decision you do control and should configure deliberately.

**This layer is what holds even when application-layer controls have a gap**: RBAC misconfigurations happen (an overly broad ClusterRoleBinding), NetworkPolicy gaps happen (a missing default-deny rule) — network-level segmentation doesn't depend on either of those being correctly configured; it's an independent constraint that limits blast radius even when something else has already gone wrong.

## Trade-offs

Tighter network segmentation adds real operational complexity — legitimate access paths (an administrator needing API access from outside the expected source ranges, a new CI/CD system needing to reach the API server) need to be explicitly accounted for and added to the allowed source list, which is friction compared to a more permissive default. This friction is the deliberate cost of defense in depth; for a cluster with genuinely low risk tolerance (handling sensitive data, regulated environment), it's clearly worth it, while a low-stakes development cluster might reasonably accept more permissive defaults.

## Key Takeaways

- Network-level segmentation is a genuinely separate, lower layer than RBAC/NetworkPolicy — it controls whether a request can reach a component at all, independent of what happens once it arrives.
- etcd should never be network-reachable from outside the control plane — it has no RBAC of its own, and direct access bypasses the API server (and therefore RBAC) entirely.
- Kubelet port reachability restricted to only the control plane closes off a lateral-movement path an attacker on one compromised node could otherwise use against other nodes.
- This layer specifically holds even when RBAC or NetworkPolicy has a configuration gap, since it doesn't depend on either being correctly configured — it's independent defense in depth.

## Interview Follow-Up Questions

- How would you design this segmentation differently for a managed Kubernetes offering (where you don't control the control plane's own infrastructure) versus a self-managed cluster?
- What would you check to confirm your API server's public endpoint (if it has one) is actually restricted to the intended source ranges, rather than assuming based on configuration alone?
- How would you handle a legitimate need for a new external system to reach the API server, without simply widening the allowed source range to something overly broad?

## References

- [Kubernetes: Securing a Cluster](https://kubernetes.io/docs/tasks/administer-cluster/securing-a-cluster/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
