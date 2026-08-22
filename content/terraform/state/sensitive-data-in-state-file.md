---
id: terraform-state-sensitive-data-exposure-001
title: "A database password is passed as a resource argument in Terraform — does marking the variable sensitive actually protect it in the state file?"
category: terraform
subcategory: state
technologies:
  - terraform
difficulty: advanced
question_type:
  - security
  - conceptual
tags:
  - terraform
  - state-management
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Terraform configuration passes a database password as a resource argument, and the corresponding variable is marked `sensitive = true`. This correctly hides the value from `terraform plan`/`apply` console output. Does this also mean the value is protected within the state file itself, or is that a separate, unaddressed concern?

## Short Answer

Marking a variable `sensitive` only affects console/log output redaction — it has no effect on what's stored in the state file, where the actual value is written in plaintext regardless of the sensitivity marking. The state file itself needs to be protected as a sensitive artifact in its own right: encrypted at rest (via the backend's own encryption, like S3 with SSE), access-restricted (via IAM/backend permissions limiting who can read it), and ideally the actual secret shouldn't be a plain Terraform-managed value at all if it can be avoided.

## Detailed Explanation

**`sensitive = true` is a display/output concern, not a storage concern**: this marking tells Terraform to redact the value from `plan`/`apply` console output and from log output, preventing accidental exposure through those specific channels — but it does nothing to change how the value is actually stored once Terraform records the resource's state.

**The state file stores actual resource attribute values in plaintext, including anything marked sensitive**: Terraform's state file (whether local or remote) is a JSON-like structure recording every managed resource's full current attributes — a sensitive-marked password argument is present in this file as its actual plaintext value, since Terraform needs the real value to detect drift and plan future changes correctly, and the `sensitive` marking doesn't cause it to be omitted or redacted from storage.

**Anyone with read access to the state file can read every sensitive value it contains**: this is exactly why state file access control matters as much as (or more than) any in-application secret handling — a state file stored in an S3 bucket with overly broad read permissions exposes every secret Terraform has ever written into it to anyone with that access, regardless of how carefully the `sensitive` marking was applied in the configuration.

**Protecting the state file itself is the actual mitigation, at multiple layers**: encrypting the state file at rest (S3 server-side encryption, or the equivalent for whatever backend is in use) protects against unauthorized access to the underlying storage; restricting IAM/backend permissions so only genuinely authorized principals can read the state at all limits who could access the sensitive values even with storage-level access; and enabling state file access logging/auditing gives visibility into who actually reads it.

**Where possible, avoid having Terraform manage the actual secret value as a plain argument at all**: for genuinely sensitive values, having Terraform reference a secret manager (writing a reference/ARN to the state, rather than the actual secret value) — or having the actual secret generated and stored directly by the target service without ever passing through Terraform's own state as a plain value — avoids the problem at its root, rather than only mitigating it through state file protection after the fact.

## Key Takeaways

- `sensitive = true` only redacts a value from console/log output — it has no effect on what's actually stored in the state file, which retains the plaintext value regardless.
- Anyone with read access to the state file can read every sensitive value it contains, making state file access control a critical, direct security boundary.
- Protect the state file itself: encryption at rest, tightly restricted read access, and audit logging on who accesses it.
- Where genuinely possible, avoid having Terraform manage the actual secret value as a plain resource argument at all — reference a secret manager instead of writing the raw value into state.

## Interview Follow-Up Questions

- How would you audit an existing state file to find every sensitive value currently stored in it, as a starting point for a remediation effort?
- What's the trade-off of having Terraform generate a secret (like a random password) versus having the target service generate its own and Terraform only referencing it?
- How does this concern change (or not change) when using Terraform Cloud/Enterprise's remote execution, where you might have less direct visibility into or control over the underlying state storage?

## References

- [Terraform: Sensitive Data in State](https://developer.hashicorp.com/terraform/language/state/sensitive-data)
- [Terraform: Protecting Sensitive Input Variables](https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output)
