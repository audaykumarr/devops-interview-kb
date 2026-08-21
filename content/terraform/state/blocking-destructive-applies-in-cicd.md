---
id: terraform-state-blocking-destructive-applies-cicd-001
title: "How would you design a CI/CD pipeline to automatically block a Terraform apply that would destroy a production database?"
category: terraform
subcategory: state
technologies:
  - terraform
difficulty: advanced
question_type:
  - architecture
tags:
  - terraform
  - ci-cd
  - safety
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A `terraform plan` occasionally shows a destroy-and-recreate for a critical resource like a production database, sometimes unintentionally. How would you design a CI/CD pipeline to automatically catch and block this before it can be applied?

## Short Answer

Parse the plan's machine-readable JSON output (`terraform show -json`) in a pipeline step specifically checking for `delete` or `delete_then_create`/`create_then_delete` actions on resources tagged or matched as critical (by resource type, name pattern, or an explicit tag/label), and fail the pipeline automatically if any are found — requiring an explicit, separate, harder-to-trigger override (not just re-running the same pipeline) for the rare cases where a destroy is genuinely intended.

## Detailed Explanation

The design relies on Terraform's own structured plan output as ground truth, rather than trying to infer destructive intent from the configuration diff itself, which is far less reliable to parse correctly.

## Requirements

- The pipeline must reliably detect a destructive action on a critical resource before it's applied, not just log it after the fact.
- The check must distinguish genuinely critical resources (a production database) from routine ones where destroy-and-recreate is normal and fine.
- A genuinely intended destroy must still be possible, via a deliberate, harder-to-trigger override rather than being permanently blocked.

## Architecture

**Parse the plan's structured JSON output, not the human-readable text**: `terraform show -json <planfile>` produces a structured, machine-parseable representation of every planned resource change, including the specific `actions` array for each resource change (`create`, `update`, `delete`, or the combination indicating a replace). A pipeline step running this and checking each resource change's `actions` field for `delete` (or a replace involving delete) is far more reliable than trying to pattern-match the human-readable plan text, which can vary in formatting and isn't designed to be parsed programmatically.

**Identify "critical" resources explicitly**: match against resource type (any `aws_db_instance`, `aws_rds_cluster`, or equivalent for the relevant critical resource types), resource name patterns (anything with `prod` in its Terraform resource address), or — most robustly — an explicit tag/label convention applied to genuinely critical resources specifically for this purpose, so the check doesn't depend on guessing from naming conventions alone and can be applied deliberately and explicitly by whoever manages the resource.

**Fail the pipeline automatically, with a clear message**: if the check finds a destroy action on a matched critical resource, the pipeline step exits non-zero, blocking the apply and reporting exactly which resource(s) triggered the block and why — giving whoever's running the pipeline clear, actionable information rather than a mysterious failure.

**Explicit, harder-to-trigger override for genuine cases**: since a genuine, intended destroy of a critical resource does legitimately happen sometimes (decommissioning, planned migration), the pipeline needs an escape hatch — but one that requires deliberate, explicit action distinct from just re-running the same pipeline (a specific environment variable or pipeline parameter that must be manually set, ideally requiring a second approver or an explicit ticket reference) rather than a flag someone could accidentally leave set from a previous run.

## Trade-offs

Building and maintaining this check is real engineering investment (the JSON parsing logic, keeping the critical-resource matching rules current as infrastructure evolves) — worth it specifically for resources where an accidental destroy would be catastrophic and hard/impossible to reverse. Overly broad critical-resource matching risks false positives blocking legitimate applies unrelated to the resources that actually matter, creating friction and potentially training people to reach for the override reflexively rather than treating it as a genuine, rare exception — the matching rules need periodic review to stay accurate and specific.

## Key Takeaways

- Parse `terraform show -json` output programmatically to reliably detect destroy/replace actions, rather than pattern-matching human-readable plan text.
- Match "critical" resources explicitly (by type, name pattern, or a dedicated tag) so the check doesn't rely on guessing.
- Fail the pipeline automatically with a clear message identifying exactly which resource(s) triggered the block.
- Provide a deliberate, harder-to-trigger override for genuinely intended destroys, distinct from simply re-running the pipeline.

## Interview Follow-Up Questions

- How would you keep the critical-resource matching rules up to date as new infrastructure is added, without it becoming stale or incomplete?
- What would the override mechanism concretely look like to require genuine deliberate action rather than becoming a routine bypass?
- How would you extend this check to also catch a destructive change hidden inside a larger plan with many other, unrelated changes?

## References

- [Terraform: JSON Output Format](https://developer.hashicorp.com/terraform/internals/json-format)
- [Terraform CLI: terraform show](https://developer.hashicorp.com/terraform/cli/commands/show)
