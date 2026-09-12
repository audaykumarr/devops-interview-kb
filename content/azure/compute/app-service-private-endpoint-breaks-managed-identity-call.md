---
id: azure-compute-app-service-private-endpoint-breaks-call-001
title: "An App Service using Managed Identity to call a storage account worked fine for months. After a Private Endpoint was added to that storage account, the App Service started failing to reach it. Why?"
category: azure
subcategory: compute
technologies:
  - azure
  - app-service
  - blob-storage
difficulty: advanced
question_type:
  - troubleshooting
  - security
tags:
  - azure
  - app-service
  - private-endpoint
  - managed-identity
  - networking
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

An App Service authenticates to a Storage account using Managed Identity and has worked reliably for months. The security team adds a Private Endpoint to that storage account (and locks down its public network access) as a hardening measure. Immediately after, the App Service starts failing to reach the storage account — not with an authentication error, but a connection failure. Managed Identity itself wasn't touched. Why would this break?

## Short Answer

Identity and network path are two entirely separate concerns, and this change only fixed one of them for the App Service's benefit — Managed Identity still proves *who* the App Service is, but once the storage account's public network access is disabled and only reachable via Private Endpoint, the App Service also needs its own network path into that same VNet (via VNet Integration) to reach the private IP at all. Without that, the request never reaches the storage account for identity to even be checked — it fails at the network layer first.

## Detailed Explanation

This is a common trap precisely because the two concerns feel like they should be linked but aren't: "the app is already allowed to authenticate" has no bearing on "the app has a network path to where the resource now lives."

## Symptoms

- The failure is a connection/timeout error, not an authentication or authorization error — the request isn't reaching the point where Managed Identity's token would even be evaluated.
- The App Service's Managed Identity configuration and its role assignment on the storage account are unchanged and still correct.
- The failure began immediately after the storage account's networking configuration changed, with no change on the App Service side.

## Possible Causes

- **The App Service isn't integrated with the VNet the Private Endpoint lives in**, and without VNet Integration, App Service has no network path to a private IP address at all — it can only reach what's publicly routable, which the storage account no longer is.
- **VNet Integration is enabled, but DNS resolution for the storage account's hostname isn't resolving to the private IP** — without correct DNS (typically via a private DNS zone linked to the VNet), the App Service may still resolve the storage account's public hostname/IP, which no longer accepts the connection now that public access is disabled.
- **A network security group or route table along the path blocks the App Service's outbound traffic to the private endpoint**, even with VNet Integration and correct DNS in place — less common, but worth ruling out directly rather than assuming.

## Investigation Steps

**Confirm whether VNet Integration is enabled on the App Service** and pointed at the correct VNet/subnet — this is the first, most likely gap, since it's an entirely separate configuration from Managed Identity and easy to overlook when the mental model is "identity is already set up correctly."

**From the App Service's Kudu console or a diagnostic tool, resolve the storage account's hostname** — if it resolves to a public IP instead of the expected private IP, that confirms a DNS resolution gap even if VNet Integration itself is correctly configured.

**Check the private DNS zone associated with the Private Endpoint and confirm it's linked to the same VNet the App Service is integrated with** — a Private Endpoint without a correctly linked private DNS zone is a very common half-finished configuration that looks complete in the Portal but doesn't actually resolve correctly for clients.

## Resolution

Enable VNet Integration on the App Service if it isn't already, pointing at a VNet with a network path to the Private Endpoint, and confirm the private DNS zone for the storage account is linked to that same VNet so the App Service resolves the storage account's hostname to its private IP rather than a now-unreachable public one. Managed Identity's role assignment doesn't need to change — the fix is entirely on the network/DNS side.

## Prevention

Treat "add a Private Endpoint to a resource" as a change that has real, testable impact on every existing consumer of that resource, not just a security hardening step that's purely additive — verify each consumer's network path and DNS resolution as part of the same change, rather than as a follow-up incident. Document which App Services (or other compute) are VNet-integrated and into which VNets, so this dependency is visible before the next networking change.

## Key Takeaways

- Managed Identity answers "who is making this request," and network path/DNS answers "can this request physically reach the resource" — a Private Endpoint change only affects the second, and can break access even with identity fully correct.
- The specific failure type (connection error vs. authentication error) is the fastest signal distinguishing this class of problem from an identity/permissions regression.
- A Private Endpoint without VNet Integration on the consuming compute, or without a correctly linked private DNS zone, is a very common half-finished configuration.
- Any change that restricts a resource's public network access needs to be evaluated against every existing consumer's network path, not treated as purely additive hardening.

## Interview Follow-Up Questions

- How would you audit every App Service and Function App in a subscription to find ones that would break if a specific storage account's public access were disabled?
- What would you check differently if VNet Integration and DNS both looked correct, but the connection still failed?
- How would you design a rollout of Private Endpoints across many resources to avoid this class of incident happening repeatedly?

## References

- [Azure App Service: VNet integration](https://learn.microsoft.com/en-us/azure/app-service/overview-vnet-integration)
- [Azure Private Link: DNS configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
