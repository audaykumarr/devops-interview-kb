---
id: azure-aks-workload-identity-design-001
title: "How would you let a pod in AKS call a Key Vault or Storage API using its own Azure identity, without mounting any credential file or secret into the pod at all?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
  - key-vault
difficulty: advanced
question_type:
  - architecture
  - security
tags:
  - azure
  - aks
  - workload-identity
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A pod running in AKS needs to call Key Vault to read a secret. The team wants to avoid mounting any credential file, connection string, or long-lived secret into the pod at all. How would you design this using AKS's Workload Identity feature, and what's actually happening under the hood that makes it secure?

## Short Answer

Enable Workload Identity on the AKS cluster (which exposes an OIDC issuer URL for the cluster), create a Microsoft Entra federated credential on a managed identity that trusts tokens issued by that OIDC issuer for a specific Kubernetes service account, and annotate that service account so pods using it are automatically injected with the ability to exchange their Kubernetes-issued token for a real Azure AD token. The pod never holds a long-lived Azure credential — it holds a short-lived Kubernetes service account token, which Azure AD trusts and exchanges for its own short-lived access token, scoped to whatever the managed identity is actually authorized to do.

## Detailed Explanation

The core mechanism is a federation of trust: Azure AD is configured to trust tokens from the AKS cluster's own OIDC issuer for a specific identity, rather than the pod ever being handed an Azure-native credential directly.

## Requirements

- No long-lived Azure credential (key, connection string, service principal secret) should ever be stored in the pod's configuration, environment, or a mounted file.
- Access should be scoped to exactly what the specific workload needs — not a broad, cluster-wide identity shared across unrelated pods.
- The design should not depend on network-level trust (e.g., "any pod that can reach Key Vault can read the secret") — it should be workload-identity-based.

## Architecture

**Enable Workload Identity on the AKS cluster**, which provisions an OIDC issuer endpoint representing the cluster's own token-issuing identity — this is the trust anchor the rest of the design depends on.

**Create a federated credential on a user-assigned managed identity in Microsoft Entra ID**, configured to trust tokens issued by the cluster's OIDC issuer for a specific combination of Kubernetes namespace and service account name — this is the actual trust relationship: Azure AD will accept a token from that specific service account as proof of identity for this managed identity.

**Create and annotate the Kubernetes service account** with the managed identity's client ID, and label the pod spec to use Workload Identity — this wires the pod up to automatically receive a projected, short-lived Kubernetes service account token and the environment configuration needed for the Azure SDK to perform the token exchange transparently.

**Grant the managed identity exactly the permissions the workload needs** on the target resource (e.g., a specific Key Vault access policy or RBAC role scoped to that vault) — the managed identity is the actual security boundary; scope it as narrowly as the workload's real need, not broadly for convenience.

## Trade-offs

- This removes long-lived credentials from the pod entirely, which is a significant security improvement, but it does require the cluster to have Workload Identity enabled and the federated credential correctly scoped — a misconfigured namespace/service-account match silently fails token exchange rather than partially working.
- Each distinct workload identity need should generally get its own managed identity and service account pairing, rather than one broad identity shared cluster-wide — more setup, but a much smaller blast radius if any single workload is compromised.
- Debugging a failed exchange requires understanding both the Kubernetes-side (service account, pod annotations) and Azure AD-side (federated credential configuration) simultaneously — a single missing piece anywhere in the chain produces the same generic authentication failure.

## Key Takeaways

- Workload Identity's security value comes from federation, not from hiding a secret better — there is no long-lived Azure credential in the pod at all to hide.
- The trust relationship is scoped to a specific namespace/service-account pair on a specific cluster's OIDC issuer — it isn't "any pod in the cluster can claim this identity."
- The managed identity's own granted permissions are the real access-control boundary — Workload Identity solves *how* a pod proves its identity, not *what* that identity is allowed to do.
- A failure anywhere in the chain (cluster OIDC config, federated credential scope, service account annotation) produces the same generic authentication failure, so diagnosis requires checking the whole chain, not guessing at one link.

## Interview Follow-Up Questions

- How would you audit an AKS cluster to find workloads still using an older, less secure identity mechanism (a mounted service principal secret) that should be migrated to Workload Identity?
- What would you check first if token exchange is failing for a specific pod, given the multi-part trust chain involved?
- How does this design change for a workload that needs to access resources in a different Azure AD tenant?

## References

- [Azure AD Workload Identity for Kubernetes](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview)
