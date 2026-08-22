---
id: devsecops-supply-chain-security-artifact-signing-001
title: "How would you design artifact signing into your CI/CD pipeline so a deployed container image or binary can be verified as genuinely coming from your build, not tampered with in transit?"
category: devsecops
subcategory: supply-chain-security
technologies:
  - devsecops
difficulty: advanced
question_type:
  - architecture
tags:
  - artifact-signing
  - supply-chain-security
  - sigstore
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

How would you design artifact signing into your CI/CD pipeline so that a container image or binary being deployed can be cryptographically verified as genuinely coming from your build process, and not tampered with somewhere between build and deployment?

## Short Answer

Sign every artifact as the last step of a trusted build, using short-lived, identity-based signing (via Sigstore/cosign, tied to your CI system's own workload identity) rather than managing long-lived private signing keys yourself, then add a verification gate in your deployment pipeline that refuses to deploy any artifact whose signature doesn't check out — the combination means a tampered or substituted artifact simply can't pass deployment, regardless of how the tampering happened.

## Detailed Explanation

The threat this addresses is specifically tampering *after* a legitimate build but *before* deployment — a compromised artifact registry, a man-in-the-middle substitution, or a compromised deployment pipeline swapping in a malicious artifact. Signing alone doesn't prevent tampering; it makes tampering detectable, which only has value if verification is actually enforced as a hard gate rather than an optional check.

## Requirements

- Every artifact produced by a trusted build must be signed automatically, as part of the build, not as a manual or optional step.
- Signing keys must not be long-lived static secrets that could themselves be stolen and used to forge signatures.
- Deployment must be gated on successful signature verification, not just informed by it.

## Architecture

**Keyless, identity-based signing via Sigstore/cosign**: rather than generating and protecting a long-lived private signing key (itself a high-value target and operational burden), Sigstore's keyless signing ties the signature to your CI system's short-lived workload identity (via OIDC) at the moment of signing — the signature is verifiable without you ever having to manage or protect a persistent private key.

**Sign as the final build step, tied to a specific commit and build**: signing happens immediately after the artifact is produced, within the same trusted CI job, so the signature attests to exactly this specific build output — combining this with build provenance (see the related provenance/SLSA discussion) gives you both "this wasn't tampered with" and "here's exactly how it was built."

**Mandatory verification gate before deployment**: your deployment pipeline (or, for Kubernetes, an admission controller) checks the artifact's signature before allowing it to run, and refuses deployment on verification failure — this is the step that actually converts "we could detect tampering" into "tampering can't reach production," and is the part that's easy to skip if signing is treated as a checkbox rather than an enforced control.

**Transparency log for auditability**: Sigstore's public transparency log (Rekor) records every signing event, giving you (and, if relevant, external parties) an independently auditable record of what was signed and when, beyond what your own internal logs alone would provide.

## Trade-offs

Enforcing a hard verification gate means a signing or verification infrastructure outage can block legitimate deployments — this needs to be weighed against the security benefit, typically with a well-tested fallback/escalation path rather than either silently bypassing verification or having no recourse during an outage. Keyless signing also introduces a dependency on the Sigstore public infrastructure (or a self-hosted equivalent) being available and trustworthy.

## Key Takeaways

- Signing detects tampering; it only has real security value when deployment is hard-gated on successful verification, not just informed by it.
- Keyless, identity-based signing (Sigstore/cosign) avoids the operational burden and risk of managing long-lived private signing keys yourself.
- Sign as the final step of a trusted build, ideally combined with build provenance, so the signature attests to a specific, known build output.
- Plan for a signing/verification infrastructure outage with a tested fallback, rather than either silently bypassing the gate or having no recourse.

## Interview Follow-Up Questions

- How would you handle a legitimate emergency deployment if your signature verification infrastructure is down?
- How would you extend this signing/verification model to cover your dependencies' artifacts, not just your own build outputs?
- What would you check first if a deployment's signature verification unexpectedly failed in production?

## References

- [Sigstore](https://www.sigstore.dev/)
- [Kubernetes: Verify image signatures with admission controllers](https://kubernetes.io/docs/tasks/administer-cluster/verify-signed-artifacts/)
