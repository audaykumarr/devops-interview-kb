---
id: terraform-providers-multiple-aliases-multi-region-001
title: "How would you deploy the same Terraform resource type to multiple AWS regions within a single configuration, using provider aliases?"
category: terraform
subcategory: providers
technologies:
  - terraform
difficulty: intermediate
question_type:
  - practical
tags:
  - terraform
  - providers
  - multi-region
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Terraform configuration needs to create a resource (say, an S3 bucket used for cross-region replication) in two different AWS regions within the same `apply`. A single `provider "aws"` block only configures one region. How do you actually express "create this resource in region A" and "create this resource in region B" within one configuration?

## Short Answer

Declare a second `provider "aws"` block with an `alias` (e.g., `alias = "us_west"`), configured with the different region — then any resource that should use that specific provider instance references it via the `provider = aws.us_west` meta-argument, while resources without that argument use the default (unaliased) provider configuration. This is how Terraform expresses "multiple configurations of the same provider" within a single configuration.

## Detailed Explanation

**A provider block without an alias is the default configuration for that provider**: resources referencing that provider type (implicitly, by not specifying a `provider` argument at all) use this default configuration — this is what most single-region configurations rely on without ever needing to think about aliasing.

**An aliased provider block is an additional, named configuration of the same provider**: `provider "aws" { alias = "us_west"; region = "us-west-2" }` declares a second, distinctly-named instance of the AWS provider, configured differently (a different region, in this case, though aliasing can also vary credentials/assume-role configuration) — this doesn't replace the default provider, it adds an additional one you can explicitly reference.

**Resources opt into a specific provider instance via the `provider` meta-argument**: `resource "aws_s3_bucket" "west" { provider = aws.us_west; ... }` tells Terraform this specific resource should be created using the aliased provider configuration, not the default one — any resource not specifying this argument uses the default provider as usual.

**This pattern extends to modules too, via `providers` block passing**: a module needing to create resources in multiple regions/accounts itself needs to explicitly receive the relevant provider configurations from its caller (via the module's own `providers = { aws = aws.us_west, aws.east = aws.us_east }` argument at the call site), since providers aren't automatically inherited by child modules the way some other configuration is — this is a deliberate design choice in Terraform requiring explicit provider passing for clarity about which provider configuration a module actually uses.

**Common use cases beyond multi-region**: the same aliasing mechanism is used for multi-account deployments (an alias configured with a different `assume_role`), and for any scenario needing more than one configuration of the same provider type within one Terraform run — multi-region is simply the most common, illustrative case.

## Key Takeaways

- A provider block without an alias is the default configuration; an aliased provider block (`alias = "..."`) is an additional, distinctly-named configuration of the same provider type.
- Resources opt into a specific aliased provider via the `provider = <type>.<alias>` meta-argument; resources without this argument use the default provider.
- Modules don't automatically inherit provider configurations from their caller — they need explicit `providers` block passing to use a specific aliased provider.
- The same pattern (provider aliasing) is used for multi-account deployments, not just multi-region, wherever more than one configuration of a provider is needed in one run.

## Interview Follow-Up Questions

- How would you structure a module that needs to create resources in a "primary" and "replica" region, given modules require explicit provider passing?
- What's the risk of forgetting to specify the `provider` meta-argument on a resource that should use an aliased provider — what would actually happen?
- How would you use provider aliasing for a multi-account deployment, where the alias's difference is `assume_role` rather than region?

## References

- [Terraform: Provider Configuration — alias](https://developer.hashicorp.com/terraform/language/providers/configuration#alias-multiple-provider-configurations)
