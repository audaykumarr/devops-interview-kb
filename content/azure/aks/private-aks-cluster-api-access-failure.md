---
id: azure-aks-private-cluster-api-access-failure-001
title: "A team converted their AKS cluster to a private cluster for security reasons. The next day, several engineers and a CI/CD pipeline can no longer run kubectl commands at all. How do you diagnose this?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - azure
  - aks
  - private-cluster
  - dns
  - networking
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A team converted an existing AKS cluster to a private cluster to remove the API server's public endpoint, for good security reasons. The next day, several engineers and a CI/CD pipeline that both worked fine before the change can no longer run any `kubectl` command — not a permissions error, but connections that simply fail to resolve or time out. How do you diagnose this?

## Short Answer

A private AKS cluster's API server is only reachable through Azure Private Link, and its FQDN only resolves via a private DNS zone linked to the VNet — any client that isn't on a network with access to that private DNS zone (or a network path to the private endpoint) will fail to even resolve the API server's address, let alone connect. This is almost always a DNS resolution or network reachability problem, not an authentication or RBAC problem, and the fix is ensuring every legitimate client either runs inside a connected network or resolves through the private DNS zone correctly.

## Detailed Explanation

Making a cluster private doesn't just remove a public IP — it fundamentally changes how the API server's address is resolved and reached, and any client relying on the old public path breaks in a specific, diagnosable way rather than randomly.

## Symptoms

- `kubectl` commands fail with a connection timeout or DNS resolution failure, not an authentication or authorization error.
- The failure affects clients uniformly based on their network location — some clients (e.g., a jump box inside the VNet) may still work fine, which is itself a strong diagnostic clue.
- The cluster's control plane itself is healthy — pods are running and the workload is unaffected, only external API access is broken.

## Possible Causes

- **The client isn't on a network that can reach the private endpoint at all** — a private cluster's API server is only reachable from within the VNet, a peered VNet, or a network connected via VPN/ExpressRoute; an engineer's laptop or a cloud-hosted CI/CD runner outside that network boundary has no path to it.
- **DNS resolution for the API server's FQDN isn't working**, even for a client that does have network reachability — the private DNS zone associated with the cluster needs to be linked to whichever VNet the client is resolving from, and a client using a different DNS resolver (not pointed at Azure DNS with that private zone linked) will fail to resolve the address even with a valid network path.
- **A previously-used CI/CD pipeline is running on a hosted runner outside Azure entirely**, which has no route to the private endpoint at all regardless of DNS — this requires a self-hosted runner inside the VNet, or a different connectivity approach, not a DNS fix.

## Investigation Steps

**Attempt DNS resolution of the cluster's API server FQDN from an affected client**, using `nslookup` or `dig` — a resolution failure (not a connection timeout after successful resolution) points directly at the private DNS zone linkage rather than network routing.

**Confirm which VNets the cluster's private DNS zone is actually linked to**, via the Azure Portal or `az network private-dns link vnet list` — a client resolving through a VNet that isn't linked to this private DNS zone will never resolve the FQDN correctly, even if it otherwise has network connectivity.

**Test from a client known to be inside the correctly-connected network** (a VM in the same or peered VNet) — if that client succeeds where others fail, the problem is confirmed to be network/DNS boundary-related rather than an issue with the cluster or Azure AD authentication.

## Resolution

For engineers and services that need ongoing access, ensure they're on a network path that reaches the private endpoint (VPN, ExpressRoute, or a jump host inside the VNet) and resolving via a DNS path that has the private DNS zone linked. For CI/CD specifically, this typically means moving to a self-hosted runner deployed inside the VNet (or a peered network), since a cloud-hosted runner outside Azure's network boundary has no path to a private endpoint regardless of DNS configuration.

## Prevention

Before converting a cluster to private, inventory every client that currently accesses it — engineers, CI/CD runners, any external tooling — and confirm each one's network path and DNS resolution story *before* the cutover, rather than discovering the gaps the day after. Document the private DNS zone's VNet links as part of the cluster's own configuration record, so future network changes don't silently break access again.

## Key Takeaways

- A private AKS cluster's API server is reachable only via Private Link, and its FQDN resolves only through a private DNS zone linked to specific VNets — this is a DNS and network-boundary problem, not an auth problem.
- The specific failure mode (resolution failure or connection timeout, not an auth error) is the fastest way to distinguish this class of problem from an RBAC or credential issue.
- A cloud-hosted CI/CD runner outside Azure's network has no path to a private endpoint at all — the fix there is a self-hosted runner inside the network, not a DNS change.
- Converting a cluster to private requires inventorying every existing client's network path beforehand — this is an access-migration project, not a single toggle.

## Interview Follow-Up Questions

- How would you design CI/CD access to a private AKS cluster for a team using a fully cloud-hosted pipeline provider with no existing presence in the VNet?
- What would you check if DNS resolution succeeds but the connection still times out?
- How would you audit, ahead of time, every existing client accessing a cluster before converting it to private?

## References

- [AKS: Create a private AKS cluster](https://learn.microsoft.com/en-us/azure/aks/private-clusters)
