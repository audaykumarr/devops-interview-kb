---
id: azure-storage-firewall-blocking-trusted-service-001
title: "A storage account's firewall was locked down to specific VNets for security, and now diagnostic logging and a few other first-party Azure integrations silently stopped working. What's actually happening?"
category: azure
subcategory: storage
technologies:
  - azure
  - blob-storage
difficulty: advanced
question_type:
  - troubleshooting
  - security
tags:
  - azure
  - blob-storage
  - firewall
  - networking
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A team locks down a storage account's network firewall to allow traffic only from specific VNets, as a security hardening measure. Application traffic from those VNets continues to work correctly. But diagnostic logging that writes to this storage account, and a couple of other first-party Azure service integrations, silently stop delivering data. Nothing in the firewall rules looks obviously wrong. What's happening?

## Short Answer

Restricting a storage account's firewall to specific networks also blocks traffic from other Azure services by default, including first-party services like Azure Monitor diagnostic settings, unless you explicitly allow trusted Microsoft services to bypass the firewall. This is a separate, easy-to-miss setting from the VNet/IP allow-list rules, and skipping it is exactly why VNet-based application traffic keeps working while service-to-service integrations silently stop.

## Detailed Explanation

The firewall's VNet and IP rules answer "which networks can reach this storage account," but several Azure-native integrations don't originate from a customer-controlled network at all — they need a separate exception, and it's easy to lock down the firewall thoroughly for application traffic while never noticing this second, distinct control.

## Symptoms

- Application traffic from the allow-listed VNets continues to work exactly as before the firewall change.
- Diagnostic logs, and potentially other first-party Azure service integrations (depending on which ones write to this account), stop appearing — with no error visible to the team, since the writing service simply fails silently from the account owner's perspective.
- The firewall's configured VNet/IP rules show no obvious misconfiguration when reviewed directly.

## Possible Causes

- **"Allow Azure services on the trusted services list to access this storage account" is disabled** — this is the specific setting that permits first-party Azure services (Azure Monitor being a common one) to reach a firewalled storage account without being a VNet member themselves; it's separate from and easy to overlook alongside the VNet/IP allow-list configuration.
- **The specific integration in question isn't actually on Azure's trusted-services list at all** — some services aren't covered by this exception and require a different mechanism (like a resource-instance rule) to reach a firewalled account, meaning enabling trusted services alone wouldn't fix every case.

## Investigation Steps

**Check the storage account's networking configuration for the "trusted Microsoft services" exception setting specifically** — this is a distinct toggle from the VNet/IP rules list and is easy to miss during a review focused on network allow-lists.

**Confirm whether the specific failing integration is documented as a supported trusted service**, since not every first-party Azure integration qualifies for this exception the same way — checking this prevents assuming the trusted-services toggle alone will fix every silently-broken integration.

**Check the integration's own delivery status or retry/error indicators where available** (for diagnostic settings, the associated activity log or the destination's absence of new data over the expected interval) — this confirms the delivery is actually failing rather than simply being delayed.

## Resolution

Enable the "Allow trusted Microsoft services to access this storage account" exception if the failing integration is covered by it, and verify data resumes flowing. For integrations not covered by the trusted-services exception, use a more specific mechanism (such as a resource instance rule scoping access to a particular resource) rather than reopening the firewall broadly, which would undo the original hardening.

## Prevention

Treat the trusted-services exception as a required, explicit checklist item any time a storage account's firewall is locked down — not an implicit assumption that VNet/IP rules alone define the complete access model. Document which first-party integrations (diagnostic settings, backup, and similar) depend on a given storage account before restricting its network access, so the impact is known ahead of the change rather than discovered as a silent data gap afterward.

## Key Takeaways

- Restricting a storage account's firewall to specific networks also blocks first-party Azure service traffic by default — the "trusted Microsoft services" exception is a separate, required setting for those integrations to keep working.
- This failure is silent from the account owner's side — there's no error on the storage account itself, only an absence of expected data on the consuming side.
- Not every first-party integration is covered by the trusted-services exception; some need a more specific access mechanism.
- Any firewall lockdown should include an explicit inventory of Azure-native integrations depending on the resource, not just application-level network traffic.

## Interview Follow-Up Questions

- How would you audit a storage account to discover every Azure-native integration currently writing to it before changing its firewall rules?
- What's the security trade-off of enabling the trusted-services exception broadly, versus using narrower resource-instance rules?
- How would you monitor for this exact class of silent integration failure going forward, so it's caught within minutes rather than discovered days later?

## References

- [Azure Storage: Configure firewalls and virtual networks](https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security)
