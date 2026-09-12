---
id: azure-aks-azure-rbac-for-kubernetes-authorization-001
title: "Should a new AKS cluster use native Kubernetes RBAC or Azure RBAC for Kubernetes Authorization to control kubectl-level access, and what does the Azure option actually change?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
difficulty: intermediate
question_type:
  - architecture
  - security
tags:
  - azure
  - aks
  - rbac
  - security
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A new AKS cluster needs a permission model for who can do what via `kubectl`. Should it use native Kubernetes RBAC (RoleBindings/ClusterRoleBindings) or enable Azure RBAC for Kubernetes Authorization? What does the Azure option actually change about how permissions are managed?

## Short Answer

Azure RBAC for Kubernetes Authorization lets you govern Kubernetes-level permissions using Azure role assignments (scoped to the cluster, a namespace, or even a specific resource) instead of maintaining native Kubernetes RoleBindings — permission checks are evaluated by Azure, using the same role-assignment tooling, audit trail, and Azure AD group membership already used everywhere else in the organization. It's the right choice when an organization wants one consistent access-control system across all of Azure, including Kubernetes; native RBAC remains the right choice for fine-grained, Kubernetes-idiomatic permission models that don't map cleanly onto Azure's built-in Kubernetes roles, or for teams who want permission changes to take effect without any dependency on Azure AD.

## Detailed Explanation

This isn't a question of which system is more powerful in the abstract — both can express real permission models — it's about which system your organization already manages consistently, and how permission changes actually get made day to day.

## Requirements

- Decide whether Kubernetes permissions should live in the same access-control system (Azure RBAC) as every other Azure resource, or remain Kubernetes-native and managed via `kubectl`/GitOps against the cluster itself.
- Determine whether the organization's existing Azure AD groups and role-assignment workflows already map well onto the access model the cluster needs.
- Confirm whether any required permission pattern needs Kubernetes-native RBAC's finer-grained custom Role/ClusterRole definitions that Azure's built-in Kubernetes roles don't cover.

## Architecture

**With Azure RBAC for Kubernetes Authorization enabled**, `kubectl` requests are authorized by Azure AD checking the caller's Azure role assignments (using built-in roles like Azure Kubernetes Service RBAC Reader/Writer/Admin, or custom Azure roles) rather than consulting Kubernetes RoleBinding objects — permission grants are made the same way any other Azure role assignment is made, and show up in the same Azure AD audit log used for every other resource.

**With native Kubernetes RBAC**, permissions are Role/ClusterRole and RoleBinding/ClusterRoleBinding objects living inside the cluster itself, typically managed via `kubectl` or a GitOps pipeline — this gives full access to Kubernetes' native, fine-grained permission model (custom verbs, resource-specific rules) independent of what Azure's built-in roles happen to express.

**The two systems aren't simultaneously both authoritative** — enabling Azure RBAC for Kubernetes Authorization changes which system is actually consulted for authorization decisions; existing native RoleBindings don't just stop existing, but they stop being the thing that determines access once Azure RBAC mode is active for that scope.

## Trade-offs

- Azure RBAC centralizes Kubernetes access into the same system, audit trail, and Azure AD group model used everywhere else — genuinely simpler for an organization that already manages access that way, at the cost of being constrained to Azure's built-in Kubernetes role definitions for most cases.
- Native Kubernetes RBAC gives full expressive power over permissions (any custom Role you can define) and works independent of any Azure AD dependency, at the cost of being a separate system to manage, audit, and keep consistent with the rest of the organization's access model.
- Migrating an existing cluster from native RBAC to Azure RBAC for Kubernetes Authorization means re-establishing every permission grant under the new model — it isn't a transparent switch.

## Key Takeaways

- Azure RBAC for Kubernetes Authorization moves the authorization decision itself to Azure AD, using the same role-assignment and audit tooling as every other Azure resource — it's a genuinely different enforcement point, not just a different way to write the same RoleBindings.
- The right choice depends on whether the organization wants one consistent access-control system across Azure, or needs Kubernetes-native RBAC's full custom-role expressiveness.
- The two systems aren't both simultaneously authoritative — enabling Azure RBAC changes which system actually gets consulted, it doesn't merge the two.
- Migrating between the two models means recreating the permission model under the new system, not a seamless toggle.

## Interview Follow-Up Questions

- How would you audit which permission model (native RBAC or Azure RBAC) is actually in effect for a given AKS cluster today?
- What's a permission pattern that's easy to express in native Kubernetes RBAC but awkward or impossible with Azure's built-in Kubernetes roles?
- How would you plan a migration from native RBAC to Azure RBAC for Kubernetes Authorization on a live production cluster without an access outage?

## References

- [AKS: Use Azure RBAC for Kubernetes Authorization](https://learn.microsoft.com/en-us/azure/aks/manage-azure-rbac)
