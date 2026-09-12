---
id: azure-aks-cni-vs-kubenet-001
title: "You're standing up a new AKS cluster and need to choose a network plugin: Azure CNI or kubenet. What's the actual trade-off, and why can this decision be hard to reverse later?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
difficulty: intermediate
question_type:
  - comparison
  - architecture
tags:
  - azure
  - aks
  - networking
  - cni
  - vnet
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A team is standing up a new AKS cluster and has to choose a network plugin: Azure CNI or kubenet. What's the actual trade-off between them, and why is this specifically a decision worth getting right up front rather than adjusting later?

## Short Answer

Azure CNI assigns every pod a routable IP address directly from the VNet subnet, which makes pods natively reachable from the rest of the VNet (and peered networks) but consumes real, planned IP address space per node based on how many pods it can run. Kubenet assigns pods IPs from a separate, internal address space and routes traffic via user-defined routes and NAT, which conserves VNet IP space but adds an extra routing hop and doesn't give pods a directly VNet-routable identity. The decision is hard to reverse because it's set at cluster creation and changing it means rebuilding the cluster, and it directly determines how much VNet address space you need to have planned out per node.

## Detailed Explanation

This isn't a generic "which CNI plugin" question — it's specifically about the two officially-supported AKS network modes and the VNet IP-planning consequence that follows from each, which is a genuinely Azure-specific operational trade-off, not a general Kubernetes networking concept.

## Requirements

- Decide whether pods need to be directly reachable from other resources in the VNet (or peered VNets/on-premises via ExpressRoute/VPN) without an extra network hop.
- Determine how much VNet address space is actually available to dedicate to the cluster, since Azure CNI's IP consumption scales with maximum pods per node, not just node count.
- Account for future cluster growth — scaling node count or pods-per-node under Azure CNI needs address space reserved for that growth from day one.

## Architecture

**Azure CNI** allocates a block of IP addresses from the VNet subnet to each node, sized to support its configured maximum pods per node — every pod gets a real, VNet-routable IP. This makes pod-to-VNet-resource connectivity and VNet peering/on-premises connectivity work natively, at the cost of needing a subnet sized for `(nodes × max-pods-per-node)`, which for large clusters can require a surprisingly large address block planned in advance.

**Kubenet** assigns pods IPs from a separate address space not drawn from the VNet subnet, and uses Azure's route tables (or the newer more efficient path via Azure CNI Overlay, a hybrid option) to route pod traffic between nodes, with NAT for pod-to-VNet-resource traffic. This conserves VNet address space significantly, but pods aren't directly addressable from outside the cluster the way Azure CNI's are, and route-table-based routing has practical scale limits (a route table entry per node).

**The decision is effectively locked in at cluster creation** — the network plugin isn't something you switch on a live cluster; changing it means creating a new cluster and migrating workloads, which is real, disruptive work rather than a configuration toggle.

## Trade-offs

- Azure CNI: native VNet routability and simpler connectivity to other Azure resources and on-premises networks, at the cost of real, carefully-planned IP address consumption that scales with pods-per-node, not just node count.
- Kubenet: conserves VNet address space, but adds a routing layer, doesn't give pods direct VNet identity, and route-table-based scaling has practical node-count limits.
- Azure CNI Overlay (where applicable) narrows this trade-off by decoupling pod IPs from the VNet while keeping CNI's networking model, but it's a distinct, newer option with its own constraints, not a strict replacement for either classic mode.

## Key Takeaways

- Azure CNI gives pods real VNet IP addresses; kubenet gives pods a separate address space reached via routing and NAT — this is the core trade-off, not just a naming difference.
- Azure CNI's IP consumption scales with maximum pods per node across every node, which can require a much larger subnet than node count alone suggests.
- The network plugin choice is set at cluster creation and isn't changeable in place — get the VNet planning right before the cluster exists, not after.
- The right choice depends on whether pods genuinely need direct VNet/on-premises reachability, not on which plugin sounds more "native."

## Interview Follow-Up Questions

- How would you calculate the exact subnet size needed for a planned Azure CNI cluster, given expected node count and max pods per node?
- What would push you toward Azure CNI Overlay instead of either classic mode?
- How would you migrate an existing kubenet cluster's workloads to a new Azure CNI cluster with minimal downtime?

## References

- [AKS: Configure Azure CNI networking](https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni)
- [AKS: Configure kubenet networking](https://learn.microsoft.com/en-us/azure/aks/configure-kubenet)
