---
id: kubernetes-rbac-role-vs-clusterrole-when-namespace-scoped-001
title: "What's the difference between a Role/RoleBinding and a ClusterRole/ClusterRoleBinding, and when would you bind a ClusterRole at namespace scope on purpose?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: beginner
question_type:
  - comparison
  - conceptual
tags:
  - kubernetes
  - rbac
  - fundamentals
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Kubernetes RBAC has four related objects: Role, ClusterRole, RoleBinding, and ClusterRoleBinding. What's the actual difference between them, and why would you deliberately bind a ClusterRole using a namespace-scoped RoleBinding instead of just using a Role?

## Short Answer

A Role's rules only apply within the namespace it's created in, while a ClusterRole's rules can apply cluster-wide *or* be scoped to a single namespace, depending on whether it's bound with a ClusterRoleBinding (cluster-wide) or a RoleBinding (namespace-scoped). Binding a ClusterRole via a RoleBinding is a deliberate, common pattern for reusing one permission definition (like "view all standard resources") across many namespaces without redefining the same rules as a separate Role in each one.

## Detailed Explanation

**Role and ClusterRole differ in where their rules are defined, not what they can contain**: a Role is created within, and only visible to, a single namespace — its `rules` only ever apply to resources in that namespace. A ClusterRole is a cluster-scoped object (no namespace), and can grant access to cluster-scoped resources (Nodes, PersistentVolumes, Namespaces themselves) that a Role fundamentally cannot reference at all, since a Role can't grant access outside its own namespace.

**RoleBinding and ClusterRoleBinding differ in scope, not in what they can bind**: a RoleBinding grants the permissions in a Role (or a ClusterRole) within the RoleBinding's own namespace only. A ClusterRoleBinding grants the permissions in a ClusterRole across the entire cluster, in every namespace. Critically, a RoleBinding *can* reference a ClusterRole — when it does, the ClusterRole's rules apply only within that RoleBinding's namespace, not cluster-wide.

**Why bind a ClusterRole via a RoleBinding at all**: Kubernetes ships several built-in ClusterRoles (`view`, `edit`, `admin`) that define broadly useful, reusable permission sets. Rather than recreating an equivalent Role in every namespace that needs "read-only access to standard resources," you bind the existing `view` ClusterRole via a RoleBinding scoped to just that namespace — one ClusterRole definition, reused namespace-by-namespace via lightweight RoleBinding objects, without granting cluster-wide access.

**This is exactly the mechanism behind scalable per-namespace access grants**: the "least-privilege RBAC for a CI/CD pipeline across multiple namespaces" pattern relies on precisely this distinction — one ClusterRole holding the permission definition, and a separate RoleBinding per authorized namespace. Understanding that a RoleBinding-bound ClusterRole doesn't leak cluster-wide access is what makes that pattern safe to use at all.

**The confusion this causes in practice**: seeing "ClusterRole" in a RoleBinding's `roleRef` sometimes leads people to assume the binding must be cluster-wide — it's the *binding object* (RoleBinding vs ClusterRoleBinding), not the *role object* (Role vs ClusterRole), that actually determines the effective scope. Reading a RoleBinding's own `metadata.namespace` field, not the referenced role's kind, is what tells you the true blast radius of a given grant.

## Key Takeaways

- A Role's rules apply only within its own namespace; a ClusterRole's rules can apply cluster-wide or be scoped to one namespace, depending entirely on the binding object used.
- A RoleBinding scopes whatever it grants (whether referencing a Role or a ClusterRole) to its own namespace; a ClusterRoleBinding grants cluster-wide.
- Binding a ClusterRole via a RoleBinding is the standard way to reuse one permission definition (like the built-in `view`/`edit`/`admin` ClusterRoles) across many namespaces without redefining it per namespace.
- The binding object's kind and namespace — not the referenced role's kind — determines a grant's actual blast radius.

## Interview Follow-Up Questions

- What permissions do Kubernetes' built-in `view`, `edit`, and `admin` ClusterRoles grant, and how do they differ from each other?
- How would you audit a cluster to find every ClusterRoleBinding that grants cluster-wide access, as a first step in a security review?
- Why can't a Role reference a ClusterRole the other way around — that is, why is there no equivalent way for a ClusterRole to be scoped down by referencing a Role?

## References

- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
