---
id: terraform-state-remote-state-cross-stack-coupling-001
title: "Using terraform_remote_state to reference another team's outputs works, but creates a tight coupling that breaks when they change their state — what's the alternative?"
category: terraform
subcategory: state
technologies:
  - terraform
difficulty: advanced
question_type:
  - comparison
tags:
  - terraform
  - remote-state
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your team's Terraform configuration uses the `terraform_remote_state` data source to read a VPC ID and subnet IDs from the networking team's separate state file. This works, but it means your `plan`/`apply` now depends on being able to read their state directly, and any change to their state's structure (a renamed output, a migrated backend) can break your configuration without warning. What's the actual trade-off here, and what's a more decoupled alternative?

## Short Answer

`terraform_remote_state` creates a direct, structural dependency on another team's state file's exact internal shape — any output rename, backend migration, or even just restricting read access to that state breaks your configuration with no interface contract in between. A more decoupled alternative is having the producing team publish specific values through a dedicated mechanism designed for cross-team sharing (SSM Parameter Store, Secrets Manager parameters, or a dedicated "outputs" data source specifically designed as a stable interface) rather than reading their raw state directly — this creates an explicit, versioned contract instead of an implicit dependency on internal implementation details.

## Detailed Explanation

**`terraform_remote_state` reads another configuration's entire state, not just a defined interface**: the data source pulls the full state file's outputs, meaning your configuration is coupled to whatever that other team's state actually contains, structured however they happen to have structured it — there's no formal contract; it's directly reading their internal implementation detail (their state file), not something explicitly published as a stable external interface.

**Any change to the producing team's state genuinely breaks your configuration, often without warning**: if they rename an output, restructure their state (splitting one state file into several), or migrate to a different backend, your `terraform_remote_state` reference breaks — and importantly, they may have no idea your configuration depends on their state at all, meaning they have no reason to consider your dependency before making a change that's entirely reasonable from their own perspective.

**Publishing values through a dedicated, explicit sharing mechanism creates a real interface contract**: having the producing team's Terraform configuration write specific, deliberately-published values to SSM Parameter Store (or Secrets Manager, or a similar service designed for this) — and having consuming configurations read from that parameter store rather than the raw state — means the "interface" is an explicit, intentional publication, not an accidental byproduct of however their state happens to be structured internally.

**This decoupling means the producing team can freely restructure their own state without breaking consumers**: since consumers read from the published parameter (a stable, deliberately-maintained value), the producing team can split their state file, rename internal resources, migrate backends — any of these internal implementation changes — without needing to coordinate with every consumer, as long as they keep publishing the same parameter values consumers actually depend on.

**This mirrors a broader software-architecture principle**: `terraform_remote_state` is analogous to directly reading another service's internal database rather than calling its published API — convenient short-term, but creates exactly the kind of tight coupling that breaks encapsulation and makes independent evolution of each side difficult, which is why a genuine "publish an interface" pattern is generally the more maintainable long-term choice for cross-team Terraform dependencies specifically.

## Key Takeaways

- `terraform_remote_state` couples your configuration directly to another team's state file's exact internal structure, not to any deliberate, stable interface.
- Any change to the producing team's state (renamed outputs, restructured state, backend migration) can break consumers, often without the producing team even knowing a dependency exists.
- Publishing specific values through a dedicated mechanism (SSM Parameter Store, Secrets Manager) creates an explicit, intentional interface contract instead.
- This decoupling lets the producing team freely evolve their own state's internal structure without needing to coordinate with every consumer, as long as the published interface values remain stable.

## Interview Follow-Up Questions

- How would you migrate an existing set of `terraform_remote_state` dependencies to a parameter-store-based interface without breaking consumers during the transition?
- What's the trade-off of this decoupled approach in terms of added infrastructure (the parameter store itself) versus the simplicity of `terraform_remote_state`?
- How would you version a published interface (like an SSM parameter) if the value's meaning or format genuinely needs to change in a breaking way?

## References

- [Terraform: terraform_remote_state Data Source](https://developer.hashicorp.com/terraform/language/state/remote-state-data)
- [AWS: Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
