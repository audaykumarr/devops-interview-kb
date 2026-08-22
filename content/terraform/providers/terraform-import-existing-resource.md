---
id: terraform-providers-import-existing-resource-001
title: "A production database was created manually through the AWS console years ago — how would you bring it under Terraform management without recreating it?"
category: terraform
subcategory: providers
technologies:
  - terraform
difficulty: intermediate
question_type:
  - practical
tags:
  - terraform
  - import
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A critical production database was created manually through the cloud console years ago and has never been managed by Terraform. The team wants to bring it under Terraform management going forward, without destroying and recreating the actual live resource (which would mean real, unacceptable data loss/downtime risk). How would you actually do this?

## Short Answer

Use `terraform import` (or the newer, declarative `import` block) to associate the existing, manually-created resource with a resource address in your Terraform configuration — this adds the resource to Terraform's state without creating anything new, but you still need to write a matching `resource` configuration block whose arguments accurately reflect the real resource's actual current settings, or the very next `terraform plan` will show a diff trying to "correct" the live resource to match a configuration that doesn't actually describe it.

## Detailed Explanation

**Import associates existing infrastructure with Terraform state, without touching the actual resource**: `terraform import aws_db_instance.main <actual-resource-id>` (or the declarative `import { to = aws_db_instance.main, id = "<actual-resource-id>" }` block, generally preferred in modern Terraform) tells Terraform "this resource address now corresponds to this already-existing real resource" — the resource itself isn't created, modified, or touched in any way by the import operation itself.

**The imported state alone isn't enough — you need a matching configuration block too**: import only populates Terraform's *state* with the resource's current attributes; it doesn't generate the corresponding `.tf` configuration for you automatically in older Terraform versions (though newer versions' `import` block combined with `terraform plan -generate-config-out` can generate a starting configuration) — without a configuration block whose arguments match the real resource's actual settings, the next `plan` will show Terraform wanting to change the resource to match whatever the (likely incomplete or default-valued) configuration says, which could mean an unintended, disruptive change to a resource that was actually fine as-is.

**`terraform plan -generate-config-out` significantly reduces the manual work of writing a matching configuration**: this modern Terraform capability inspects the real resource's current state and generates a starting `.tf` configuration block reflecting it — this generated configuration still needs human review (it's a starting point, not guaranteed perfect), but it removes most of the tedious, error-prone manual work of transcribing every actual setting by hand.

**After import, `terraform plan` should show no changes if the configuration accurately matches reality**: this is the actual verification step — a clean, no-diff plan confirms the written (or generated) configuration genuinely describes the resource's current real state; any diff shown at this point needs to be resolved (correcting the configuration to match reality, generally, not applying a change to the live resource) before considering the import complete.

**This same process extends to bringing an entire manually-created environment under Terraform management, one resource at a time**: for a larger manual environment (not just one database), the same import-then-verify-no-diff process is repeated resource by resource — this is real, often substantial effort for a large environment, but it's the only way to bring existing infrastructure under management without the unacceptable alternative of destroying and recreating it.

## Key Takeaways

- `terraform import` (or the declarative `import` block) associates an existing real resource with Terraform state, without creating, modifying, or touching the actual resource in any way.
- Import alone doesn't write the matching configuration — you (or `-generate-config-out`) still need a `resource` block whose arguments accurately reflect the real resource's current settings.
- A clean, no-diff `terraform plan` after import is the actual verification that the configuration genuinely matches reality — any diff needs to be resolved before considering the import complete.
- Bringing a larger manually-created environment under management means repeating this process resource by resource, which is real, substantial effort but the only safe path.

## Interview Follow-Up Questions

- How would you prioritize which resources to import first, for a large environment with many manually-created resources?
- What would you do if `terraform plan -generate-config-out`'s generated configuration is subtly wrong or incomplete for a specific resource type?
- How would you handle importing a resource that has dependencies on other resources not yet under Terraform management?

## References

- [Terraform: Import](https://developer.hashicorp.com/terraform/language/import)
- [Terraform: Generating configuration](https://developer.hashicorp.com/terraform/language/import/generating-configuration)
