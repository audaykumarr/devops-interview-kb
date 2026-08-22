---
id: kubernetes-admission-webhook-failurepolicy-fail-vs-ignore-001
title: "An admission webhook's failurePolicy is set to Fail — what happens if the webhook itself becomes unavailable, and why might that be the wrong default?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - scenario
  - security
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

A `ValidatingWebhookConfiguration` has `failurePolicy: Fail`. The webhook's own pod goes down (a crash, a bad deploy, resource exhaustion). What happens to every API request the webhook was configured to intercept, and why would a team deliberately choose `Fail` despite this risk, versus `Ignore`?

## Short Answer

With `failurePolicy: Fail`, if the webhook itself is unreachable, the API server treats that as a rejection — every matching request (potentially every pod creation cluster-wide, if the webhook's rules are broad) fails until the webhook is healthy again, which can turn a webhook outage into a much bigger cluster-wide outage. Teams choose `Fail` anyway specifically when the webhook enforces a genuine security/correctness requirement where silently *allowing* unchecked requests during an outage (what `Ignore` would do) is considered worse than blocking legitimate requests during that same outage — the choice is a deliberate trade-off between availability and enforcement guarantee strength.

## Detailed Explanation

`failurePolicy` answers a fail-safe-versus-fail-secure question specifically for the case where the webhook itself can't be reached — and the two options genuinely trade different risks against each other, meaning the "right" choice depends entirely on what the webhook is protecting.

## Symptoms

- The webhook's pod becomes unavailable (crashed, evicted, still starting, or genuinely down for any reason).
- New pod creations (or whatever operations the webhook's `rules` cover) start failing cluster-wide with an admission-webhook-related error.
- The scope of impact depends entirely on how broadly the webhook's `rules` and `namespaceSelector` were configured.

## Possible Causes

- The webhook deployment itself crashed, was scaled to zero, or is mid-rollout and temporarily has zero ready replicas.
- The webhook's TLS certificate (used for the API server to authenticate the webhook's TLS endpoint) expired, causing every connection attempt to fail even though the pod itself is running.
- Network policy or DNS changes broke the API server's ability to reach the webhook's service endpoint.

## Investigation Steps

**Confirm `failurePolicy` is indeed the reason for the cluster-wide impact**: `kubectl get validatingwebhookconfiguration <name> -o yaml` — checking `failurePolicy` directly confirms whether this is expected `Fail`-driven behavior versus some other, unrelated cause producing a similar-looking symptom.

**Check the webhook's own pod health and readiness**: `kubectl get pods -n <webhook-namespace>` — a straightforward crash or scale-to-zero is the most common and most directly diagnosable cause.

**Check the webhook's TLS certificate expiry specifically**: webhook TLS certs are a common, easy-to-overlook expiration trap, since the pod itself can look perfectly healthy while TLS handshakes to it are failing — checking the certificate's actual expiry date against the current date directly rules this in or out.

**Check the scope of impact by reviewing the webhook's `rules`/`namespaceSelector`**: understanding exactly which operations and namespaces are affected (all pod creates cluster-wide, or something narrower) clarifies the actual blast radius of this specific outage, which matters for prioritizing the incident response.

## Resolution

Restore the webhook's availability (fix the crash, renew the certificate, restore network connectivity) as the immediate fix — this is the correct, complete resolution when the webhook enforces something genuinely important. For an emergency where the webhook can't be quickly restored and the outage itself is now the bigger problem, temporarily changing `failurePolicy` to `Ignore` (or deleting the webhook configuration entirely, as a more drastic measure) unblocks the cluster at the cost of temporarily not enforcing whatever the webhook protects — this should be a deliberate, understood, and reverted-afterward decision, not a permanent fix.

## Key Takeaways

- `failurePolicy: Fail` means a webhook outage blocks every matching request cluster-wide — this can turn a small webhook incident into a much larger cluster outage.
- `failurePolicy: Ignore` avoids that cluster-wide blocking risk, but means requests proceed unchecked during any webhook outage, silently bypassing whatever the webhook was meant to enforce.
- Teams choose `Fail` deliberately when unchecked requests during an outage pose a greater risk than blocked legitimate requests — this is a real security/availability trade-off, not a default to leave unexamined.
- Webhook TLS certificate expiry is a common, easy-to-overlook cause of exactly this failure mode, since the pod can look healthy while the TLS connection itself fails.

## Interview Follow-Up Questions

- How would you design a highly-available webhook deployment specifically to minimize the risk of `failurePolicy: Fail` causing a cluster-wide outage?
- How would you set up alerting to catch a webhook's TLS certificate approaching expiry, well before it actually causes an incident?
- What would you use `namespaceSelector` for, specifically to protect `kube-system` or other bootstrap-critical namespaces from being blocked by a `Fail`-policy webhook outage?

## References

- [Kubernetes: Dynamic Admission Control — failurePolicy](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#failure-policy)
