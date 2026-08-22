---
id: gitops-repository-patterns-secrets-handling-001
title: "GitOps means Git is the source of truth for everything deployed, but you obviously can't commit plaintext secrets to Git. How do you actually reconcile this?"
category: gitops
subcategory: repository-patterns
technologies:
  - gitops
  - security
difficulty: advanced
question_type:
  - security
  - architecture
tags:
  - gitops
  - secrets-management
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

GitOps is built around the principle that Git is the single source of truth for everything that should be deployed. But you obviously can't commit plaintext secrets (database passwords, API keys) to a Git repository, even a private one. How do you actually reconcile GitOps' "everything in Git" principle with secrets that genuinely can't live there in plaintext?

## Short Answer

Commit an encrypted or reference form of the secret to Git instead of the plaintext value — either encrypt the secret in place using a tool like Sealed Secrets (so the encrypted blob is safe to commit, and only the cluster's private key can decrypt it) or commit a reference to a secret stored in an external secrets manager (Vault, AWS Secrets Manager) that gets resolved into an actual value at deploy time via a tool like External Secrets Operator — either approach keeps Git as the source of truth for *that a secret should exist and where it comes from*, without the plaintext value itself ever touching the repository.

## Detailed Explanation

The reconciliation isn't actually a compromise on "Git as source of truth" — it's a clarification of what Git needs to be the source of truth for: the *desired state and structure* of your secrets (this Deployment needs this secret, sourced from this location), not necessarily the raw secret *value* itself, which can legitimately live in a system specifically designed to protect it.

## Requirements

- Plaintext secret values must never be committed to the Git repository, even in a private repo.
- Git should still declare, in some form, that a given secret should exist and be available to a given workload.
- The mechanism must integrate with the normal GitOps reconciliation loop, so secrets are applied automatically like any other resource, not requiring a separate manual step.

## Architecture

**Encrypted-in-Git approach (Sealed Secrets)**: a controller running in the cluster holds a private key; secrets are encrypted client-side (using the corresponding public key) before being committed to Git as a `SealedSecret` resource — the encrypted blob is safe to commit and store in Git, since only the specific cluster's controller (holding the private key) can decrypt it back into a usable Kubernetes `Secret`. This keeps the actual secret material fully within the GitOps flow (it's still a Git-tracked resource, just encrypted), at the cost of needing to manage the encryption key and re-encrypt if it's ever rotated.

**External-reference approach (External Secrets Operator or similar)**: rather than storing even an encrypted form of the secret in Git, Git declares a reference to where the actual secret lives — an entry in Vault, AWS Secrets Manager, or another external secrets manager — and a controller running in the cluster resolves that reference into an actual Kubernetes `Secret` at reconciliation time, fetching the live value from the external system. This keeps the actual secret value entirely outside Git (even in encrypted form), with Git only declaring the reference/pointer, and has the advantage of automatically picking up secret rotation from the external store without requiring any Git change at all.

**Choosing between the two approaches**: the encrypted-in-Git approach keeps everything self-contained within the GitOps flow but ties you to managing the encryption keys and re-encrypting secrets on rotation; the external-reference approach depends on already having (or being willing to adopt) an external secrets manager, but centralizes actual secret storage and rotation in a system specifically built for that purpose (with better audit logging, access policies, and native rotation support than a Git-native encryption scheme typically provides) — for organizations already running or planning to run a dedicated secrets manager (see the related secrets-management-platform system-design question), the external-reference approach is often the more consistent, better-integrated choice.

**Access control still needs to be considered on both sides**: for the encrypted-in-Git approach, control who can decrypt (i.e., who has cluster access to the controller holding the private key); for the external-reference approach, control access to the external secrets manager itself, and ensure the cluster's own identity used to fetch secrets is appropriately scoped, not overly broad.

## Trade-offs

The encrypted-in-Git approach is simpler to adopt if you don't already have an external secrets manager, but couples secret rotation to a Git-committed re-encryption step and requires careful key management. The external-reference approach avoids that coupling and gets native rotation support, but requires the additional infrastructure investment of running (or subscribing to) a dedicated secrets manager and its own integration — a real prerequisite cost if you don't already have one in place.

## Key Takeaways

- The GitOps "Git as source of truth" principle applies to the desired existence and structure of secrets, not necessarily the raw plaintext value itself, which can legitimately live outside Git.
- Sealed Secrets encrypts the secret value so an encrypted blob is safely committable to Git, decryptable only by the specific cluster's controller.
- External Secrets Operator (or similar) keeps Git as just a reference/pointer to a secret stored in an external secrets manager, resolved into a real value at reconciliation time.
- The external-reference approach centralizes secret storage and rotation in a system built for it, and is often the more consistent choice for organizations already investing in dedicated secrets management infrastructure.

## Interview Follow-Up Questions

- How would you handle rotating the private key used by Sealed Secrets without breaking existing encrypted secrets in Git?
- How would you audit which secrets are actually in use across your GitOps-managed clusters, given they might be encrypted or referenced rather than plainly visible?
- How would you migrate from a Sealed Secrets-based approach to an external-reference approach without a disruptive cutover?

## References

- [Bitnami Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [External Secrets Operator](https://external-secrets.io/latest/)
