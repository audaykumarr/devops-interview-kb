---
id: kubernetes-rbac-migrating-legacy-workload-restricted-pss-001
title: "A Pod Security Standard (restricted) rejects a legacy workload that needs to run as root — how do you handle this without disabling the standard cluster-wide?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - scenario
  - security
tags:
  - kubernetes
  - pod-security-standards
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Your cluster enforces the `restricted` Pod Security Standard at the namespace level. A legacy application — old enough that its container image genuinely requires running as root and can't easily be rebuilt to run as a non-root user — needs to be deployed, and its pod spec is being rejected by admission control. Disabling `restricted` cluster-wide isn't acceptable; how do you handle this one workload?

## Short Answer

Move the legacy workload into its own dedicated namespace labeled with a less restrictive Pod Security Standard level (`baseline`, or `privileged` only if genuinely justified), keeping `restricted` enforced everywhere else — Pod Security Standards are enforced per-namespace via labels, so this is a namespace-level exemption, not a cluster-wide relaxation, and it should be paired with a concrete plan (and tracked ticket) to actually fix the image to run as non-root.

## Detailed Explanation

**Pod Security Standards are enforced per-namespace, not cluster-wide as a single switch**: the `pod-security.kubernetes.io/enforce` label (along with `warn` and `audit` variants) is set on individual namespaces, meaning different namespaces in the same cluster can enforce different levels simultaneously — this is exactly the mechanism that makes a targeted exemption possible without weakening the standard for every other workload in the cluster.

**Create a dedicated namespace for the legacy workload, don't relax an existing shared one**: moving the workload into its own namespace (rather than lowering the standard on a namespace that also hosts other, compliant workloads) keeps the exemption's blast radius limited to exactly the one workload that needs it — a shared namespace with a lowered standard would silently also permit any other workload later deployed into it to skip the restriction.

**Choose the least permissive level that actually satisfies the requirement**: `baseline` blocks known privilege escalations while still allowing things like running as root (which `restricted` blocks) — if the legacy workload's actual requirement is "runs as root" and nothing more exotic, `baseline` is very likely sufficient, and is a meaningfully smaller exemption than dropping to `privileged`, which disables nearly all pod-level security restrictions.

**Compensate with other controls that don't depend on the Pod Security Standard**: since this namespace now permits more than the cluster default, layering additional protections — a stricter NetworkPolicy limiting what the workload can reach, tighter RBAC on its ServiceAccount, and continued vulnerability scanning on the image — meaningfully reduces the residual risk from the relaxed Pod Security Standard, rather than treating the namespace-level exemption as the end of the mitigation.

**Make the exemption visible and time-bound, not silent and permanent**: labeling the namespace clearly (naming convention, annotation noting the justification and an owning team), and tracking a concrete remediation ticket to actually update the image to run as non-root, keeps this from becoming a permanent, unexplained exception that a future security review discovers with no context — the goal is a documented, temporary trade-off, not a silent permanent hole.

**Consider whether `warn`/`audit` modes on the standard namespace can still provide visibility**: setting `pod-security.kubernetes.io/audit` and `pod-security.kubernetes.io/warn` to `restricted` even while `enforce` is set to `baseline` means violations still show up in audit logs and `kubectl` warnings, giving ongoing visibility into exactly how far the workload is drifting from the target standard, which is useful evidence for prioritizing the eventual fix.

## Key Takeaways

- Pod Security Standards are enforced per-namespace via labels, so a targeted exemption is a namespace-level scoping decision, not a cluster-wide relaxation.
- Give the legacy workload its own dedicated namespace rather than lowering the standard on a namespace shared with compliant workloads.
- Choose the least permissive level that actually satisfies the requirement (`baseline` before `privileged`), and compensate with NetworkPolicy/RBAC/scanning controls that don't depend on the Pod Security Standard.
- Make the exemption visible and time-bound (documented justification, remediation ticket), and consider keeping `audit`/`warn` at the stricter level even while `enforce` is relaxed.

## Interview Follow-Up Questions

- How would you use `warn` and `audit` modes to measure how many workloads would actually fail if you tightened a namespace's enforced standard, before actually making that change?
- What would you do if the legacy application's vendor confirms it will never support running as non-root — how does that change your long-term plan?
- How would you prevent new workloads from accidentally being deployed into the relaxed namespace instead of getting their own properly-scoped one?

## References

- [Kubernetes: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes: Enforce Pod Security Standards with Namespace Labels](https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/)
