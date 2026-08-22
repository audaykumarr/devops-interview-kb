---
id: terraform-state-rm-vs-removing-from-config-001
title: "What's the difference between terraform state rm and just deleting a resource block from configuration — when would you use state rm specifically?"
category: terraform
subcategory: state
technologies:
  - terraform
difficulty: intermediate
question_type:
  - comparison
tags:
  - terraform
  - state-management
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Both `terraform state rm` and deleting a resource's block from your `.tf` configuration cause Terraform to stop managing that resource. What's actually different between them, and specifically when would you reach for `state rm` rather than just editing the configuration?

## Short Answer

Deleting a resource block from configuration, followed by `terraform apply`, causes Terraform to plan and execute an actual destroy of the real resource — Terraform sees the resource in state but no longer in configuration, and its normal behavior is to remove what's no longer declared. `terraform state rm` removes the resource from Terraform's *state* only, without touching the real resource at all — Terraform simply forgets it was ever managing that resource, leaving the actual infrastructure completely untouched. Use `state rm` specifically when you want Terraform to stop managing a resource while the resource itself continues existing (handing it off to be managed manually, by a different tool, or by a different Terraform configuration).

## Detailed Explanation

**Removing a resource block from configuration signals "this should no longer exist" to Terraform**: since Terraform's whole model is reconciling actual state toward what's declared in configuration, a resource present in state but absent from configuration is, from Terraform's perspective, something that needs to be destroyed to bring reality in line with the (now resource-less) desired state.

**`terraform state rm` only edits Terraform's bookkeeping, with zero effect on the real resource**: this command directly manipulates the state file, removing the specified resource's entry — Terraform afterward has no record that it was ever managing that resource, but the actual cloud resource itself is completely unaffected by this operation; it continues running exactly as it was.

**The critical distinguishing use case: you want the resource to keep existing, just not be Terraform-managed anymore**: handing a resource off to be managed by a different Terraform configuration (perhaps as part of a state-splitting effort), transitioning it to be managed by a different tool entirely, or deliberately taking it out of Terraform's management for operational reasons — all of these want the resource to survive, which is exactly what `state rm` (not deleting the config block) achieves.

**Combining `state rm` from one state with `import` into another is the actual mechanism behind moving a resource between separate Terraform configurations**: since a resource can only be tracked in one state file's bookkeeping at a time, migrating a resource from configuration A to configuration B means `state rm` from A's state (leaving the resource alone) followed by `import` into B's state (bringing it under B's management) — the resource itself never gets touched throughout this whole process, only which state file is tracking it.

**Getting this wrong in either direction has real consequences**: mistakenly deleting a configuration block when you actually wanted to preserve the resource results in genuine, real destruction of live infrastructure; conversely, using `state rm` when you actually intended to decommission a resource just leaves it running, untracked and easy to forget about, quietly costing money or posing a security surface nobody's tracking anymore.

## Key Takeaways

- Deleting a resource block from configuration and applying causes Terraform to actually destroy the real resource, since it's no longer declared.
- `terraform state rm` removes the resource from Terraform's bookkeeping only — the real resource is completely untouched and continues existing.
- Use `state rm` specifically when you want a resource to keep existing but stop being managed by this particular Terraform configuration.
- Moving a resource between separate Terraform configurations means `state rm` from the source state followed by `import` into the destination state, never touching the actual resource.

## Interview Follow-Up Questions

- How would you verify, after a `state rm`, that the real resource genuinely still exists and wasn't accidentally destroyed?
- What would you do if you accidentally deleted a resource's configuration block (intending to just stop managing it) and Terraform already destroyed the real resource before you caught the mistake?
- How does `terraform state rm` interact with a resource that has dependencies (other resources referencing it) still present in the same configuration?

## References

- [Terraform: state rm command](https://developer.hashicorp.com/terraform/cli/commands/state/rm)
- [Terraform: Import](https://developer.hashicorp.com/terraform/language/import)
