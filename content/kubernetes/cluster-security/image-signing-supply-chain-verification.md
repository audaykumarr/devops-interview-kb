---
id: kubernetes-cluster-security-image-signing-supply-chain-verification-001
title: "How would you design a policy requiring every image deployed to a cluster be cryptographically signed, and what does that actually protect against?"
category: kubernetes
subcategory: cluster-security
technologies:
  - kubernetes
difficulty: expert
question_type:
  - architecture
  - security
tags:
  - kubernetes
  - supply-chain-security
  - image-signing
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An organization wants to guarantee that only images built by its own trusted CI pipeline (not an arbitrary image someone pushed to the registry, or a compromised/tampered image) can actually run in production. How would you design an image-signing and verification system to enforce this, and what specific attack does it actually protect against?

## Short Answer

Sign every image as the final step of your trusted CI pipeline (using a tool like cosign/Sigstore, with the signing key or keyless OIDC-based identity tied specifically to that pipeline), then enforce via an admission policy (Kyverno or Gatekeeper, both support signature verification) that rejects any pod whose image isn't signed by a trusted, expected identity — this protects against an attacker who gains registry push access (through a compromised credential, or a registry-level vulnerability) from getting an untrusted image actually deployed, since the deployed image now requires a valid signature the attacker can't produce without also compromising the CI pipeline's actual signing identity.

## Requirements

- Only images built by the organization's trusted CI pipeline should be deployable.
- An attacker with only registry push access (not CI pipeline access) should not be able to get an image deployed, even if they can push an image to the registry.
- The verification must happen at deployment time (admission), not just be a documentation/process convention that's easy to bypass.

## Detailed Explanation

The specific threat this protects against is registry-level compromise or credential leakage, separate from the CI pipeline itself being compromised — signing binds "this image is trusted" to "this image was produced by the specific trusted pipeline," which a registry push alone can't forge.

## Architecture

**Sign images as the final, trusted step of the CI pipeline, not a separate manual process**: using cosign (or an equivalent), the CI pipeline signs the image's digest as its last build step, using either a managed private key or (increasingly preferred) Sigstore's keyless signing, which ties the signature to a verifiable OIDC identity (the specific CI pipeline/workflow that produced it) rather than a long-lived private key that itself needs protecting.

**Admission-time verification is what actually enforces the policy, not just the existence of a signature**: Kyverno's `verifyImages` policy type (or Gatekeeper's equivalent) checks, at pod admission time, that the image reference's signature is valid and was produced by the expected, trusted signing identity — a pod referencing an unsigned image, or one signed by an untrusted identity, is rejected before it's ever scheduled, closing the gap that a purely process-based "we only push signed images" convention leaves wide open (nothing stops someone from pushing an unsigned or differently-signed image directly).

**Keyless signing (Sigstore/Fulcio/Rekor) avoids the long-lived-key management problem entirely**: rather than managing a private signing key that itself becomes a high-value target (if leaked, an attacker could sign malicious images as if from the trusted pipeline), keyless signing issues short-lived certificates tied to an OIDC identity (the CI workflow's own identity token) at signing time, with the signing event recorded in a public, tamper-evident transparency log (Rekor) — this shifts the trust anchor from "protect this key forever" to "trust this specific CI identity," which is generally easier to reason about and audit.

**This specifically protects against registry-level or credential compromise, not a compromised CI pipeline itself**: if an attacker compromises the actual CI pipeline (its build environment, its signing identity), they could produce a validly-signed malicious image — signing doesn't protect against that scenario; it specifically protects against an attacker who has *some* access (registry push, a leaked deploy credential) but not access to the trusted signing identity itself. Understanding this scope precisely matters for correctly communicating what the control does and doesn't guarantee.

**Combine with vulnerability scanning as a separate, complementary control**: signature verification confirms *provenance* (this image came from the trusted pipeline) but says nothing about whether the image content itself is safe — pairing it with vulnerability scanning (also enforceable via the same admission policy tooling) addresses a genuinely different risk (a trusted pipeline building an image with a known-vulnerable dependency), which signing alone doesn't cover.

## Trade-offs

Enforcing mandatory image signing adds real friction to any deployment path that bypasses the trusted CI pipeline (a developer's manual `docker push` for local testing, an emergency hotfix built outside the normal pipeline) — these paths either need their own signing capability added, or need to be explicitly and deliberately excluded from the policy (with the security trade-off that implies) rather than silently broken by the new policy. This upfront design work is necessary to avoid the policy either being too rigid to actually roll out, or accidentally leaving a documented bypass path that undermines the whole point.

## Key Takeaways

- Image signing at the end of a trusted CI pipeline, verified at admission time, specifically protects against an attacker with registry push access (but not CI pipeline access) getting an untrusted image deployed.
- Admission-time verification (via Kyverno/Gatekeeper) is what actually enforces the policy — a documentation-only "we sign our images" convention doesn't prevent an unsigned image from being deployed.
- Keyless signing (Sigstore) avoids the long-lived private key management problem by tying trust to a verifiable CI identity instead, recorded in a public transparency log.
- Signing verifies provenance, not safety — pair it with vulnerability scanning to also address the separate risk of a trusted pipeline producing an image with known vulnerabilities.

## Interview Follow-Up Questions

- How would you handle a legitimate need for a developer to deploy a locally-built image for testing, given the mandatory signing policy would otherwise block it?
- What would you do if the CI pipeline's own signing identity/credentials were compromised — how would you detect and respond to that?
- How would you extend this policy to also verify a Software Bill of Materials (SBOM) attached to the image, not just the signature itself?

## References

- [Sigstore: cosign](https://docs.sigstore.dev/cosign/overview/)
- [Kyverno: Verify Images](https://kyverno.io/docs/writing-policies/verify-images/)
