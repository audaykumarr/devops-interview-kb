---
id: terraform-state-create-before-destroy-unique-naming-001
title: "How does Terraform's create_before_destroy interact with resources that have unique naming constraints, like a fixed identifier?"
category: terraform
subcategory: state
technologies:
  - terraform
difficulty: advanced
question_type:
  - conceptual
  - practical
tags:
  - terraform
  - state
  - lifecycle
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`create_before_destroy` avoids downtime by creating the replacement resource before destroying the old one. What happens when the resource has a uniqueness constraint on its identifier — won't creating the replacement before destroying the original fail on a naming collision?

## Short Answer

Yes, it can fail exactly that way if the resource's identifier is a fixed, literal value in the configuration — `create_before_destroy` tries to create a new resource with the same name/identifier while the old one (using that same identifier) still exists, and the cloud provider rejects it as a duplicate. The fix is making the identifier non-fixed — using a `name_prefix` (provider-generated unique suffix) instead of a literal `name`, or otherwise parameterizing the identifier so the new resource's name is guaranteed distinct from the old one during the brief overlap window.

## Detailed Explanation

`create_before_destroy` (a `lifecycle` block setting) changes Terraform's default replace-resource behavior from destroy-then-create to create-then-destroy, specifically to avoid a window where the resource doesn't exist at all — valuable for avoiding downtime on a replace operation. But this only works cleanly if the new and old resources *can* coexist during that brief overlap — which fails immediately for any resource whose identifier is both fixed (literally specified in configuration) and required to be unique (many cloud resources — an S3 bucket name, a fixed IAM role name — enforce global or account-level uniqueness on their identifier). Attempting `create_before_destroy` on such a resource means Terraform tries to create the new resource using the exact same name the still-existing old resource already has, and the cloud provider correctly rejects it as a duplicate — the operation fails, in a way that can be confusing if you don't understand why `create_before_destroy` specifically triggered a "name already exists" error.

**The fix**: avoid a fixed literal identifier for resources you intend to use `create_before_destroy` on. Many providers/resources support `name_prefix` (specify a prefix, and the provider appends a random unique suffix at creation time) instead of a literal `name` — this guarantees the new resource's actual name is always distinct from the old one, since the suffix is freshly generated on each create, making genuine overlap possible without a collision. For resources without a built-in `name_prefix` equivalent, achieving the same effect might require deriving the name from something that changes on each apply (a timestamp, a random suffix generated via the `random` provider) rather than a fully static literal.

This is a real, common gotcha specifically because `create_before_destroy` is recommended for exactly the resources where downtime matters most — often exactly the resources (databases, load balancers, key infrastructure) that also tend to have naming uniqueness constraints — meaning the fix (moving away from a fixed name to a generated one) needs to be planned deliberately when designing for `create_before_destroy`, not discovered as a surprise failure the first time a replacement is actually triggered.

## Key Takeaways

- `create_before_destroy` can fail on resources with fixed, unique identifiers, since it tries to create the replacement while the original (using the same identifier) still exists.
- `name_prefix` (provider-generated unique suffix) instead of a literal `name` avoids the collision by guaranteeing distinct identifiers during the overlap window.
- This is a common gotcha specifically because `create_before_destroy` is most valuable for exactly the critical resources that also tend to have naming uniqueness constraints.
- Planning for this deliberately when designing the resource's naming, rather than discovering it during an actual failed replacement, avoids a nasty surprise on a critical resource.

## Interview Follow-Up Questions

- What would you do for a resource type that has no `name_prefix` equivalent at all — how would you achieve the same effect?
- How does this interact with dependent resources that reference the old resource's name/identifier directly?
- How would you test that a `create_before_destroy` configuration actually works correctly before relying on it during a real production replacement?

## References

- [Terraform: Resource behavior — create_before_destroy](https://developer.hashicorp.com/terraform/language/resources/behavior#create_before_destroy)
- [Terraform: The lifecycle Meta-Argument](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
