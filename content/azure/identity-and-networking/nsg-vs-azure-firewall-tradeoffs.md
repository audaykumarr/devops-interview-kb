---
id: azure-identity-networking-nsg-vs-firewall-001
title: "You need to control outbound traffic from a VNet, including blocking access to specific malicious domains and inspecting traffic content. Are Network Security Groups sufficient, or do you need Azure Firewall?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
difficulty: intermediate
question_type:
  - comparison
tags:
  - azure
  - networking
  - firewall
  - nsg
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You need to control outbound network traffic from a VNet — including blocking access to specific malicious or disallowed domains by name, and potentially inspecting traffic content for threats. Are Network Security Groups (NSGs) sufficient for this, or do you need Azure Firewall? What's the actual capability difference?

## Short Answer

NSGs filter traffic based on IP address, port, and protocol at Layer 3/4 — they have no concept of domain names or application-layer content, so blocking traffic "to this specific domain" or inspecting payload content is structurally outside what an NSG can do. Azure Firewall (and similar Layer 7-aware tools) operates at the application layer, supporting FQDN-based filtering, threat intelligence-based blocking, and deep packet inspection — the capability you actually need for domain-based and content-aware traffic control, which NSGs were never designed to provide.

## Detailed Explanation

The distinction mirrors the general Layer 4 versus Layer 7 networking comparison, applied specifically to Azure's traffic-filtering tools — NSGs and Azure Firewall aren't competing options doing the same job at different price points; they operate at fundamentally different layers with genuinely different capabilities.

**NSGs are Layer 3/4 stateful packet filters**: rules are defined in terms of source/destination IP address ranges, ports, and protocol — an NSG can allow or deny traffic to a specific IP address or range, but has no visibility into or understanding of what domain name a connection is actually destined for, since DNS resolution and the domain name itself aren't part of what a Layer 3/4 filter inspects at all. Blocking "traffic to badsite.example.com" isn't expressible in NSG rules directly, since NSGs only see the resolved IP address, which for many services (especially cloud-hosted ones using CDNs or dynamic IP allocation) changes frequently and isn't a stable thing to filter on anyway.

**Azure Firewall operates at Layer 7, understanding application-layer context including domain names**: it supports FQDN-based filtering rules (allow/deny traffic to specific domain names, resolving and tracking them dynamically rather than requiring a static, stable IP to filter on), threat intelligence-based filtering (blocking traffic to and from IP addresses/domains known to be associated with malicious activity, using Microsoft's own threat intelligence feed), and deeper application-layer inspection than an NSG can provide.

**NSGs are free and simple, appropriate for basic network segmentation**: since NSGs are a core, no-additional-cost Azure networking primitive, they're the right tool for straightforward Layer 3/4 segmentation needs — restricting which subnets/resources can talk to which others, basic port/protocol restrictions — where domain-based or content-aware filtering genuinely isn't required.

**Azure Firewall has real cost and is the right tool specifically when Layer 7 awareness is actually needed**: it's a managed, more expensive service specifically justified when the actual requirement (domain-based filtering, threat intelligence, deeper inspection) genuinely exceeds what Layer 3/4 filtering can provide — using it as a blanket replacement for NSGs everywhere, when the actual filtering need is just basic IP/port restriction, is unnecessary cost and complexity for capability you're not actually using.

**Layered use is common and often the right architecture**: NSGs providing basic network segmentation at the subnet/NIC level, combined with Azure Firewall specifically for centralized, domain-aware egress filtering and threat intelligence — this mirrors the same "use each tool where it's actually the right layer" reasoning as the general Layer 4/Layer 7 load balancing comparison, applied here to traffic filtering instead of load distribution.

## Key Takeaways

- NSGs filter at Layer 3/4 (IP address, port, protocol) — they have no concept of domain names or application-layer content, making domain-based filtering structurally outside their capability.
- Azure Firewall operates at Layer 7, supporting FQDN-based filtering, threat intelligence integration, and deeper application-layer inspection — the actual tool needed for the described requirement.
- NSGs are free and appropriate for basic Layer 3/4 network segmentation; Azure Firewall has real cost, justified specifically when Layer 7 awareness is genuinely needed.
- Layered use (NSGs for basic segmentation, Azure Firewall for centralized domain-aware egress control) is common and generally the right architecture, rather than choosing one exclusively.

## Interview Follow-Up Questions

- How would you design egress filtering for a large VNet to balance the cost of Azure Firewall against the specific domains/traffic that genuinely need Layer 7 filtering?
- What's the difference between Azure Firewall's threat intelligence mode set to "Alert" versus "Alert and Deny," and when would you choose each?
- How would you monitor and audit Azure Firewall's logs to understand what traffic is actually being blocked and why?

## References

- [Azure Docs: Network security groups](https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)
- [Azure Docs: Azure Firewall features](https://learn.microsoft.com/en-us/azure/firewall/features)
