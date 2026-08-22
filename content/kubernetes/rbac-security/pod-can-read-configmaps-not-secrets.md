---
id: kubernetes-rbac-pod-can-read-configmaps-not-secrets-001
title: "A pod can read ConfigMaps but not Secrets in the same namespace, even though its Role looks like it should allow both — how do you find the gap?"
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
  - secrets
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A pod's ServiceAccount can successfully call `configmaps.get`/`list` against the Kubernetes API, but the exact same code path against `secrets` returns `Forbidden`. The Role bound to the ServiceAccount looks, at a glance, like it grants access to both. How do you find the actual discrepancy?

## Short Answer

Read the Role's `rules` list literally rather than at a glance — the almost-always cause is that the rule granting access lists `resources: ["configmaps"]` explicitly without `"secrets"` alongside it (a rule that "looks like it covers both" because it's visually near a comment or another rule that does mention secrets, but doesn't actually include the resource name), or a separate rule scopes Secrets access down further with `resourceNames` to only specific named Secrets that don't include the one being requested.

## Detailed Explanation

A Role that "looks like it should allow both" is a review-by-eye problem, not an RBAC engine problem — Kubernetes evaluates each rule's `apiGroups`/`resources`/`verbs`/`resourceNames` fields precisely and literally, with no notion of "these two resources are conceptually similar." The fix is always in reading the rule set exactly as the API server does, not more carefully skimming it.

## Symptoms

- A ServiceAccount can successfully `get`/`list` ConfigMaps in a namespace.
- The identical code path against Secrets in the same namespace returns `Forbidden`.
- The bound Role appears, on a visual read, to grant access to both resource types.

## Possible Causes

- The Role has a separate rule for `secrets` with a narrower `verbs` list than the ConfigMaps rule (e.g., missing `list`), or omits `secrets` from the `resources` list entirely despite being visually near a rule that does mention it.
- A `resourceNames` restriction scopes Secrets access to specific named objects that don't include the one being requested.
- A non-RBAC admission policy (OPA Gatekeeper, Kyverno) treats Secrets access differently from ConfigMaps for compliance reasons.
- The actual failing access pattern is an automatically-mounted Secret volume, not an explicit API call, making this an `automountServiceAccountToken` question rather than an RBAC rule gap.

## Investigation Steps

**Print the actual effective rules for that exact resource and verb**: `kubectl get role <name> -n <namespace> -o yaml` shows the literal `rules` array — read every rule's `apiGroups`, `resources`, and `verbs` fields individually rather than skimming the whole Role as "looks fine."

**Check for `resourceNames` scoping specific Secrets**: `kubectl auth can-i get secrets/<exact-name> --as=system:serviceaccount:<ns>:<sa>` (naming the specific Secret) versus `kubectl auth can-i get secrets` (without a name) will give different answers if a `resourceNames` restriction is the cause — running both is the fastest way to confirm it.

**Confirm it isn't a Secret-specific admission restriction**: checking `kubectl describe` on any relevant policy objects, or the admission controller's logs, rules out a non-RBAC source of the same-looking symptom.

**Check whether a separate, more restrictive Role/RoleBinding also applies**: RBAC is additive (a request is allowed if *any* applicable rule allows it), so a second, narrower RoleBinding can't actually *remove* access — but it's worth confirming there isn't a second RoleBinding that people believe is the relevant one but isn't, obscuring where the real (missing) grant should be added.

**Distinguish this from Secret-type-specific behavior at the mount level**: if the symptom is specifically about automatically-mounted tokens rather than an explicit `GET` call, the actual investigation is `automountServiceAccountToken` behavior, not a Role gap at all.

## Resolution

Add the missing `secrets` entry (or the missing verb) to the Role's rules, or add the specific Secret name to the `resourceNames` list if that was the actual scoping mechanism — then re-run the same `kubectl auth can-i` check used to diagnose it, naming the exact Secret, to confirm the fix closes the precise gap rather than a related-but-different one.

## Key Takeaways

- Read a Role's `rules` list literally, field by field — visual proximity to a working rule for a different resource doesn't imply the same permissions.
- `resourceNames` can scope `secrets` access to specific named objects; test with and without the exact Secret name to catch this.
- RBAC is additive across multiple RoleBindings — a second, more restrictive binding can't remove access, so look for a missing grant rather than a conflicting one.
- Confirm whether the actual failure is an explicit API call versus an automatically-mounted Secret volume, since those are different mechanisms entirely.

## Interview Follow-Up Questions

- How would you write a Role that grants read access to all ConfigMaps in a namespace but only one specific, named Secret?
- Why is Kubernetes RBAC additive rather than supporting explicit deny rules, and what design implication does that have for how you structure Roles?
- How would you audit a namespace's Roles to find every place `resourceNames` is being used, before a broader access review?

## References

- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
