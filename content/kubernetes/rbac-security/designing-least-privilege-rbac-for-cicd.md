---
id: kubernetes-rbac-least-privilege-cicd-multiple-namespaces-001
title: "How would you design least-privilege RBAC for a CI/CD pipeline that deploys to multiple namespaces, without granting cluster-admin?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - architecture
  - scenario
tags:
  - kubernetes
  - rbac
  - ci-cd
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A CI/CD pipeline needs to deploy application manifests (Deployments, Services, ConfigMaps, and occasionally custom resources) into several namespaces, but not touch cluster-scoped resources or other teams' namespaces. Granting it `cluster-admin` is the fast way to unblock the pipeline, but it's obviously excessive. How would you design RBAC that gives the pipeline exactly the access it needs?

## Short Answer

Define one ClusterRole listing exactly the resource types and verbs the pipeline legitimately needs (Deployments, Services, ConfigMaps, and the specific CRDs it manages — not a wildcard), then bind that same ClusterRole via a separate RoleBinding in each namespace the pipeline is authorized to deploy to, using a dedicated ServiceAccount per pipeline (not a shared one). This gives namespace-scoped access without duplicating the rule definitions, and adding a new authorized namespace is just one more RoleBinding, not a new Role.

## Detailed Explanation

The core tension is that "least privilege" and "scales to many namespaces without becoming a maintenance burden" pull in opposite directions if approached naively — hand-writing a separate Role per namespace duplicates the same rule set everywhere, while a single broad grant sacrifices the least-privilege goal. The resolution is separating the *definition* of what's allowed from the *scope* of where it's allowed, so each can be managed independently.

## Requirements

- The pipeline must be able to create/update/delete the specific resource kinds it deploys, in every namespace it's authorized for.
- The pipeline must not be able to touch cluster-scoped resources (Nodes, ClusterRoles, Namespaces themselves) or namespaces outside its authorized list.
- Adding a new authorized namespace should require a small, auditable change, not a redefinition of the whole permission set.
- Different pipelines (or the same pipeline deploying to a new team's namespace) shouldn't require duplicating and hand-maintaining near-identical Role definitions.

## Architecture

**One ClusterRole, bound per-namespace via RoleBindings — not a ClusterRoleBinding**: defining the permission set once as a ClusterRole (`kubectl create clusterrole ci-deployer --verb=get,list,watch,create,update,patch,delete --resource=deployments,services,configmaps`) but binding it with namespace-scoped `RoleBinding` objects (one per authorized namespace, each referencing the same ClusterRole) gives exactly the "reusable rule set, namespace-scoped grant" property required — a `ClusterRoleBinding` would apply the same permissions cluster-wide instead, defeating the purpose.

**Enumerate resource kinds and verbs explicitly, never a wildcard**: `resources: ["*"]` or `verbs: ["*"]` anywhere in the ClusterRole reintroduces most of the risk cluster-admin carries — explicitly listing exactly the kinds the pipeline deploys (and only the CRDs it's actually responsible for, if it manages custom resources) means a future compromise of the pipeline's credentials is contained to exactly those resource types.

**A dedicated ServiceAccount per pipeline, not a shared "ci" identity**: if multiple pipelines (or multiple teams' pipelines) share one ServiceAccount, you lose the ability to reason about or revoke one pipeline's access independently, and audit logs can't distinguish which pipeline actually performed a given change. A ServiceAccount per pipeline (or per team, depending on organizational boundaries) keeps blast radius and auditability aligned with how the organization actually operates.

**Namespace authorization becomes a data problem, not a Role-definition problem**: with the ClusterRole fixed and RoleBindings per namespace, "authorize this pipeline for a new namespace" is a single new RoleBinding object — this is easy to template in the same GitOps repo that manages the namespaces themselves, so a new namespace's onboarding can automatically include the correct RoleBinding rather than relying on someone remembering to grant it manually.

**Explicitly exclude Secrets from the ClusterRole unless genuinely required**: if the pipeline needs to create application Secrets, scope that separately and narrowly (ideally via `resourceNames` for known Secret names, or a dedicated secrets-management integration) rather than granting broad `secrets` access alongside the rest — Secrets access is exactly the kind of permission worth being more conservative about than Deployments/ConfigMaps, given what a compromised pipeline credential could exfiltrate.

## Trade-offs

Binding the same ClusterRole via many RoleBindings is simpler to reason about than maintaining near-identical per-namespace Roles, but it does mean every authorized namespace gets *exactly* the same permission set — if one namespace genuinely needs a different (say, broader) set of resource kinds than the others, that either means a second ClusterRole for that case or accepting some namespaces have unused-but-granted permissions. Excluding Secrets from the main ClusterRole adds a second, separate permission path to manage, which is more setup cost upfront but meaningfully reduces the impact of a single compromised pipeline credential.

## Key Takeaways

- One ClusterRole with explicitly enumerated resources/verbs, bound per-namespace via RoleBindings (not a ClusterRoleBinding), reuses the rule definition while keeping grants namespace-scoped.
- Never use wildcard resources or verbs in the ClusterRole — that reintroduces most of the risk cluster-admin carries.
- A dedicated ServiceAccount per pipeline (not a shared one) keeps blast radius and audit trails aligned with real organizational boundaries.
- Treat Secrets access as a separate, more conservative permission path rather than bundling it into the same broad grant as Deployments/ConfigMaps.

## Interview Follow-Up Questions

- How would you extend this design if the pipeline also needs to manage a CRD owned by a platform team, without granting it access to that team's other resources?
- How would you audit, across the whole cluster, exactly which namespaces a given CI/CD ServiceAccount is currently authorized to deploy to?
- What would you change about this design for a multi-tenant cluster where tenants themselves should be able to grant their own CI pipelines access, without involving a central platform team each time?

## References

- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
