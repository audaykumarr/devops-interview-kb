---
id: kubernetes-rbac-rolebinding-scoping-across-namespaces-001
title: "Why doesn't a RoleBinding in namespace A grant access to namespace B, even though the ClusterRole it references is itself cluster-scoped?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - rbac
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A team creates a RoleBinding in the `team-a` namespace that references a ClusterRole (not a plain Role). They expect this to grant access across the cluster, since the referenced object is cluster-scoped — but the ServiceAccount still gets `Forbidden` errors trying to access resources in `team-b`. Why doesn't referencing a cluster-scoped ClusterRole make the grant cluster-scoped?

## Short Answer

The scope of a grant is determined entirely by the *binding* object, not the *role* object it references — a RoleBinding is itself always namespace-scoped (it lives in, and only applies to, the namespace it was created in), regardless of whether it references a Role or a ClusterRole. Referencing a ClusterRole from a RoleBinding only reuses that ClusterRole's *rule definitions* within the RoleBinding's own namespace; it doesn't inherit the ClusterRole's potential for cluster-wide scope. Only a ClusterRoleBinding actually grants cluster-wide access.

## Detailed Explanation

**The binding object, not the role object, is what carries scope information**: a `Role` and `ClusterRole` are both just definitions of a set of permission rules — neither one, by itself, is "applied" to anything. It's the binding (`RoleBinding` or `ClusterRoleBinding`) that actually connects a subject (a ServiceAccount, user, or group) to a role's rules, and it's the binding's own kind and (for RoleBinding) its `metadata.namespace` that determines where those rules actually take effect.

**A RoleBinding referencing a ClusterRole is a deliberate, common pattern — not a mistake**: this is exactly the mechanism used to reuse a single permission definition (like Kubernetes' built-in `view` ClusterRole) across multiple namespaces without redefining an equivalent Role in each one. The RoleBinding scopes the ClusterRole's rules down to just its own namespace — this is a feature, not a limitation to work around.

**Verify the actual scope by checking the RoleBinding's own namespace, not the referenced role's kind**: `kubectl get rolebinding <name> -n team-a -o yaml` will show `metadata.namespace: team-a` regardless of whether `roleRef.kind` says `Role` or `ClusterRole` — that `metadata.namespace` field is the actual scope boundary, and it's easy to misread the situation by focusing on `roleRef.kind` instead.

**To actually grant cluster-wide access, you need a ClusterRoleBinding, which is a different (cluster-scoped) object entirely**: a `ClusterRoleBinding` has no `metadata.namespace` at all — it can only reference a `ClusterRole` (not a plain `Role`, since a Role's rules are inherently namespace-bound and wouldn't make sense applied cluster-wide), and it grants those rules across every namespace in the cluster.

**This distinction matters directly for least-privilege design**: intentionally using RoleBindings that reference a shared ClusterRole, one per authorized namespace, is exactly how you reuse a permission definition without accidentally granting cluster-wide access — understanding that binding scope and role scope are independent concepts is what makes that pattern safe rather than an accident waiting to happen.

## Key Takeaways

- Scope comes entirely from the binding object (RoleBinding vs ClusterRoleBinding), not from whether the referenced role is a Role or ClusterRole.
- A RoleBinding referencing a ClusterRole scopes that ClusterRole's rules down to just the RoleBinding's own namespace — this is the standard way to reuse a shared permission definition per-namespace.
- Check a RoleBinding's `metadata.namespace`, not `roleRef.kind`, to determine its actual scope.
- Only a ClusterRoleBinding (a distinct, cluster-scoped object with no namespace) actually grants access across the entire cluster.

## Interview Follow-Up Questions

- Why can't a ClusterRoleBinding reference a plain Role instead of a ClusterRole?
- How would you write a single command to list every RoleBinding in the cluster that references a given ClusterRole, across all namespaces?
- What would you check if a ClusterRoleBinding exists and looks correct, but a user still reports being denied access in a specific namespace?

## References

- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
