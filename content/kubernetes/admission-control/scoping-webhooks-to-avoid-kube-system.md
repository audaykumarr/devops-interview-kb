---
id: kubernetes-admission-scoping-webhooks-avoid-kube-system-001
title: "A new mutating webhook accidentally intercepted kube-system pod creation and broke core cluster components — how would you design its scoping to prevent this?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - scenario
  - practical
tags:
  - kubernetes
  - admission-control
  - webhooks
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A new mutating webhook, meant to inject a sidecar into application pods, was deployed without a `namespaceSelector` restriction. It ended up intercepting pod creation in `kube-system` too, and a core component (CoreDNS, or a CNI plugin pod) failed to start correctly with the sidecar injected into it, causing a broader cluster networking problem. How would you scope the webhook to prevent this, and what would you check before deploying any new webhook going forward?

## Short Answer

Scope every webhook explicitly with `namespaceSelector` to exclude critical system namespaces (`kube-system`, the webhook's own namespace, and any other cluster-critical namespace) by default, using a label-based exclusion pattern (label those namespaces, then select on the *absence* of that label) — this makes exclusion an explicit, positive configuration rather than relying on remembering to scope every new webhook correctly by hand each time.

## Detailed Explanation

The incident happened because namespace scoping was left to default (unrestricted) rather than being an explicit, deliberate decision — the fix is making safe scoping the path of least resistance for every future webhook, not just patching this one.

## Requirements

- New application-focused webhooks (sidecar injection, security mutation) should never intercept cluster-critical system namespaces.
- The exclusion should be robust against someone forgetting to configure it correctly on a new webhook, not rely purely on developer discipline each time.
- Legitimate namespace scoping needs (a webhook that genuinely should apply broadly) shouldn't be broken by an overly rigid default.

## Architecture

**`namespaceSelector` is the mechanism, but needs a deliberate, consistent convention to actually be safe**: `namespaceSelector` on a `WebhookConfiguration` filters which namespaces' objects the webhook applies to, based on namespace labels — the mechanism exists specifically for this purpose, but it only protects against accidents if it's actually configured correctly on every webhook, which requires an organizational convention, not just the technical capability.

**Label critical namespaces for exclusion, and have every new webhook explicitly exclude that label**: applying a label like `admission.kubernetes.io/ignore: "true"` (or an organization-specific equivalent) to `kube-system` and other cluster-critical namespaces, then configuring every new webhook's `namespaceSelector` to exclude namespaces carrying that label, creates a consistent, auditable exclusion pattern — new webhooks inherit safety by following the established convention, rather than each webhook author needing to independently remember and correctly implement namespace exclusion from scratch.

**Kubernetes itself labels `kube-system` and other default namespaces with `kubernetes.io/metadata.name`**, which can be used directly in a `namespaceSelector`'s `matchExpressions` to exclude specific well-known namespaces by name, as an additional or alternative layer to a custom exclusion label — combining both (a custom convention label for organization-specific critical namespaces, plus explicit exclusion of well-known system namespace names) gives defense in depth against either approach alone missing something.

**Establish a required pre-deployment review/checklist for any new webhook, given the blast radius of getting this wrong**: because a misscoped webhook can affect core cluster components (as happened here) rather than just application workloads, treating new webhook deployment as requiring an explicit review step (confirming `namespaceSelector` correctly excludes critical namespaces, confirming `failurePolicy` is deliberately chosen, confirming the webhook has been tested against a representative pod spec) is a reasonable process control given how much broader the impact can be compared to a typical application deployment mistake.

**Test new webhooks in a non-production cluster first, specifically including cluster-critical namespaces in that test**: a staging cluster that mirrors production's namespace structure (including its own `kube-system`) lets a new webhook's actual behavior against system namespaces be verified before it's ever deployed anywhere it could cause real damage.

## Trade-offs

Enforcing a strict namespace-exclusion convention adds a small amount of process overhead to deploying any new webhook (remembering to apply/verify the exclusion), but this is clearly worth it given the blast radius difference between "an application webhook misbehaves for one team's pods" and "a core cluster component fails to start, causing a broader networking incident." For organizations with very few webhooks and tight central control over who deploys them, informal discipline might suffice; for anything larger or with multiple teams able to deploy webhooks, the label-based convention is worth the small ongoing overhead.

## Key Takeaways

- `namespaceSelector` is the technical mechanism for excluding critical namespaces, but only protects against accidents if consistently and correctly configured on every webhook.
- A label-based exclusion convention (label critical namespaces, have every webhook exclude that label) makes safety the default pattern new webhooks inherit, rather than something each author must independently remember.
- Kubernetes' built-in `kubernetes.io/metadata.name` label can directly exclude well-known namespaces by name as an additional safety layer.
- Given the outsized blast radius of a misscoped webhook (potentially affecting core cluster components, not just application workloads), a required pre-deployment review process is a reasonable, proportionate control.

## Interview Follow-Up Questions

- How would you audit all currently-deployed webhooks in a cluster to confirm they correctly exclude `kube-system` and other critical namespaces?
- What would you do if a webhook genuinely does need to apply to a normally-excluded namespace for a specific, legitimate reason?
- How would you design a pre-deployment automated check (in CI) that catches a webhook configuration missing the required namespace exclusion, before it's ever applied to a real cluster?

## References

- [Kubernetes: Dynamic Admission Control — Matching requests: namespaceSelector](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#matching-requests-namespaceselector)
