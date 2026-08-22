---
id: kubernetes-configuration-secrets-base64-not-encrypted-001
title: "Why are Kubernetes Secrets only base64-encoded by default, not encrypted, and how would you actually protect them at rest?"
category: kubernetes
subcategory: configuration
technologies:
  - kubernetes
difficulty: beginner
question_type:
  - conceptual
  - security
tags:
  - kubernetes
  - secrets
  - security
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A new team member notices that `kubectl get secret <name> -o yaml` shows a value that's trivially decodable with `base64 -d` — no encryption involved. Why does Kubernetes design Secrets this way by default, and what would you actually do to protect them properly at rest?

## Short Answer

Base64 encoding in a Secret object exists purely so the value can be represented as text in YAML/JSON (since raw binary doesn't serialize cleanly), not as a security measure at all — it's trivially reversible and was never intended to provide confidentiality. Whether Secrets are actually encrypted at rest depends entirely on whether the cluster has encryption-at-rest configured for etcd, which is a separate, deliberate configuration step most clusters don't have enabled by default.

## Detailed Explanation

**Base64 is an encoding, not encryption — this is a common and understandable point of confusion for anyone new to Kubernetes**: base64 exists to let arbitrary binary data (which a Secret's value technically can be) be represented as printable text within a YAML/JSON document — it provides zero confidentiality, since decoding it requires no key, no algorithm secret, nothing beyond running it through `base64 -d`. Assuming a Secret is "encrypted" because its value looks encoded is a genuinely dangerous misunderstanding.

**By default, Secret data is stored in etcd in this same, effectively-plaintext form**: without additional configuration, etcd stores the Secret's value as base64-decoded plaintext on disk — anyone with access to etcd's data files (or an etcd backup/snapshot) can read every Secret in the cluster directly, entirely bypassing Kubernetes' RBAC layer, since RBAC only governs access through the API server, not direct access to etcd's underlying storage.

**Encryption at rest is a separate, explicit cluster configuration**: Kubernetes supports encrypting Secret data before it's written to etcd, configured via an `EncryptionConfiguration` resource on the API server specifying a provider (`aescbc`, `aesgcm`, or a KMS-backed provider) and the encryption key(s) — this needs to be explicitly enabled; it is not the default behavior on most self-managed clusters, though some managed Kubernetes offerings enable a form of it by default or make it easy to turn on.

**A KMS-backed provider is generally the strongest practical option**: rather than storing the encryption key directly in a local `EncryptionConfiguration` file (which itself becomes a sensitive artifact needing protection), a KMS provider (AWS KMS, Azure Key Vault, GCP KMS) lets the API server call out to a managed key-management service to perform the actual encrypt/decrypt operations, keeping the raw key material out of any file on the control-plane nodes entirely, and enabling centralized key rotation and access auditing through the cloud provider's own KMS controls.

**Encryption at rest protects against a different threat than RBAC does**: RBAC controls which authenticated API clients can read a Secret through the normal Kubernetes API; encryption at rest protects against someone with direct filesystem/backup access to etcd bypassing the API layer entirely — both matter, and neither substitutes for the other. A cluster with excellent RBAC but no encryption at rest is still fully exposed to anyone who gets hold of an etcd snapshot.

## Key Takeaways

- Base64 in a Secret object is an encoding for text-serialization purposes only, providing zero confidentiality — it's trivially reversible with no key required.
- Without explicit configuration, Secret data sits in etcd in effectively plaintext form, readable by anyone with direct access to etcd's data or backups, bypassing RBAC entirely.
- Encryption at rest is an explicit, separate cluster configuration (`EncryptionConfiguration`), not enabled by default on most self-managed clusters.
- A KMS-backed encryption provider is generally preferable to a locally-stored key, since it keeps raw key material out of any file on the control-plane nodes and centralizes rotation/audit.

## Interview Follow-Up Questions

- How would you verify whether a specific cluster currently has encryption at rest enabled for Secrets, without assuming based on the cloud provider?
- What would you do to rotate the encryption key used for etcd's encryption at rest, and what does that migration actually involve for existing Secrets?
- How does encryption at rest interact with an etcd backup — is a backup itself encrypted, and does restoring it require the same key?

## References

- [Kubernetes: Encrypting Confidential Data at Rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Kubernetes: Secrets — Risks](https://kubernetes.io/docs/concepts/configuration/secret/#risks)
