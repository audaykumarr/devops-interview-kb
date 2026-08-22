---
id: kubernetes-rbac-auditing-excessive-serviceaccount-permissions-001
title: "How would you audit an entire cluster to find ServiceAccounts with effectively cluster-admin permissions before a security review?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - practical
  - security
tags:
  - kubernetes
  - rbac
  - security
  - auditing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A security review is coming up and you need to answer: "which ServiceAccounts in this cluster effectively have cluster-admin (or near-cluster-admin) permissions, whether or not anyone intended to grant that?" How would you actually find this out across a real cluster with hundreds of RBAC objects, rather than manually reading every Role and RoleBinding?

## Short Answer

Enumerate every ClusterRoleBinding and RoleBinding, resolve each one's referenced Role/ClusterRole to its actual `rules`, and specifically flag any binding whose subject is a ServiceAccount and whose resolved rules include a wildcard (`resources: ["*"]`, `verbs: ["*"]`, or both) or explicitly reference `cluster-admin` — doing this by hand for a large cluster isn't tractable, so this is a case for a purpose-built tool (`kubectl-who-can`, `rbac-lookup`, or a custom script against the RBAC API) rather than manual review.

## Detailed Explanation

**Define "effectively cluster-admin" precisely before searching for it**: a ServiceAccount is effectively cluster-admin if it's bound (directly or via a ClusterRoleBinding) to a role whose rules grant broad wildcard access to most resource types and verbs — not just literally the `cluster-admin` ClusterRole by name. Someone could create a custom ClusterRole with `resources: ["*"]` and `verbs: ["*"]` that's functionally identical to `cluster-admin` without ever using that name, so a search that only looks for `roleRef.name == cluster-admin` misses that case.

**Use `kubectl-who-can` (a widely-used krew plugin) for a targeted question**: `kubectl who-can '*' '*'` (or scoped to specific verbs/resources) directly answers "which subjects can do this" by resolving the full RBAC graph for you — this is the fastest way to get a concrete list of ServiceAccounts (and other subjects) with broad access, without manually cross-referencing Role/RoleBinding/ClusterRole/ClusterRoleBinding objects.

**For a full audit, resolve the whole RBAC graph programmatically**: pulling every `RoleBinding`/`ClusterRoleBinding` (`kubectl get rolebindings,clusterrolebindings -A -o json`), and every `Role`/`ClusterRole` (`kubectl get roles,clusterroles -A -o json`), then joining bindings to their referenced role's rules in a script (or with a tool like `rbac-lookup` or `rbac-tool`) produces a complete table of every subject and its effective permissions — this is the version that scales to hundreds of objects and produces a reviewable report, rather than one-off spot checks.

**Specifically flag aggregated ClusterRoles**: Kubernetes' `aggregationRule` mechanism lets a ClusterRole automatically absorb rules from other ClusterRoles matching a label selector — a ClusterRole that looks narrow in its own directly-defined `rules` can still be effectively broad once aggregation is accounted for. An audit that only reads a ClusterRole's literal `rules` field (ignoring `aggregationRule`) will under-report its actual effective permissions; tools like `rbac-lookup` account for this, but a hand-rolled script needs to explicitly resolve aggregation too.

**Cross-reference the resulting list against expected ownership**: a raw list of "ServiceAccounts with broad access" isn't itself actionable without knowing whether each one is a legitimate platform component (a CNI plugin's controller, a cluster autoscaler) that genuinely needs broad access, versus an application-level ServiceAccount that shouldn't have it — annotating the audit output against a known-legitimate list (cluster-critical system components) turns it into a short, actionable list of genuine findings rather than a long list dominated by expected system accounts.

**Make this a recurring check, not a one-time review**: RBAC drift (a new ClusterRoleBinding added during an incident and never revoked, a broad grant added "temporarily" during debugging) accumulates over time — running this audit on a schedule (or as a continuous policy check via an admission controller or a tool like `kubescape`) catches new over-broad grants as they're introduced, rather than only at the next scheduled security review.

## Key Takeaways

- "Effectively cluster-admin" means resolving wildcard rules and aggregated ClusterRoles, not just searching for literal references to the `cluster-admin` role name.
- `kubectl-who-can` answers targeted "who can do X" questions directly; a full audit needs to resolve the entire RoleBinding/ClusterRoleBinding → Role/ClusterRole graph programmatically.
- ClusterRole `aggregationRule` can make a role's effective permissions broader than its directly-defined `rules` — an audit that ignores aggregation under-reports risk.
- Cross-reference findings against known-legitimate system components to turn a long raw list into a short, actionable one, and run the audit on a recurring schedule, not just once.

## Interview Follow-Up Questions

- How would you distinguish a legitimate platform component's need for broad access from an application ServiceAccount that shouldn't have it, in an automated way rather than manual judgment each time?
- What would you do if the audit finds a ServiceAccount with broad access that nobody on the current team can explain the original justification for?
- How would you turn this audit into a continuously-enforced policy (blocking new overly-broad grants) rather than a periodic detection-only check?

## References

- [Kubernetes: Using RBAC Authorization — Aggregated ClusterRoles](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#aggregated-clusterroles)
- [kubectl-who-can (GitHub)](https://github.com/aquasecurity/kubectl-who-can)
