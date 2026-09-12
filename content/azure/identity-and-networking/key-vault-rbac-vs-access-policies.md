---
id: azure-identity-networking-key-vault-rbac-vs-access-policies-001
title: "A new Key Vault needs a permission model — should you use Azure RBAC or the older vault access policies, and why does Key Vault even have two separate systems for this?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
  - key-vault
difficulty: intermediate
question_type:
  - comparison
  - security
tags:
  - azure
  - key-vault
  - rbac
  - access-policies
  - security
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A team is setting up a new Key Vault and needs to decide how to control who and what can access it — Azure RBAC, or Key Vault's own access policies. Why does Key Vault even have two separate permission systems, and which should a new vault actually use?

## Short Answer

Use Azure RBAC for any new Key Vault — it's the current recommended model, gives fine-grained, consistent permissions (down to specific operations like reading a single secret type, not just "get all secrets"), and integrates with the same role-assignment tooling used everywhere else in Azure. Access policies are the older, vault-level-only permission model that predates Key Vault's RBAC integration, kept around mainly for backward compatibility with vaults configured before RBAC support existed.

## Detailed Explanation

The two systems exist because Key Vault's access-policy model predates general Azure RBAC integration for the service — RBAC support was added later as the more consistent, more granular alternative, not as a replacement forced onto existing vaults automatically.

**Access policies are all-or-nothing at the vault level**: a principal is granted a set of permissions (get, list, set, delete, etc.) across an entire category (secrets, keys, certificates) for the whole vault — there's no way to scope access to one specific secret without giving that same principal the same permissions across every other secret in the vault too.

**RBAC-based permissions are genuinely more granular and consistent with the rest of Azure**: roles can be scoped down to an individual secret, key, or certificate, assigned using the same `az role assignment` tooling and Azure AD Privileged Identity Management (PIM) integration used for every other Azure resource, and audited through the same activity log path as other RBAC-governed resources.

**A vault is configured for one permission model or the other, not both simultaneously** — the vault's own access-control setting determines whether it evaluates access policies or RBAC role assignments, and switching an existing production vault between them requires re-establishing every principal's access under the new model before cutting over, or access breaks for everyone still relying on the old one.

## Key Takeaways

- RBAC is the current recommended permission model for Key Vault — more granular, more consistent with the rest of Azure's access-control tooling, and the better default for any new vault.
- Access policies are the legacy model, vault-scoped and coarser-grained, kept for backward compatibility rather than as an equally-good alternative going forward.
- A given vault uses one model or the other, not both — migrating an existing vault means recreating every principal's access under the new model before switching, not a seamless toggle.
- The choice matters most for how precisely you can scope access — RBAC can grant access to a single secret; access policies can't scope below the whole vault's secrets (or keys, or certificates) as a category.

## Interview Follow-Up Questions

- How would you plan and execute a migration of a production Key Vault from access policies to RBAC without causing an access outage?
- What's the risk of a vault still using access policies in an organization that has otherwise standardized on RBAC everywhere else?
- How would you audit which vaults in a large Azure environment are still using the legacy access-policy model?

## References

- [Azure Key Vault: Azure RBAC vs. access policies](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-access-policy)
