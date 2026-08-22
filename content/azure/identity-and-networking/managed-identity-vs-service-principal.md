---
id: azure-identity-networking-managed-identity-vs-sp-001
title: "An Azure DevOps pipeline currently authenticates to Azure using a service principal with a stored client secret. Why would you migrate to a managed identity instead, and what are the actual limits of doing so?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
difficulty: intermediate
question_type:
  - comparison
tags:
  - azure
  - managed-identity
  - service-principal
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A pipeline authenticates to Azure resources using a service principal, with its client secret stored as a pipeline variable. Why would you migrate this to use a managed identity instead, and what are the actual limits of where a managed identity can be used?

## Short Answer

A managed identity eliminates the credential entirely — Azure manages the identity's authentication automatically for a specific resource (a VM, an Azure DevOps agent pool with workload identity federation, a Function App), meaning there's no client secret to store, rotate, or risk leaking, since the identity is tied to the resource itself rather than a standalone credential someone has to manage. The real limit is that managed identities only work for Azure resources capable of hosting them — a service principal with a stored secret (or, better, federated credentials) is still necessary for authentication from outside Azure's own resource model, like a fully external CI system without workload identity federation support.

## Detailed Explanation

The core security improvement is removing a long-lived, static secret from the picture entirely — a service principal's client secret is a credential that exists, has to be stored somewhere, can leak, and needs rotation; a managed identity has no equivalent standalone secret at all, since Azure itself handles the authentication token issuance transparently for the specific resource it's attached to.

**A service principal with a client secret is a standalone credential you're responsible for managing**: it exists independent of any specific resource, meaning it can be used from anywhere (which is also exactly the risk — if the secret leaks, it can be used from anywhere too), and its security depends entirely on how well the secret is stored, rotated, and access-controlled by whatever's using it (a pipeline variable, a config file, a secrets manager).

**A managed identity has no separate credential to manage at all**: it's automatically provisioned and tied to a specific Azure resource (a VM, an App Service, an AKS pod via workload identity), and Azure's platform handles token issuance transparently when code running on that resource requests one — there's no secret value anywhere for a human to store, rotate, or accidentally leak, since the authentication is based on the resource's own identity within Azure's platform, not a portable credential.

**System-assigned versus user-assigned managed identities offer different lifecycle models**: a system-assigned identity is created and destroyed along with its specific resource (tightly coupled, simple, but not reusable across resources); a user-assigned identity is a standalone Azure resource that can be assigned to multiple other resources and has its own independent lifecycle — useful when you want the same identity's permissions shared consistently across several resources without recreating role assignments for each.

**The real limitation is that managed identities only work within Azure's own resource model**: a managed identity is fundamentally tied to Azure infrastructure — a VM, an App Service, an AKS workload — meaning it can't be used for authentication from something running entirely outside Azure (an on-premises server, a fully external CI provider without Azure workload identity federation support) — for those cases, a service principal is still necessary.

**Workload identity federation bridges this gap for many external CI/CD systems without needing a stored secret at all**: rather than falling back to a client-secret-based service principal for external systems, workload identity federation (supported by GitHub Actions, and Azure DevOps's own workload identity federation for service connections) lets an external system present its own short-lived, platform-issued token (like GitHub's OIDC token) to Azure AD, which trusts it based on a configured federation relationship — Azure then issues a short-lived Azure token in exchange, achieving the same "no stored long-lived secret" property as a managed identity, but for a system running entirely outside Azure.

**The practical migration guidance**: use a managed identity wherever the workload actually runs on Azure infrastructure capable of hosting one; use workload identity federation for external systems (like Azure DevOps pipelines or GitHub Actions) that support it, achieving the same secretless benefit; reserve a traditional service principal with a stored, rotated secret only for the remaining cases where neither option is available.

## Key Takeaways

- A managed identity eliminates the standalone credential entirely — Azure handles authentication transparently for the specific resource it's tied to, removing the risk of a leaked or mismanaged secret.
- System-assigned identities are simple and tightly coupled to one resource's lifecycle; user-assigned identities are standalone, reusable across multiple resources.
- Managed identities only work within Azure's own resource model — they can't authenticate something running entirely outside Azure infrastructure.
- Workload identity federation achieves the same "no stored secret" benefit for external systems (Azure DevOps, GitHub Actions) that support it, bridging the gap without falling back to a traditional service principal secret.

## Interview Follow-Up Questions

- How would you migrate an existing pipeline from a service-principal-with-secret model to workload identity federation without downtime?
- What's the security risk of using a system-assigned managed identity versus a user-assigned one, in terms of permission scope creep over time?
- How would you audit an Azure environment for service principals still using stored secrets that could be migrated to a secretless authentication model?

## References

- [Azure Docs: What are managed identities for Azure resources?](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [Azure DevOps: Workload identity federation for service connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity)
