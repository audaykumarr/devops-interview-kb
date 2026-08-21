---
id: infrastructure-as-code-drift-stateful-vs-stateless-severity-001
title: "How does the severity of infrastructure drift change for a stateful resource like a database, versus a stateless one like a security group rule?"
category: infrastructure-as-code
subcategory: drift
technologies:
  - terraform
difficulty: intermediate
question_type:
  - comparison
tags:
  - infrastructure-as-code
  - terraform
  - drift
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Drift is drift, technically — a mismatch between code and reality — but reverting it carries very different risk depending on what resource it's on. How does the severity and handling of drift differ for a stateful resource like a database versus a stateless one like a security group rule?

## Short Answer

Drift on a stateless resource (a security group rule, an IAM policy attachment, most networking config) can typically be reverted safely by re-applying the Terraform-declared state — there's no data to lose, just configuration to restore. Drift on a stateful resource (a database's engine version, storage configuration, or anything where "reverting" might imply recreating or modifying live data) carries genuine data-loss or downtime risk if reverted carelessly — the same "just run apply" response that's safe for stateless drift can be actively dangerous for stateful drift, making it necessary to understand *what* reverting actually does before doing it.

## Detailed Explanation

The key distinction is what "reverting drift" actually means mechanically for a given resource type. For a stateless resource — a security group rule, a load balancer listener rule, an IAM policy attachment — the resource has no persistent data of its own; its entire "state" is its configuration. Reverting drift means re-applying that configuration, and there's nothing to lose in the process: the resource ends up matching Terraform's declared state, full stop, with no data implications at all.

For a stateful resource — a database instance, storage with data on it, anything with contents that matter beyond its configuration — "reverting drift" can mean something much more consequential depending on exactly what drifted. If a database's storage size drifted (someone manually increased it during a capacity emergency), naively reverting it to Terraform's smaller declared value could mean **shrinking storage**, which most database engines don't even support safely and could cause data loss or an outright failed operation. If an engine version drifted (someone manually upgraded it), reverting could mean a **downgrade**, which is frequently unsupported entirely or requires a full restore from backup. Even a seemingly simple attribute like an instance's storage type or IOPS configuration can, for some resources, require a replacement (destroy and recreate) rather than an in-place update to "revert," which for a database means data loss unless a snapshot/restore process is deliberately built into the change.

This is why blindly running `terraform apply` to fix drift is a meaningfully different risk profile depending on resource type: for stateless resources, it's close to always safe; for stateful resources, the correct response requires first understanding exactly what Terraform's plan says it would *do* to revert the drift (in-place update vs. destroy-and-recreate) and whether that action is safe given the resource's actual current data — sometimes the right answer is updating the Terraform code to match the drifted (now-intentional) state instead of trying to revert it at all, specifically to avoid the data-risk of reverting.

## Key Takeaways

- Stateless resource drift (security groups, IAM attachments, most networking) is typically safe to revert by simply re-applying Terraform's declared configuration.
- Stateful resource drift (databases, storage) can carry real data-loss or downtime risk if reverted naively — some changes Terraform would make to "revert" imply operations like shrinking storage or downgrading an engine version that aren't safely supported.
- Always check whether Terraform's plan to revert stateful drift is an in-place update or a destroy-and-recreate before applying it.
- For stateful drift, updating the Terraform code to match the (now-intentional) drifted state is often the safer path than trying to revert it.

## Interview Follow-Up Questions

- How would you build a policy that automatically flags stateful-resource drift for manual review while allowing stateless drift to auto-revert?
- What Terraform plan output would you specifically look for to distinguish a safe in-place revert from a dangerous destroy-and-recreate?
- How would you handle drift on a stateful resource where reverting requires a maintenance window, but the drift itself is currently causing an active problem?

## References

- [Terraform: State and drift](https://developer.hashicorp.com/terraform/language/state)
- [Terraform: Resource behavior — create_before_destroy and replacement](https://developer.hashicorp.com/terraform/language/resources/behavior)
