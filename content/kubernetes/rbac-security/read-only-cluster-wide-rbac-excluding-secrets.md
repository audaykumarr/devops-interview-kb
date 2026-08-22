---
id: kubernetes-rbac-cluster-wide-read-only-excluding-secrets-001
title: "How would you design RBAC so a monitoring tool has read access across the whole cluster without being able to read Secrets?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - architecture
  - practical
tags:
  - kubernetes
  - rbac
  - monitoring
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A monitoring or observability tool (for example, something that discovers Pods, Services, and their metadata cluster-wide to build a topology view) needs read access across every namespace. Using the built-in `view` ClusterRole is tempting, but it grants read access to Secrets too, which you don't want to hand to a third-party tool's ServiceAccount. How would you design RBAC to give it broad read access while explicitly excluding Secrets?

## Short Answer

Don't use the built-in `view` ClusterRole as-is — define a custom ClusterRole that explicitly lists the resource types the monitoring tool actually needs (Pods, Services, Deployments, Nodes, Events, and similar), deliberately omitting `secrets` from the `resources` list entirely, then bind it cluster-wide with a ClusterRoleBinding. Omission, not an explicit deny, is how you exclude a resource type in Kubernetes RBAC, since RBAC has no deny rules.

## Detailed Explanation

Kubernetes RBAC gives you no built-in "read everything except Secrets" role, and no deny-rule mechanism to carve an exception out of a broader grant — so this is fundamentally a role-definition design problem, not a configuration flag to set. The design has to start from what the tool actually needs, not from adapting an existing broad role.

## Requirements

- The monitoring tool needs read-only (`get`/`list`/`watch`) access to standard workload and topology-relevant resources across every namespace.
- Secrets must never be readable by this ServiceAccount, under any circumstance, including future changes to unrelated shared roles.
- The design should be verifiable — it must be possible to prove the exclusion holds, not just argue that it should.

## Architecture

**Kubernetes RBAC is purely additive — there's no deny rule, so exclusion means omission**: unlike some other authorization systems, you can't grant broad access and then explicitly carve out an exception for one resource type. The only way to guarantee a subject can never read Secrets via RBAC is to make sure no rule bound to it ever includes `secrets` in its `resources` list, across every Role/ClusterRole bound to it.

**Start from a custom ClusterRole, not the built-in `view`**: the built-in `view` ClusterRole includes `secrets` in its rules specifically because it's designed as a general-purpose "can see everything a namespace member would reasonably see" role — for a third-party tool where you want to guarantee Secrets exclusion regardless of future changes to the built-in role's definition, defining your own ClusterRole with an explicit, minimal `resources` list is safer than relying on a shared built-in role that isn't under your control.

**Enumerate exactly the resource types the tool needs**: for a typical monitoring/topology tool, this usually means `pods`, `services`, `endpoints`, `deployments`, `replicasets`, `nodes`, `namespaces`, and `events`, each with only `get`, `list`, and `watch` verbs (read-only, and specifically the verbs needed for the tool's watch-based discovery pattern, not `create`/`update`/`delete`).

**Bind cluster-wide via a single ClusterRoleBinding, since the requirement is genuinely cluster-wide**: unlike the CI/CD least-privilege pattern (which deliberately used per-namespace RoleBindings), a monitoring tool that legitimately needs visibility across the whole cluster is one of the correct use cases for an actual ClusterRoleBinding — the difference from the CI/CD case is that this tool's requirement genuinely is "every namespace," not "a specific authorized list."

**Verify the exclusion holds by testing it directly, not just by review**: after creating the ClusterRole and binding it, run `kubectl auth can-i get secrets --as=system:serviceaccount:<namespace>:<monitoring-sa> -A` — it should return `no`. Testing the negative case explicitly (not just reviewing that you didn't type "secrets" anywhere) catches the case where a second, broader binding to the same ServiceAccount was accidentally left in place from an earlier setup attempt, since RBAC is additive and any other binding could silently restore the access you meant to exclude.

**Consider ConfigMaps carefully too**: ConfigMaps are often assumed to be "safe" to expose broadly since they're not Secrets, but some organizations store sensitive-but-not-quite-secret configuration in ConfigMaps (connection strings without passwords, internal hostnames) — deciding whether the monitoring tool's `resources` list should include `configmaps` at all is worth a deliberate decision rather than an automatic yes just because it isn't a Secret.

## Trade-offs

A custom ClusterRole requires more upfront definition work than reusing the built-in `view` role, and needs to be kept in sync manually if the monitoring tool's requirements grow (a new resource type it needs to discover). This is a worthwhile trade for guaranteed Secrets exclusion, but it does mean an explicit maintenance responsibility that using a built-in role wouldn't have required.

## Key Takeaways

- RBAC has no deny rules — excluding Secrets means never including `secrets` in any rule bound to the subject, not adding an explicit exception to a broader grant.
- Define a custom ClusterRole with an explicit, minimal resource list rather than reusing the built-in `view` role, which does include Secrets access.
- A genuinely cluster-wide requirement (unlike the per-namespace CI/CD pattern) is a legitimate case for an actual ClusterRoleBinding.
- Test the exclusion directly with `kubectl auth can-i get secrets --as=<sa> -A` rather than only reviewing the Role definition, since RBAC's additive nature means another binding could silently restore the excluded access.

## Interview Follow-Up Questions

- How would you audit, on an ongoing basis, that no other RoleBinding or ClusterRoleBinding ever grants this monitoring ServiceAccount access to Secrets in the future?
- What would you do if the monitoring tool later needs to read specific, non-sensitive fields that happen to live inside a ConfigMap alongside sensitive ones?
- How would this design change if the monitoring tool needed write access to annotate resources (e.g., adding a "last scanned" annotation), not just read access?

## References

- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: User-facing Roles](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#user-facing-roles)
