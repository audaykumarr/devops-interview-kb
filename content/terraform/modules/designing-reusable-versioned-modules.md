---
id: terraform-modules-versioning-strategy-001
title: "Your team has copy-pasted the same VPC Terraform configuration into six different repositories. Design a module structure and versioning strategy to fix that."
category: terraform
subcategory: modules
technologies:
  - terraform
difficulty: intermediate
question_type:
  - architecture
  - practical
tags:
  - terraform
  - modules
  - reusability
  - versioning
estimated_time_minutes: 10
companies: []
related_questions:
  - terraform-state-unexpected-recreate-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Your team has copy-pasted the same VPC Terraform configuration into six different repositories, and they've already drifted slightly out of sync with each other. Design a module structure and versioning strategy to fix that, and explain how teams would adopt it without a risky big-bang migration.

## Short Answer

Extract the VPC configuration into a standalone, versioned module in its own repository, publish it to a module registry (Terraform Cloud/Enterprise's private registry, or a Git-tag-based source reference if no registry is available), and have each of the six repositories adopt it one at a time by pinning to a specific version and running `terraform plan` to confirm zero unexpected diff before committing to the switch — never all six at once.

## Detailed Explanation

Copy-pasted Terraform configuration drifts for a predictable reason: there's no mechanism forcing the six copies to stay in sync, so every fix or improvement made in one repository has to be manually ported to the other five, and inevitably some don't get ported at all. A Terraform module doesn't just deduplicate the code — it turns "keep six configurations in sync" into "bump a version number," which is a fundamentally different (and much cheaper) maintenance operation.

The reason this can't be a single big-bang cutover is that Terraform state is what actually determines whether `apply` changes real infrastructure — swapping a hand-written resource block for a module call, even one that produces an identical configuration, can still produce an unexpected plan if the module's internal resource addressing differs from the original (e.g. a resource nested inside a module gets a different state address than the same resource at the root). That's exactly why each of the six migrations needs its own verified zero-diff `plan` rather than trusting that "the module looks equivalent" is enough.

## Requirements

- Single source of truth for the VPC configuration, so future changes happen in one place instead of six.
- Consuming repositories must be able to upgrade independently, on their own schedule — not forced into lockstep.
- The migration itself must not risk an unplanned change to any of the six existing VPCs.
- The module needs enough configurability (CIDR ranges, subnet counts, NAT strategy, tagging) to serve six environments that have already diverged slightly, without becoming a sprawling if-else of special cases.

## Assumptions

- Terraform Cloud or Enterprise is available for a private module registry; if not, Git tags on a dedicated module repository serve as the fallback versioning mechanism.
- The six repositories are independently deployed (different apply schedules/owners), which is exactly why forcing a simultaneous migration is undesirable.

## Architecture

The module lives in its own repository (e.g. `terraform-aws-vpc`), structured as a standard reusable module: `main.tf`/`variables.tf`/`outputs.tf` at the root, with `variables.tf` exposing the dimensions that actually vary across the six current implementations (CIDR block, availability zone count, whether NAT gateways are single or per-AZ, tagging conventions) and sensible defaults for anything that shouldn't vary. Each of the six consuming repositories references the module by version, not by branch or unpinned Git ref, using either registry-style `source = "app.terraform.io/org/vpc/aws"` with a `version` constraint, or a Git source pinned to a tag (`source = "git::https://.../terraform-aws-vpc.git?ref=v1.2.0"`).

Versioning follows semver: patch releases for bug fixes that don't change behavior, minor releases for backward-compatible additions (a new optional variable), major releases for anything that would change existing infrastructure if applied without modification (a renamed resource, a changed default, a restructured output). This is what lets the six repos upgrade independently — a repo can stay pinned to `~> 1.2` indefinitely without being forced onto a breaking `2.0` until its owners are ready.

## Components

- The module repository itself, with its own README documenting inputs/outputs and a CHANGELOG describing what changed at each version.
- A private module registry entry (or Git tags, if no registry) as the distribution mechanism.
- Six consumer configurations, each pinning an explicit module version and passing in whatever inputs correspond to their current (possibly slightly divergent) VPC setup.
- A migration checklist/runbook: for each repo, generate the module call from its existing resource configuration, run `terraform plan`, and only proceed if the plan shows no changes (or only the specific, understood changes needed to converge that repo onto the shared module).

## Trade-offs

- A shared module adds a layer of indirection — a change now requires bumping the module version and updating each consumer, instead of editing the file directly. That's the intended cost: it trades local editing convenience for consistency and single-source-of-truth maintenance.
- Supporting six already-slightly-divergent VPCs through one module's variables means the module needs enough configurability to cover real differences, which risks becoming overly generic if not scoped carefully — better to accept two or three module variants (e.g. `vpc-standard` and `vpc-multi-region`) than one module with dozens of conditional flags trying to cover every historical special case.
- Independent per-repo upgrade cadence (the whole point) means the six repos will, for a while, run different module versions simultaneously — a debugging and mental-overhead cost that's still better than six independently-drifting hand-written configurations.

## Failure Scenarios

- A consumer repo bumps to a new module version without running `plan` first, applies a version with an unexpected default change, and it recreates or modifies a live VPC unintentionally — mitigated by requiring a `plan`-reviewed PR for any module version bump, same as any other infrastructure change.
- The module's `variables.tf` accumulates special-case flags for each of the six repos' quirks until it's more complex than the original six copy-pasted files combined — mitigated by treating "this needs a new variable to support us" as a design conversation, not an automatic yes, and splitting into a second module variant when the divergence is structural rather than parametric.
- The module repository itself has no tests or validation, and a bad merge into its main branch isn't caught until a consumer applies it — mitigated by the module repo having its own `terraform validate`/`plan`-against-a-test-fixture CI, exactly like an application repository would.

## Security

Centralizing the VPC configuration is a security win as much as a maintenance one: a security-relevant fix (e.g. tightening a default security group rule, adding VPC Flow Logs by default) now needs to happen once and roll out via version bumps, instead of needing to be found and fixed independently in six repositories that have already drifted.

## Scalability

The versioned-module pattern scales cleanly to more than six consumers — the marginal cost of a seventh or twentieth consumer is just another `module` block with a version pin, not additional maintenance burden on the module itself. If the module's configurability needs grow significantly, splitting into focused module variants (rather than one module trying to parametrize everything) keeps that scaling sustainable.

## Cost Considerations

No direct infrastructure cost; the cost is entirely engineering time for the initial extraction and the one-time per-repo migration effort (verifying a zero-diff `plan` for each of the six). That cost is front-loaded and one-time, versus the ongoing, compounding cost of six configurations continuing to drift further apart.

## Real-World Approach

1. Extract the current VPC configuration from the repo whose setup is closest to the desired "standard" into a new module repository.
2. Parametrize the genuine differences (CIDR, AZ count, NAT strategy, tags) via variables; keep everything else fixed as the module's opinionated defaults.
3. Publish v1.0.0 to the registry (or tag it in Git).
4. Migrate the source repo the module was extracted from first — since its existing state should produce a zero-diff `plan` against the new module by construction.
5. For each of the remaining five repos, write the module call with inputs matching their current setup, run `plan`, and reconcile any unexpected diff (either the module needs another variable, or that repo's VPC had accidental drift worth fixing) before applying.
6. Once all six consume the module, establish semver discipline and a CHANGELOG for all future changes.

## Common Mistakes

- Trying to migrate all six repositories simultaneously instead of one at a time with a verified zero-diff plan for each.
- Under-versioning: treating every module change as safe to consume via an unpinned `main`/`master` source reference, which reintroduces the exact "changes ripple unpredictably" problem the module was meant to solve.
- Over-parametrizing the module to cover every historical special case instead of accepting a second module variant for structurally different needs.
- Skipping CI/validation on the module repository itself, treating it as lower-stakes than application code when it actually has a larger blast radius (six consumers, not one).

## Interview Follow-Up Questions

- How would you structure the module differently if the six repos were owned by six different teams with different release cadences and risk tolerances?
- What would make you choose a private registry over Git-tag-based module sourcing, or vice versa?
- How would you handle a breaking change that genuinely needs to reach all six consumers within a specific timeframe (e.g. a security fix)?

## Key Takeaways

- A shared module is only as valuable as the discipline around versioning it — unpinned sources reintroduce the coordination problem you're trying to solve.
- Migrate consumers one at a time, each verified with a zero-diff `plan`, never as a single simultaneous cutover.
- Prefer a second module variant over an increasingly complex set of conditional flags when consumers' needs are structurally different, not just parametrically different.
- Treat the module repository itself as production infrastructure code, with its own validation and review process.

## References

- [Terraform docs: Modules overview](https://developer.hashicorp.com/terraform/language/modules)
- [Terraform docs: Module versions](https://developer.hashicorp.com/terraform/language/modules/syntax#version)
- [Terraform docs: Publishing modules to the Terraform registry](https://developer.hashicorp.com/terraform/registry/modules/publish)
