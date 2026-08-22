---
id: kubernetes-admission-webhook-certificate-expiry-outage-001
title: "Every pod creation cluster-wide suddenly starts failing with an admission webhook TLS error — what happened, and how do you recover quickly?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: expert
question_type:
  - troubleshooting
  - scenario
tags:
  - kubernetes
  - admission-control
  - incident-response
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Without any recent deployment or configuration change, every new pod creation across the entire cluster suddenly starts failing, with errors referencing a TLS handshake failure to an admission webhook's service. Nothing about the webhook's pod or code changed. What's the likely cause, and how do you both fix it quickly and prevent recurrence?

## Short Answer

This is almost certainly the webhook's TLS certificate expiring — a slow-motion, entirely predictable failure that manifests suddenly because certificates are valid until an exact instant, then immediately invalid. With `failurePolicy: Fail` (common for security-critical webhooks), an expired cert means the API server can no longer establish a trusted connection to the webhook, and every matching request fails cluster-wide. Recovery means renewing (or reissuing) the certificate and updating the webhook configuration's `caBundle`; prevention means automated certificate rotation with alerting well before the next expiry.

## Detailed Explanation

Nothing about the webhook's code or pod needed to change for this to happen — a certificate's validity period is a fixed, entirely predictable countdown, and this class of incident is specifically what happens when that countdown wasn't being actively monitored or automatically renewed before it expired.

## Symptoms

- Every pod creation (or whatever operations the affected webhook covers) fails cluster-wide, starting abruptly at a specific point in time.
- Error messages reference a TLS/certificate problem connecting to the webhook's service, not a webhook-logic rejection.
- No recent deployment, code change, or configuration change to the webhook coincides with the failure's onset.

## Possible Causes

- The webhook's serving certificate (used by the API server to establish a trusted TLS connection to the webhook) reached its expiry date.
- The `caBundle` field in the `WebhookConfiguration` object (the CA certificate the API server trusts for verifying the webhook's certificate) is itself stale or doesn't match a recently-rotated certificate.
- A cert-manager (or equivalent) automated rotation process that should have renewed the certificate ahead of expiry failed silently, without anyone noticing until the actual expiry hit.

## Investigation Steps

**Check the webhook's actual certificate expiry date directly**: inspecting the certificate served by the webhook's endpoint (via `openssl s_client` against the service, or checking the Secret holding the certificate if it's stored as one) for its `notAfter` date — if this is in the past or very close to now, that's the direct confirmation.

**Check whether `caBundle` in the WebhookConfiguration matches the certificate actually being served**: `kubectl get validatingwebhookconfiguration <name> -o yaml` — the `caBundle` field needs to correspond to the CA that issued the webhook's current serving certificate; a mismatch here (from a rotation that updated the certificate but didn't update this field) causes the same TLS failure symptom even with a technically-valid new certificate.

**Check whether an automated certificate-rotation mechanism exists and why it apparently failed**: if cert-manager (or a similar tool) is supposed to be managing this certificate's lifecycle automatically, checking its own logs/events for that specific Certificate resource reveals whether the rotation attempt itself failed (and why), which is important context for preventing recurrence, not just fixing this instance.

## Resolution

**Immediate recovery**: manually issue or renew the certificate and update both the webhook's serving certificate (as a Secret it reads) and the `caBundle` field in the WebhookConfiguration to match — this restores the trusted TLS connection and unblocks pod creation cluster-wide. If the outage is severe and immediate recovery isn't fast enough, temporarily setting `failurePolicy: Ignore` (understanding the enforcement gap this creates) can unblock the cluster while the certificate is properly fixed, as a deliberate, temporary emergency measure.

**Prevention**: set up automated certificate rotation (cert-manager is the standard tool for this in Kubernetes) with a renewal window well before actual expiry (renewing at, say, 30 days before expiry for a 90-day certificate), and — critically — alert specifically on certificate expiry approaching, independent of whether automated rotation is expected to handle it, since this incident is exactly what happens when automated rotation silently fails and nobody was separately watching the expiry date as a backstop.

## Key Takeaways

- A webhook TLS certificate reaching its predictable expiry date is a common, entirely preventable cause of a sudden, cluster-wide admission failure.
- `caBundle` in the WebhookConfiguration must match the CA of the certificate actually being served — a rotation that updates one without the other reproduces the same TLS failure symptom.
- Immediate recovery means fixing the certificate/caBundle mismatch; for a severe outage, temporarily relaxing `failurePolicy` is a deliberate emergency measure, not a permanent fix.
- Prevention requires both automated rotation (cert-manager) and independent alerting on approaching expiry, since automated rotation can itself fail silently without a separate backstop watching the actual expiry date.

## Interview Follow-Up Questions

- How would you design monitoring that alerts on certificate expiry across every webhook in a cluster, not just one you happen to know to check?
- What would you do if cert-manager itself is the component that's failing to renew, given it's supposed to be the automated safety net?
- How would you test that a certificate rotation actually updated both the serving certificate and the `caBundle` correctly, before the next expiry cycle relies on it?

## References

- [Kubernetes: Dynamic Admission Control — Contacting the webhook](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#contacting-the-webhook)
- [cert-manager: Documentation](https://cert-manager.io/docs/)
