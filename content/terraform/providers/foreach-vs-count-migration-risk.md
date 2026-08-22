---
id: terraform-providers-foreach-vs-count-migration-risk-001
title: "Converting a resource block from count to for_each caused Terraform to want to destroy and recreate every instance — why, and how do you migrate safely?"
category: terraform
subcategory: providers
technologies:
  - terraform
difficulty: advanced
question_type:
  - troubleshooting
  - practical
tags:
  - terraform
  - for-each
  - count
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team decides to convert a `count`-based resource block to `for_each`, since `for_each` avoids `count`'s well-known "insert in the middle shifts every subsequent index" problem. After making the change, `terraform plan` shows every single instance being destroyed and recreated, not just refactored in place. Why does this happen, and how would you make this migration without actually destroying and recreating live resources?

## Short Answer

`count` and `for_each` index instances under fundamentally different keys in Terraform's state — numeric (`[0]`, `[1]`) versus map/set key (`["prod"]`, `["staging"]`) — so simply changing the meta-argument doesn't migrate existing state entries; Terraform sees the old and new addresses as entirely unrelated resources and plans to destroy one and create the other. The safe migration is using `terraform state mv` (or a declarative `moved` block) to explicitly remap each old numeric address to its correct new key-based address before applying.

## Detailed Explanation

`count` and `for_each` address the same resource under fundamentally different internal keys in Terraform's state — `count` indexes instances numerically (`resource.name[0]`, `resource.name[1]`), while `for_each` indexes them by the map/set key you provide (`resource.name["prod"]`, `resource.name["staging"]`) — simply changing the resource block's meta-argument doesn't migrate the existing state entries to the new keying scheme; Terraform sees the old numeric-keyed instances as no longer matching anything in the new configuration, and the new string-keyed instances as entirely new resources to create.

## Symptoms

- A resource block is changed from `count = N` to `for_each = <map/set>`.
- `terraform plan` shows every existing instance being destroyed, and an equal number of new instances being created — not an in-place modification.
- The actual desired end-state resources are functionally identical to what already exists; only the internal indexing scheme changed.

## Possible Causes

- Terraform's state stores each `count`-based instance under a numeric index key (`[0]`, `[1]`, etc.) — these keys have no automatic mapping to the string keys `for_each` would use, so from Terraform's state-diffing perspective, the old and new resource addresses are simply unrelated, different resources.
- No `terraform state mv` (or `moved` block) was used to explicitly tell Terraform "this old state address corresponds to this new one" — without that explicit mapping, Terraform has no way to know the intent was a rename/re-key, not a genuine destroy-and-recreate.

## Investigation Steps

**Confirm the plan genuinely shows destroy-then-create, not an in-place update**: reviewing the plan output's specific resource addresses confirms whether it's proposing to remove the old numeric-indexed addresses and create new string-indexed ones — this is the direct evidence of the state-key mismatch described above, distinct from a legitimate configuration change that would show as an in-place `~` update instead.

**Map each old numeric index to its corresponding new for_each key manually**: understanding which `count`-indexed instance (`[0]`, `[1]`, `[2]`) logically corresponds to which `for_each` key in the new configuration (based on whatever attribute you're now keying by) is the necessary groundwork before performing the actual state migration — get this mapping wrong and you'll move the wrong live resource under the wrong new address.

## Resolution

Use `terraform state mv` (or, in more recent Terraform versions, a `moved` block declared directly in configuration) to explicitly remap each old, numerically-indexed state address to its correct new `for_each`-keyed address, one at a time, based on the manual mapping worked out during investigation — `terraform state mv 'aws_instance.web[0]' 'aws_instance.web["prod"]'` for each instance. After all instances are remapped, re-run `terraform plan` and confirm it now shows no changes (or only the changes genuinely intended), rather than the destroy-and-recreate that appeared before the state migration. The `moved` block approach is generally preferable in modern Terraform since it's declarative and version-controlled alongside the configuration change itself, rather than a set of imperative commands someone has to remember to run.

## Key Takeaways

- `count` and `for_each` use fundamentally different state-indexing schemes (numeric index vs. map/set key) — changing the meta-argument alone doesn't migrate existing state to match.
- Terraform's plan sees old numeric-keyed and new string-keyed addresses as entirely unrelated resources, proposing destroy-and-recreate for what's actually the same underlying resource.
- `terraform state mv` (or a `moved` block) explicitly tells Terraform the old and new addresses correspond to the same resource, avoiding actual destruction of live infrastructure.
- The `moved` block, declared in configuration and version-controlled, is generally preferable to imperative `state mv` commands for this kind of refactor, since it's self-documenting and repeatable.

## Interview Follow-Up Questions

- How would you handle this same migration for a resource with a genuinely large number of instances, where manually mapping each one individually isn't practical?
- What's the risk of getting the old-to-new address mapping wrong during this migration, and how would you double-check it before applying?
- How does the `moved` block interact with modules, if the resource being migrated is inside a reusable module used by multiple callers?

## References

- [Terraform: Resources — for_each](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each)
- [Terraform: Refactoring with moved blocks](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)
