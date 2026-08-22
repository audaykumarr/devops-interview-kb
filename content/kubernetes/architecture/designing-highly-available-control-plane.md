---
id: kubernetes-architecture-designing-ha-control-plane-001
title: "How would you design a highly-available control plane, and what breaks with only one control-plane node?"
category: kubernetes
subcategory: architecture
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - architecture
tags:
  - kubernetes
  - control-plane
  - high-availability
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A cluster currently runs a single control-plane node. It works fine day-to-day, but represents an obvious single point of failure. How would you design a genuinely highly-available control plane, and what specifically stops working if the single control-plane node goes down in the current setup?

## Short Answer

Run at least three control-plane nodes, each running its own API server, scheduler, and controller-manager, backed by a single etcd cluster stretched across (typically) those same three nodes for quorum — with a load balancer in front of the API server replicas so clients (kubelet, `kubectl`, other components) aren't tied to any single node. With only one control-plane node, that node's failure takes down the API server, scheduler, controller-manager, and etcd simultaneously — the entire control plane, with the same "existing pods keep running, nothing new can happen" consequence as an etcd-specific outage, but total rather than partial.

## Detailed Explanation

The single-node setup's risk isn't abstract — every control-plane component happens to be co-located on that one node, so its failure is a simultaneous failure of all of them at once. A highly-available design has to eliminate that co-location as a single point of failure across every layer (API server, scheduler, controller-manager, and etcd) simultaneously, not just one of them.

## Requirements

- No single node failure should make the cluster's control plane fully unavailable.
- The control plane's data layer (etcd) must maintain quorum and data integrity through a single node failure.
- Clients (kubelet, `kubectl`, CI/CD pipelines) must be able to keep reaching a healthy API server without manual reconfiguration when one node fails.

## Architecture

**Run an odd number of control-plane nodes, minimum three, for etcd quorum**: etcd uses Raft consensus, which requires a majority (quorum) of members to agree before committing a write — three nodes tolerate one failure while maintaining quorum (2 of 3 still available); an odd number is specifically chosen because it maximizes fault tolerance per node added (five nodes tolerate two failures, but four nodes still only tolerate one, wasting the fourth node's fault-tolerance potential).

**Each control-plane node runs its own full set of control-plane components**: API server, scheduler, and controller-manager typically run on every control-plane node (not just etcd) — API server replicas are all active simultaneously (stateless, so any can serve any request), while scheduler and controller-manager use leader election, with only one active leader at a time per component and the others on standby, ready to take over if the leader fails.

**A load balancer in front of the API server replicas provides a single, stable endpoint**: since there are multiple API server replicas, clients need a way to reach "a healthy one" without hardcoding a specific node — a load balancer (cloud-provided, or a self-managed one like HAProxy/keepalived for on-prem) distributes requests across the healthy API server replicas and removes an unhealthy one from rotation, giving every client (including kubelets on worker nodes) one stable address to depend on regardless of which specific control-plane node is currently healthy.

**etcd typically runs co-located with the control-plane nodes, though it can be run separately**: running etcd on the same nodes as the API server (stacked topology) is simpler operationally and is what most managed Kubernetes offerings and standard `kubeadm` setups do by default; running etcd on entirely separate, dedicated nodes (external topology) isolates etcd's resource needs from the rest of the control plane and allows independently scaling etcd's node count from the API server's, at the cost of more infrastructure to manage.

**With a single control-plane node, every one of these components is a single point of failure simultaneously**: the single node running API server, scheduler, controller-manager, and etcd all together means its failure isn't just an etcd-style "no new operations" degradation — the API server itself becomes unreachable too, meaning even attempts to diagnose or manually intervene through `kubectl` also fail, since there's no load balancer routing to a healthy alternative because none exists.

## Trade-offs

Running three (or more) control-plane nodes means more infrastructure cost and more operational complexity (etcd's own health, quorum, and backup strategy now spans multiple nodes that all need to stay in sync) compared to a single node — this is the necessary cost of the actual availability guarantee, and for any cluster where control-plane downtime has a real business impact, it's a worthwhile one. For genuinely non-production or throwaway clusters, a single control-plane node's simplicity may be an acceptable trade-off.

## Key Takeaways

- A minimum of three control-plane nodes is standard, specifically to give etcd's Raft consensus quorum tolerance for one node's failure.
- An odd number of nodes maximizes fault tolerance per additional node — four nodes provide no more tolerance than three.
- API server replicas are all active simultaneously; scheduler and controller-manager use leader election with one active leader and standbys.
- With a single control-plane node, its failure takes down the entire control plane at once (API server included), unlike a distributed etcd-specific outage where at least a load-balanced healthy API server replica might otherwise remain reachable.

## Interview Follow-Up Questions

- How does etcd's quorum requirement affect how many control-plane nodes you should run, and why is an even number a bad choice?
- What's the difference between stacked and external etcd topology, and when would you choose one over the other?
- How would you design the load balancer in front of the API server itself to be highly available, avoiding it becoming a new single point of failure?

## References

- [Kubernetes: Options for Highly Available Topology](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/)
- [etcd: Documentation](https://etcd.io/docs/latest/)
