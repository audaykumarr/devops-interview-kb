---
id: kubernetes-configuration-managing-secrets-across-environments-gitops-001
title: "How would you manage Secrets across dev/staging/prod without committing plaintext to Git, while staying GitOps-declarative?"
category: kubernetes
subcategory: configuration
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - architecture
tags:
  - kubernetes
  - secrets
  - gitops
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team runs a GitOps pipeline (Argo CD or similar) where the desired state of every environment is declared in Git. Application manifests fit this model naturally. Secrets don't — committing plaintext credentials to Git is unacceptable, but the whole point of GitOps is that Git is the single source of truth. How would you resolve this tension?

## Short Answer

Don't commit plaintext Secrets to Git at all — instead commit either an *encrypted* representation that's safe to store in Git (Sealed Secrets, which only the target cluster's controller can decrypt), or a *reference* to a secret stored in an external secrets manager (via the External Secrets Operator, which syncs the real value from Vault/AWS Secrets Manager/etc. into a real Kubernetes Secret at the cluster level, never storing the value in Git). Both approaches keep Git as the source of truth for *what secret should exist*, without Git ever holding the actual sensitive value.

## Detailed Explanation

The tension is real but not fundamental — it dissolves once you separate "Git declares what should exist" from "Git holds the actual sensitive value," which are conflated in a naive approach but don't have to be. Both mainstream solutions below keep the declarative GitOps model fully intact while satisfying that separation.

## Requirements

- Git must remain the declarative source of truth for which Secrets should exist in each environment.
- No plaintext (or trivially-reversible, like bare base64) sensitive value may ever be committed to Git.
- Argo CD (or an equivalent GitOps controller) must be able to sync the declared state without a manual, out-of-band step per environment.
- The approach must handle per-environment differences (dev/staging/prod each needing different actual values) within the same GitOps structure already used for other config.

## Architecture

**Sealed Secrets: encrypt before committing, decrypt only in-cluster**: the Bitnami Sealed Secrets controller runs in the target cluster with a private key; a `kubectl` plugin encrypts a Secret's content using the cluster's public key before it's committed to Git as a `SealedSecret` custom resource — this ciphertext is safe to store in a public repo, since only the specific cluster holding the matching private key can decrypt it back into a real Secret. This keeps the full GitOps model intact (Git declares the SealedSecret, Argo CD syncs it, the in-cluster controller decrypts it).

**External Secrets Operator: Git holds a reference, not the value**: a different approach declares an `ExternalSecret` custom resource in Git that *references* a secret's location in an external system (a specific path in Vault, a specific secret name in AWS Secrets Manager) — the External Secrets Operator, running in-cluster, fetches the actual value from that external system and materializes it as a real Kubernetes Secret. Git never holds the value at all, even in encrypted form; it just holds a pointer, and the actual secret management (rotation, access control, audit) happens in the external system that's often already the organization's established source of truth for secrets.

**Per-environment differences are handled the same way as any other GitOps-managed config difference**: whether using Sealed Secrets (a different sealed value per environment, since sealing is cluster-specific anyway) or External Secrets Operator (an `ExternalSecret` referencing an environment-specific path in the external secrets manager, following whatever environment-branching/overlay pattern the GitOps repo already uses for other config), the environment-specific nature of secrets fits naturally into whatever structure already handles environment-specific application config.

**Neither approach eliminates the need for RBAC discipline on who can create/modify these objects**: a SealedSecret or ExternalSecret object, once applied, ultimately causes a real Secret to exist in the cluster — access control on who can merge changes to the GitOps repo, and who has RBAC permission to read the resulting real Secret objects in-cluster, both still matter exactly as much as they would with any other secret-management approach.

## Trade-offs

Sealed Secrets is simpler to adopt (no external system dependency, works standalone) but ties the encrypted value to a specific cluster's key, complicating multi-cluster or disaster-recovery scenarios where you'd need to re-encrypt for a new cluster, and the private key itself becomes a sensitive artifact needing careful management and backup. External Secrets Operator requires already having (or standing up) an external secrets manager, but centralizes actual secret lifecycle management (rotation, access policies, audit trail) in a system built specifically for that, rather than spreading it across encrypted blobs in Git.

## Key Takeaways

- Sealed Secrets encrypts values before they reach Git, decryptable only by the specific target cluster's controller — Git stores ciphertext, not plaintext.
- External Secrets Operator has Git store only a reference to an external secrets manager's value, fetched and materialized in-cluster by the operator — Git never holds the value even encrypted.
- Sealed Secrets is simpler to adopt standalone; External Secrets Operator centralizes secret lifecycle management in a purpose-built external system, at the cost of that dependency.
- Neither approach removes the need for RBAC discipline on who can modify the GitOps-managed objects or read the resulting real Secrets in-cluster.

## Interview Follow-Up Questions

- How would you handle disaster recovery for Sealed Secrets if the cluster's private key were lost?
- How would you design the External Secrets Operator's own access to the external secrets manager, to avoid it becoming an overly-privileged single point of compromise?
- How would you migrate an existing set of plaintext Secrets (applied outside of GitOps) into one of these two patterns without a risky big-bang cutover?

## References

- [Bitnami Sealed Secrets (GitHub)](https://github.com/bitnami-labs/sealed-secrets)
- [External Secrets Operator: Documentation](https://external-secrets.io/latest/)
