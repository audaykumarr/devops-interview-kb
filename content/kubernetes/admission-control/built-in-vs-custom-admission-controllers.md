---
id: kubernetes-admission-builtin-vs-custom-controllers-001
title: "Kubernetes has built-in admission controllers compiled into the API server, separate from webhook-based ones — what's the actual difference and when does it matter?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - kubernetes
  - admission-control
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Kubernetes' admission control system includes both built-in admission controllers (like `NamespaceLifecycle`, `ResourceQuota`, `LimitRanger`) compiled directly into the API server, and dynamic webhook-based ones (Gatekeeper, Kyverno, custom webhooks). What's actually different about how these two categories work, and when would understanding that distinction matter practically?

## Short Answer

Built-in admission controllers are compiled into the `kube-apiserver` binary itself, enabled/disabled via a startup flag (`--enable-admission-plugins`), and run in-process — no network call, no separate deployment, no additional latency or failure mode beyond the API server's own health. Webhook-based admission control (`ValidatingWebhookConfiguration`/`MutatingWebhookConfiguration`) is dynamic and pluggable — anyone can register one without modifying the API server at all, but each one is a genuinely separate network call to a separate service, with its own availability, latency, and failure-mode considerations that built-in controllers simply don't have.

## Detailed Explanation

**Built-in admission controllers are part of the API server's own compiled code**: things like `NamespaceLifecycle` (preventing operations on a namespace being deleted), `ResourceQuota` (enforcing quota limits), and `LimitRanger` (applying default resource limits) ship as part of Kubernetes itself — a cluster operator enables or disables them via the API server's startup configuration, but can't add a genuinely new one without modifying and rebuilding the API server itself, which isn't something most cluster operators ever do.

**Webhook-based admission control is Kubernetes' extension point for anyone to add custom logic without touching the API server's code**: registering a `ValidatingWebhookConfiguration` or `MutatingWebhookConfiguration` is a normal API operation, available to any sufficiently-privileged user — this is exactly what makes tools like Gatekeeper, Kyverno, cert-manager's webhook, and service mesh sidecar injectors possible, all without any of them needing to be part of Kubernetes' own source code.

**The operational difference is real and matters for reliability planning**: a built-in admission controller's "availability" is identical to the API server's own availability — there's no separate thing that can independently fail. A webhook-based one introduces a genuinely separate failure mode (the webhook service being unreachable, slow, or erroring) layered on top of API server availability — this is exactly why `failurePolicy`, TLS certificate management, and webhook high-availability design matter specifically for the webhook category, with no equivalent concern for built-in controllers.

**Latency is a similarly real, practical difference**: a built-in controller's logic runs in-process, adding negligible latency to a request; a webhook adds a genuine network round-trip (API server to webhook service and back) for every matching request — for a cluster with many webhooks all matching the same common operations (pod creation, for instance), this accumulated latency is a real, measurable cost worth being aware of when designing how many webhooks intercept the same hot-path operations.

**Both categories run within the same overall admission control pipeline, in a defined relative order**: built-in admission controllers and webhook-based admission control aren't two separate systems running independently — they're both part of the single admission control chain the API server executes for each request, with built-in controllers and webhooks each having their place in that overall sequence (mutating webhooks running among/after relevant built-in mutating controllers, similarly for validating).

## Key Takeaways

- Built-in admission controllers are compiled into the API server itself, enabled via startup flags, with no separate network call or independent failure mode.
- Webhook-based admission control is Kubernetes' pluggable extension point — anyone can register one without modifying the API server, but each one introduces a genuinely separate network dependency.
- Webhooks add real latency (a network round-trip per matching request) and a real independent failure mode (webhook availability, TLS certs) that built-in controllers simply don't have.
- Both categories participate in the same overall admission control pipeline for each request, not as two separate, independently-running systems.

## Interview Follow-Up Questions

- How would you check which built-in admission controllers are actually enabled on a given cluster, given this isn't always visible via `kubectl` the way webhook configurations are?
- What's the practical latency impact of having many webhooks all matching common operations like pod creation, and how would you measure it on a real cluster?
- Why can't a typical cluster operator add a new built-in admission controller without modifying Kubernetes itself, and how does that constraint shape when webhook-based extension is the only realistic option?

## References

- [Kubernetes: Admission Controllers Reference](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
