---
id: kubernetes-networking-cross-node-pod-connectivity-failure-001
title: "How would you troubleshoot connectivity that works within a node but fails between pods on different nodes?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - cni
  - networking
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Two pods can communicate perfectly fine when they happen to be scheduled on the same node, but the exact same connection attempt fails or times out when they land on different nodes. What does this symptom pattern point to, and how do you investigate it?

## Short Answer

Connectivity that works only within a node but fails across nodes points specifically at the CNI plugin's cross-node (overlay/routing) networking layer, since same-node connectivity typically only exercises the local bridge/veth setup, not the cross-node encapsulation or routing the CNI plugin is responsible for — check the CNI plugin's own pod health first, then look for an MTU mismatch, which is one of the most common specific causes of exactly this symptom pattern.

## Detailed Explanation

Same-node pod-to-pod traffic and cross-node pod-to-pod traffic take genuinely different paths through the networking stack — same-node traffic typically stays within the node's local bridge, while cross-node traffic has to traverse whatever the CNI plugin does for inter-node routing (an overlay network with encapsulation, or direct routing via BGP, depending on the plugin) — a fault isolated to exactly the cross-node path narrows the investigation to that specific layer.

## Symptoms

- Pod-to-pod connections succeed when both pods are scheduled on the same node.
- The identical connection attempt (same ports, same protocol) fails or times out when the pods are on different nodes.
- No application-level error explains the difference — from the application's perspective, it's just a network timeout.

## Possible Causes

- An MTU mismatch between the CNI plugin's overlay network and the underlying physical/cloud network — packets that fit within the overlay's expected MTU exceed what the actual underlying network path supports, causing fragmentation issues or silent drops specifically for larger packets, which often manifests as small requests working but larger payloads failing intermittently.
- The CNI plugin's cross-node component (an overlay tunnel endpoint, a routing daemon) is unhealthy or misconfigured on one or both of the specific nodes involved.
- A firewall or security group rule allows traffic within a node's local network but blocks the specific protocol/port used for the CNI's inter-node encapsulation (common when a cloud security group is configured without accounting for the CNI's actual network requirements).
- Node-to-node connectivity itself is broken at the underlying infrastructure level, unrelated to Kubernetes at all.

## Investigation Steps

**Confirm the pattern is genuinely same-node-works/cross-node-fails, not something else that looks similar**: deliberately schedule test pods (using `nodeSelector` or `nodeName`) onto specific node pairs to confirm the pattern reproducibly, rather than relying on incidental scheduling — this rules out a coincidental, unrelated cause that happened to correlate with node placement.

**Check the CNI plugin's own pod health across the specific nodes involved**: `kubectl get pods -n kube-system -o wide` for the CNI plugin's DaemonSet pods — confirm the CNI pod on *each* of the two nodes involved in the failing test is healthy, since a CNI pod issue on just one of the two nodes would produce exactly this asymmetric-seeming symptom.

**Test raw node-to-node connectivity, bypassing pod networking entirely**: from one node, attempt to reach the other node's IP directly (not through pod networking) — if even this fails, the problem is at the underlying infrastructure level, not Kubernetes/CNI-specific, and the investigation shifts entirely to network/infrastructure troubleshooting (firewall rules, VPC routing, security groups).

**Check for an MTU mismatch specifically**: compare the CNI plugin's configured overlay MTU against the actual underlying network's MTU (particularly relevant in cloud environments, or when running over a VPN/tunnel with a reduced MTU) — testing with a smaller payload size (or explicitly setting a smaller MTU packet with `ping -s` and the don't-fragment flag) to see if smaller packets succeed while larger ones fail is a direct, practical way to confirm this specific cause.

**Check firewall/security group rules covering the CNI's specific inter-node protocol**: different CNI plugins use different protocols/ports for their overlay (VXLAN typically uses UDP port 4789, for instance) — confirming the relevant security group or firewall rule actually permits this specific traffic between nodes (not just general node-to-node connectivity) catches a common cloud-infrastructure misconfiguration.

## Resolution

If it's an MTU mismatch, correct the CNI plugin's configured MTU to match what the underlying network path actually supports (often requiring a slightly smaller MTU than the physical network's maximum, to account for the overlay's own encapsulation overhead). If it's a CNI pod health issue on a specific node, restart/investigate that pod directly. If it's a firewall/security group gap, add the specific rule needed for the CNI's inter-node protocol. Confirm the fix with the same reproducible cross-node test pod pair used during investigation.

## Key Takeaways

- Same-node-works/cross-node-fails is a specific, informative pattern pointing at the CNI plugin's cross-node (overlay/routing) layer, distinct from local bridge networking.
- MTU mismatches between the CNI overlay and the underlying network are a common cause, often manifesting as small requests working while larger payloads fail.
- Test raw node-to-node connectivity (bypassing pod networking) early, to distinguish an underlying infrastructure problem from a CNI-specific one.
- Different CNI plugins use different specific protocols/ports for inter-node traffic — confirm firewall/security group rules cover the actual protocol in use, not just general connectivity.

## Interview Follow-Up Questions

- How would you determine the correct MTU value to configure for a CNI overlay running on top of a specific cloud provider's network, or a VPN-connected environment?
- What tools would you use to verify a CNI plugin is functioning correctly versus a Service/Endpoints misconfiguration, given both can produce connectivity symptoms?
- How would you design a proactive, recurring check that specifically tests cross-node pod connectivity, to catch this class of issue before an application team reports it?

## References

- [Kubernetes: Cluster Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [Kubernetes: Network Plugins](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
