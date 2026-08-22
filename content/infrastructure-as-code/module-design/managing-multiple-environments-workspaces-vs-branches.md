---
id: infrastructure-as-code-module-design-multi-environment-001
title: "How would you manage the same Terraform configuration across dev, staging, and production — Terraform workspaces, separate directories, or separate branches? What actually determines the right choice?"
category: infrastructure-as-code
subcategory: module-design
technologies:
  - terraform
difficulty: intermediate
question_type:
  - comparison
tags:
  - infrastructure-as-code
  - terraform
  - environments
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You need to manage essentially the same infrastructure configuration across dev, staging, and production environments. Terraform offers workspaces as a built-in mechanism, but many teams instead use separate directories (or separate state files/branches) per environment. What actually determines the right choice?

## Short Answer

Terraform workspaces are the lightest-weight option, sharing the same configuration code across environments with only variable values differing — appropriate when environments are genuinely near-identical and you want to minimize duplication, but they carry a real risk: it's easy to accidentally run a command against the wrong workspace, and workspaces don't naturally support environments that need genuinely different configuration (not just different variable values). Separate directories per environment (each with its own state, explicitly selected by directory) trade some code duplication for much clearer environment isolation and much lower risk of accidentally targeting the wrong environment — the more commonly recommended approach for production-critical infrastructure specifically because of that safety property.

## Detailed Explanation

The comparison centers on a real trade-off between minimizing code duplication (workspaces) and maximizing environment isolation and safety (separate directories) — and for infrastructure where accidentally applying a production change while believing you're targeting dev is a serious, real risk, that safety property tends to dominate the decision.

**Terraform workspaces share the same configuration, differing only via variables and workspace-scoped state**: a single set of `.tf` files serves every environment, with `terraform workspace select` switching which state file (and often which variable values, via `terraform.workspace`-conditional logic) apply — genuinely minimal code duplication, since there's only one copy of the actual configuration.

**The core risk with workspaces is exactly that lightweight switching**: since selecting a workspace is a separate, easy-to-forget command (`terraform workspace select production`) rather than an explicit part of every command's targeting, it's genuinely possible to run `terraform apply` while believing you're in a different workspace than you actually are — a mistake with potentially serious consequences if it means accidentally applying dev-intended changes against production, and this specific risk is the primary reason many teams avoid workspaces for genuinely divergent, high-stakes environments.

**Separate directories per environment make the target explicit in every command**: each environment (`environments/dev/`, `environments/staging/`, `environments/production/`) has its own directory, its own state configuration, and running any Terraform command requires being in (or explicitly targeting) that specific directory — there's no ambient, easy-to-forget "current workspace" state; the environment you're targeting is explicit in your working directory or command, which meaningfully reduces the risk of accidentally targeting the wrong one.

**Separate directories also naturally support genuinely divergent environments**: if production needs meaningfully different configuration beyond just different variable values (a different architecture, additional resources not present in dev), separate directories accommodate this naturally, since each is its own independent configuration — workspaces, sharing one set of configuration files, handle this awkwardly at best, typically requiring conditional logic scattered throughout the shared configuration to handle environment-specific differences.

**Shared logic can still be reused across separate-directory environments via modules**: choosing separate directories for environment isolation doesn't mean duplicating all the underlying resource logic — a shared module (referenced by each environment's directory, with environment-specific variable values passed in) captures the common logic once, while each environment's directory remains the explicit, isolated entry point — combining code reuse with the safety of explicit environment targeting.

**The practical recommendation**: workspaces are reasonable for genuinely low-stakes, near-identical environments (perhaps ephemeral feature-branch preview environments) where the accidental-wrong-target risk is low-consequence; separate directories (using shared modules to avoid duplicating logic) are the safer, more commonly recommended default for anything where accidentally targeting production would be a real incident.

## Key Takeaways

- Terraform workspaces minimize code duplication but carry a real risk: switching workspaces is an easy-to-forget separate command, making accidental wrong-environment targeting genuinely possible.
- Separate directories per environment make the target explicit in every command (via working directory), meaningfully reducing that risk, and naturally support environments that need genuinely different configuration, not just different variable values.
- Shared modules let separate-directory environments reuse common logic, combining code reuse with the safety of explicit environment isolation.
- Workspaces are reasonable for low-stakes, near-identical, ephemeral environments; separate directories are the safer default for anything where a wrong-environment mistake would be a real incident.

## Interview Follow-Up Questions

- How would you structure CI/CD pipelines differently for a workspace-based approach versus a separate-directory approach?
- What additional safeguards would you add on top of either approach to further reduce the risk of accidentally targeting production?
- How would you migrate an existing workspace-based setup to separate directories without disrupting current infrastructure?

## References

- [Terraform: Workspaces](https://developer.hashicorp.com/terraform/language/state/workspaces)
- [HashiCorp: Managing Multiple Environments](https://developer.hashicorp.com/terraform/tutorials/modules/module-use)
