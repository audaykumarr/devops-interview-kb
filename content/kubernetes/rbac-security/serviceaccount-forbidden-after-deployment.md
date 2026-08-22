---
id: kubernetes-rbac-serviceaccount-forbidden-after-deployment-001
title: "A ServiceAccount that worked fine before a deployment suddenly gets Forbidden errors on the Kubernetes API — how do you diagnose it?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - kubernetes
  - rbac
  - serviceaccount
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A pod's application logs start showing `Forbidden` errors calling the Kubernetes API (for example, when it tries to list ConfigMaps or watch its own Deployment) immediately after a routine deployment. Nothing in the application code changed. How do you diagnose exactly what changed and get it working again?

## Short Answer

Confirm the exact permission the ServiceAccount is missing with `kubectl auth can-i --as=system:serviceaccount:<namespace>:<sa-name> <verb> <resource>`, then diff the RoleBinding/Role (or ClusterRole) that grants that ServiceAccount access against what the deployment actually changed — most often the deployment silently changed which ServiceAccount the pod runs as, or a RoleBinding/Role got redeployed with a narrower rule set than before.

## Detailed Explanation

A sudden RBAC regression right after a deployment is almost always caused by the deployment itself changing something about the pod's identity or the permission objects bound to it — not by the Kubernetes API server's behavior changing. The investigation is about finding exactly what that deployment altered, using the denied request itself as the starting point rather than re-reading every RBAC object in the namespace.

## Symptoms

- A pod's application logs (or the API server's own audit log) show `Forbidden` errors for specific Kubernetes API calls that previously succeeded.
- The failure started immediately after a deployment, with no application code change.
- Some API calls from the same pod may still succeed while others fail, depending on which specific permissions were affected.

## Possible Causes

- The deployment silently changed `spec.serviceAccountName` (a Helm upgrade removing an override, a kustomize overlay no longer patching it in), so the pod now runs as a different, less-privileged ServiceAccount.
- The deployment's GitOps sync also redeployed an RBAC manifest (Role or ClusterRole) with a narrower `rules` list than before.
- The deployment moved the workload to a new namespace, and no RoleBinding exists yet in that namespace even though one existed in the old one.

## Investigation Steps

**Start from the exact denied request, not a guess**: the application's error message or the API server's audit log will show the specific verb and resource that was denied (e.g., `configmaps is forbidden: User "system:serviceaccount:payments:api" cannot list resource "configmaps" in API group ""`). This tells you precisely which ServiceAccount, namespace, verb, and resource to investigate — don't start broadly re-reading all RBAC objects before you know exactly what's missing.

**Reproduce the check directly with `kubectl auth can-i`**: running `kubectl auth can-i list configmaps --as=system:serviceaccount:payments:api -n payments` reproduces the authorization decision outside the application, confirming whether it's really an RBAC gap versus something else (a typo in the resource name in application code, a wrong namespace, a token that failed to refresh).

**Check whether the deployment changed the ServiceAccount itself**: diff the previous and new pod spec's `spec.serviceAccountName` field directly (`kubectl get deployment <name> -o yaml` before/after, or the Git diff of the manifest) rather than assuming it's unchanged — this is the single most common cause.

**If the ServiceAccount is the same, diff the RBAC objects that reference it**: find every RoleBinding/ClusterRoleBinding whose `subjects` list includes that ServiceAccount (`kubectl get rolebindings,clusterrolebindings -A -o json | jq '.items[] | select(.subjects[]?.name=="api" and .subjects[]?.namespace=="payments")'`), then check whether the Role or ClusterRole those bindings reference was itself redeployed with a narrower `rules` list.

**Check for a namespace mismatch introduced by the deployment**: if the deployment moved the workload to a new namespace, a RoleBinding that used to grant access in the old namespace won't automatically exist in the new one — RoleBindings are namespace-scoped even when they reference a cluster-scoped ClusterRole.

## Resolution

Restore the correct `serviceAccountName` in the pod spec, or widen the Role/ClusterRole's rules back to what the workload actually needs (or add the missing RoleBinding in a newly-introduced namespace) — whichever the investigation identified as the actual change. Confirm the fix with the same `kubectl auth can-i` check that reproduced the failure, rather than just redeploying and assuming the application's success is sufficient confirmation, since a flaky retry could mask a still-broken permission for a less-frequently-used API call.

## Key Takeaways

- Start from the exact verb/resource in the Forbidden error, and reproduce it directly with `kubectl auth can-i --as=<serviceaccount>` rather than guessing.
- A deployment silently changing `spec.serviceAccountName` is one of the most common causes of a sudden RBAC regression.
- Diff the Role/ClusterRole rules referenced by the relevant RoleBinding — a redeployed RBAC manifest with a narrower rule set is the other common cause.
- Confirm the fix with the same reproduction command, not just by observing the application recover.

## Interview Follow-Up Questions

- How would you set up alerting so a Forbidden-error spike is caught within minutes instead of being discovered from a support ticket?
- What would you check if `kubectl auth can-i` says access should be allowed, but the application still gets Forbidden errors?
- How would you prevent a Helm upgrade from silently narrowing an RBAC rule set in the future?

## References

- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
