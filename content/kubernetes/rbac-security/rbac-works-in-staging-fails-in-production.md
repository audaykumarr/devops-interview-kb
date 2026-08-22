---
id: kubernetes-rbac-works-in-staging-fails-in-production-001
title: "A Deployment runs fine in the staging namespace but fails with RBAC errors in production — what's actually different?"
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
  - namespaces
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The exact same Deployment manifest (same image, same ServiceAccount name, same RBAC manifests applied through the same GitOps pipeline) works correctly in `staging` but gets `Forbidden` errors calling the Kubernetes API once promoted to `production`. What's actually different between the two namespaces, and how do you find it?

## Short Answer

Despite identical-looking manifests, RoleBindings are namespace-scoped objects, so "the same RBAC yaml" only produces the same effective permissions if it was actually applied to both namespaces — the most common cause is that the RoleBinding (or the Role it references) genuinely doesn't exist, or exists with different rules, in `production`, because of a promotion pipeline gap, a manual hotfix that was never backported, or a namespace-templating bug that silently skips one environment.

## Detailed Explanation

"The same manifest" is a claim about Git, not about live cluster state — RBAC objects are declarative resources subject to the same drift, partial-apply, and out-of-band-edit risks as any other Kubernetes object. The investigation is about comparing actual live state between the two namespaces, not re-reading the source YAML that's assumed to have produced it.

## Symptoms

- The identical Deployment manifest, ServiceAccount name, and (supposedly) RBAC manifests behave correctly in `staging` but produce `Forbidden` errors in `production`.
- The same GitOps pipeline is used to deploy to both environments.
- No application code or manifest content differs between the two promotions.

## Possible Causes

- A promotion pipeline gap: application manifests are deployed to every environment automatically, but RBAC manifests were only applied to `production` once, manually, and have since drifted from `staging`.
- A manual, undocumented `kubectl edit` change made directly against `production`'s RBAC objects at some point.
- `production` uses a different ServiceAccount naming convention than `staging`, so a copy-pasted RoleBinding references a ServiceAccount name that doesn't match what the pod actually runs as.
- `staging` and `production` are separate clusters, and a required ClusterRole was never provisioned in the production cluster.

## Investigation Steps

**Verify the RoleBinding actually exists in production, don't assume it does**: run `kubectl get rolebindings,clusterrolebindings -n production` and specifically look for the binding that should reference the workload's ServiceAccount.

**Diff the actual live objects, not the source YAML**: compare the live `Role`/`ClusterRole` rules in both namespaces (`kubectl get role <name> -n staging -o yaml` vs `-n production`) rather than trusting that the Git source reflects both environments' actual state — someone may have applied a manual, undocumented change directly to `production` at some point.

**Check whether the ServiceAccount name resolves to a different identity than expected**: `kubectl auth can-i <verb> <resource> --as=system:serviceaccount:production:<actual-sa-name>` against the real ServiceAccount name confirms whether a naming-convention mismatch is the cause.

**Consider a cluster-level difference, not just a namespace-level one**: if `staging` and `production` are genuinely separate clusters, a ClusterRole itself might not exist in the production cluster at all if it was created manually rather than through the same automated pipeline as namespace-scoped objects.

**Check for an OPA/Gatekeeper or admission webhook difference between environments**: some organizations run stricter admission control in production that can reject or mutate RBAC objects differently than staging — if the RoleBinding applied successfully but the Role's rules were partially rejected, effective permissions can differ even with an apparently successful `kubectl apply`.

## Resolution

Apply the missing or drifted RBAC objects to `production` to match what `staging` actually has live (not just what Git says it should have), correct any ServiceAccount naming mismatch, and — if this was caused by a promotion pipeline gap — fix the pipeline so RBAC manifests are deployed through the same reliable, automated path as application manifests going forward, not a separate manual process.

## Key Takeaways

- RoleBindings are namespace-scoped: identical-looking YAML only produces identical permissions if it was actually applied to both namespaces through the same reliable process.
- Diff live RBAC objects between environments directly — don't trust that Git source reflects both environments' real state, since manual out-of-band changes are a common drift source.
- Confirm the ServiceAccount name your pod actually runs as matches exactly what the RoleBinding's `subjects` field references, especially if environments use different naming conventions.
- If staging and production are separate clusters, also rule out a missing ClusterRole, not just a missing RoleBinding.

## Interview Follow-Up Questions

- How would you design your GitOps pipeline so RBAC manifests can never drift out of sync between environments the way application manifests do?
- What would you check if the RoleBinding and Role both exist identically in both environments, but the behavior still differs?
- How would you detect this kind of RBAC drift automatically, before a promotion, rather than discovering it via a production error?

## References

- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
