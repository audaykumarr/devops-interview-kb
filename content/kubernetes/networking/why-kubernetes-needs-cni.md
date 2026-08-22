---
id: kubernetes-networking-why-kubernetes-needs-cni-001
title: "Why does Kubernetes require a CNI plugin at all — what job does it do that kube-proxy doesn't?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: beginner
question_type:
  - conceptual
tags:
  - kubernetes
  - cni
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Kubernetes ships kube-proxy for Service networking, but still requires a separately-installed CNI plugin for the cluster to have any pod networking at all. Why doesn't Kubernetes handle pod networking itself the way it handles Services, and what specifically does the CNI plugin do that kube-proxy doesn't?

## Short Answer

CNI (Container Network Interface) plugins are responsible for actually giving each pod a network identity — assigning it an IP address and wiring up the low-level networking (virtual interfaces, routing) that makes that IP reachable, both from other pods on the same node and across nodes. kube-proxy operates at a completely different layer: it implements Service abstraction (virtual IPs, load balancing to backend pods) assuming pod-to-pod networking already works — it has no role in actually establishing basic pod connectivity in the first place.

## Detailed Explanation

**CNI's job: give every pod a working IP address and basic connectivity**: when a pod is scheduled, the kubelet invokes the configured CNI plugin to set up that pod's network namespace — allocating an IP address from the cluster's pod CIDR range, creating a virtual network interface, and configuring routing so that IP is actually reachable from other pods (on the same node via a local bridge, and across nodes via whatever mechanism the specific CNI plugin uses — an overlay network with encapsulation, or direct BGP-based routing). Without this, a pod would have no network connectivity at all.

**kube-proxy's job: implement the Service abstraction on top of already-working pod networking**: kube-proxy watches Services and Endpoints/EndpointSlices, and programs each node's networking rules (iptables, IPVS, or nftables depending on mode) so that traffic to a Service's virtual ClusterIP gets load-balanced to one of the actual backing pod IPs — this is a layer built entirely on top of the assumption that pod IPs are already real, working, routable addresses, which is exactly what the CNI plugin is responsible for providing.

**Kubernetes deliberately delegates pod networking to a pluggable interface, rather than building it in**: the CNI specification exists precisely so Kubernetes doesn't have to pick one specific networking implementation — different environments have very different networking requirements (a bare-metal on-prem cluster, a cloud VPC-integrated setup, a cluster needing specific NetworkPolicy enforcement or performance characteristics), and CNI's plugin model lets each cluster choose the implementation (Calico, Cilium, flannel, cloud-provider-specific plugins) that fits its actual environment and requirements.

**Without a working CNI plugin, kube-proxy has nothing to load-balance to at all**: this dependency ordering matters conceptually — kube-proxy's Service abstraction is meaningless without pods actually having reachable IPs first, which is exactly why a cluster with a broken or missing CNI plugin shows pods stuck in a non-ready networking state, with Service-level symptoms being a downstream consequence rather than the root layer to investigate first.

**Some CNI plugins additionally provide NetworkPolicy enforcement, which is a separate, optional responsibility layered on top of basic connectivity**: providing basic pod networking (an IP address and connectivity) and enforcing NetworkPolicy restrictions are two distinct capabilities a CNI plugin can implement — some plugins do both, some (like a bare flannel installation) only provide the former, which is exactly why "NetworkPolicy exists but isn't enforced" is a real, common gap tied specifically to which CNI plugin is in use.

## Key Takeaways

- CNI plugins are responsible for giving pods actual working network identity (IP allocation, routing) — the foundational layer of pod networking.
- kube-proxy implements the Service abstraction (virtual IPs, load balancing) on top of already-working pod networking — it has no role in establishing basic pod connectivity itself.
- Kubernetes delegates pod networking to the pluggable CNI interface deliberately, since different environments have genuinely different networking needs and constraints.
- Basic connectivity and NetworkPolicy enforcement are separate CNI plugin responsibilities — not every plugin implements both.

## Interview Follow-Up Questions

- How would you troubleshoot a cluster where pods are stuck in a non-Ready state specifically due to networking, before Services or kube-proxy even become relevant to the investigation?
- What's the difference between an overlay-network CNI plugin (like flannel's VXLAN mode) and a BGP-based direct-routing plugin (like Calico in BGP mode), in terms of how cross-node connectivity actually works?
- How would you migrate a cluster from one CNI plugin to another without a full cluster rebuild — what's actually risky about it?

## References

- [Kubernetes: Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Container Network Interface (CNI) Specification](https://github.com/containernetworking/cni)
