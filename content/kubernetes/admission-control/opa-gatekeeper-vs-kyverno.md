---
id: kubernetes-admission-opa-gatekeeper-vs-kyverno-001
title: "How do OPA Gatekeeper and Kyverno actually differ as policy engines for Kubernetes admission control, and which would you choose?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
  - opa
  - kyverno
difficulty: intermediate
question_type:
  - comparison
tags:
  - kubernetes
  - admission-control
  - policy-as-code
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Both OPA Gatekeeper and Kyverno let you enforce policies ("every pod must have resource limits," "no `:latest` image tags") via admission webhooks, without writing a custom webhook yourself. What's actually different between how they work, and what would drive choosing one over the other?

## Short Answer

OPA Gatekeeper policies are written in Rego, a general-purpose policy language originally designed for the broader Open Policy Agent project (usable well beyond Kubernetes) — this gives real expressive power but has a genuine learning curve for teams unfamiliar with it. Kyverno policies are written as plain Kubernetes YAML/JSON manifests, using a declarative, Kubernetes-native syntax with no separate language to learn — this is generally faster to adopt for teams already comfortable with Kubernetes YAML, at some cost in expressiveness for genuinely complex policy logic compared to Rego.

## Detailed Explanation

**Gatekeeper's Rego-based policies come from OPA's broader, non-Kubernetes-specific design**: Open Policy Agent (the project Gatekeeper builds on) is a general-purpose policy engine used well beyond Kubernetes (API authorization, CI/CD gates, other infrastructure policy) — Rego is a genuinely powerful, purpose-built policy language, but it's also a distinct language with its own syntax and mental model that a team needs to actually learn, separate from anything else in their Kubernetes toolchain.

**Kyverno's policies are Kubernetes-native YAML, with no new language required**: a Kyverno `ClusterPolicy` is itself a Kubernetes custom resource, expressed in the same YAML syntax used for every other Kubernetes manifest — this dramatically lowers the barrier to writing and reading policies for a team already fluent in Kubernetes YAML, at the cost of Rego's more general-purpose expressive power for policies with genuinely complex conditional logic.

**Both integrate as admission webhooks (validating and mutating) under the hood**: neither tool is a fundamentally different mechanism from the raw webhook system covered elsewhere — both deploy their own controller that registers as a `ValidatingWebhookConfiguration`/`MutatingWebhookConfiguration`, meaning everything true about webhook behavior generally (mutate-before-validate ordering, `failurePolicy` risk, certificate management) applies to both tools equally.

**Kyverno also supports mutation and image verification more directly in its native model**: beyond validation, Kyverno's YAML-based policies natively express mutation (adding a default label, injecting a value) and even image signature verification (rejecting unsigned images) using the same declarative style — Gatekeeper can express similar things via Rego, but Kyverno's built-in, purpose-specific policy types for these common cases can be more directly usable without writing general-purpose Rego logic for them.

**Gatekeeper's Rego investment pays off for genuinely complex, cross-cutting policy logic**: for policies that need real conditional complexity (multi-step reasoning across several resource types, integration with external data sources via Rego's broader ecosystem) Rego's general-purpose expressiveness is a genuine advantage — a team already using OPA/Rego elsewhere (API gateways, CI policy) also gets a consistent policy language across their whole stack, which is a real organizational benefit Kyverno's Kubernetes-only scope doesn't provide.

**The choice often comes down to team background and the actual complexity of policies needed**: a team already comfortable with (or already using) Rego elsewhere benefits from Gatekeeper's consistency; a team wanting the fastest path to writing and maintaining straightforward Kubernetes-specific policies, without a new language to learn, is often better served by Kyverno — for the majority of common policies (require resource limits, disallow privileged containers, enforce label conventions), both tools are genuinely capable, and the difference is more about team fit than raw capability.

## Key Takeaways

- Gatekeeper uses Rego, a general-purpose policy language with real expressive power and a genuine learning curve, from the broader OPA ecosystem.
- Kyverno uses plain Kubernetes YAML for policies, dramatically lowering the barrier to entry for teams already fluent in Kubernetes manifests.
- Both integrate as admission webhooks under the hood, so general webhook behavior (ordering, failurePolicy risk, certificate management) applies equally to both.
- The choice often comes down to team background (existing Rego/OPA familiarity favors Gatekeeper) and policy complexity needs, more than one tool being strictly more capable than the other for common cases.

## Interview Follow-Up Questions

- How would you write a policy in each tool to require every container to specify CPU/memory limits, and how does the authoring experience actually differ?
- How would you migrate an existing set of Gatekeeper policies to Kyverno (or vice versa), and what would be the hardest part?
- How would you test policies from either tool in a CI pipeline before they're actually enforced in a live cluster?

## References

- [OPA Gatekeeper: Documentation](https://open-policy-agent.github.io/gatekeeper/website/docs/)
- [Kyverno: Documentation](https://kyverno.io/docs/)
