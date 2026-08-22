---
id: infrastructure-as-code-module-design-testing-001
title: "Your team writes automated tests for application code as a matter of course, but your Terraform modules have none. How would you introduce testing for infrastructure code?"
category: infrastructure-as-code
subcategory: module-design
technologies:
  - terraform
difficulty: intermediate
question_type:
  - practical
tags:
  - infrastructure-as-code
  - terraform
  - testing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your team rigorously writes automated tests for application code, but your Terraform modules have essentially none — bugs in a module (a misconfigured variable, an unintended resource change) are typically only discovered when someone actually runs `terraform apply` against real infrastructure. How would you introduce meaningful automated testing for infrastructure code?

## Short Answer

Layer testing the same way you would for application code, from fast/cheap to slow/expensive: static analysis and linting (catching syntax and style issues instantly), policy/compliance checks against the generated plan (catching violations of your organization's rules before anything is applied), and actual integration tests that provision real (throwaway) infrastructure and verify it behaves correctly, then tear it down — reserving the expensive, slow integration tests for the module's core behavior, not every possible configuration permutation.

## Detailed Explanation

The instinct to skip infrastructure testing often comes from it feeling fundamentally different from application testing — you can't easily "unit test" a resource block the way you'd unit test a function — but a layered testing strategy, mirroring the same fast-to-slow pyramid used for application code, is both achievable and valuable for infrastructure.

**Static analysis and linting catch a real class of bugs instantly, before anything is applied**: tools like `terraform validate` (built-in syntax/type checking), `tflint` (catching provider-specific issues and best-practice violations), and format checking (`terraform fmt -check`) run in seconds as part of CI, catching typos, invalid resource configurations, and common mistakes without needing to provision anything — this is the cheapest, fastest layer and should run on every single commit.

**Policy-as-code checks against the generated plan catch organizational-rule violations before apply**: tools like Open Policy Agent/Conftest, or Terraform's own Sentinel (for Terraform Cloud/Enterprise), evaluate the `terraform plan` output against defined policies — no public S3 buckets, required tags on every resource, no overly permissive security group rules — catching violations of your organization's actual standards before they're ever applied to real infrastructure, not after a security audit finds them.

**Integration tests provision real (throwaway) infrastructure and verify actual behavior**: tools like Terratest (or Terraform's own built-in testing framework, `terraform test`) actually run `terraform apply` against a real, isolated test environment, verify the provisioned infrastructure behaves as expected (a security group actually allows the traffic it should and blocks what it shouldn't, an endpoint is actually reachable), then tear everything down — this is the layer that catches bugs static analysis and policy checks structurally can't (things that are syntactically and policy-valid but still don't do what's intended), at the cost of real time and cloud cost per test run.

**Reserve integration tests for core module behavior, not exhaustive permutation coverage**: given integration tests are meaningfully slower and more expensive than the earlier layers, testing every possible input combination isn't a good use of that cost — focus integration test coverage on the module's most critical, most commonly-used configurations and its riskiest edge cases, letting the cheaper static analysis and policy layers catch the broader surface of possible mistakes.

**Testing in CI on every PR, with integration tests potentially gated to reduce cost/frequency**: static analysis and policy checks can reasonably run on every single commit given their low cost; integration tests, being slower and costing real cloud spend per run, are sometimes gated to run on PRs specifically touching the module's core logic, or on a scheduled cadence, rather than on every single commit to every file in the repository — a deliberate cost/thoroughness trade-off worth making explicitly.

## Key Takeaways

- Layer infrastructure testing from fast/cheap (static analysis, linting) to slow/expensive (real integration tests provisioning throwaway infrastructure), mirroring the application-testing pyramid.
- Static analysis (`terraform validate`, `tflint`, format checking) catches a real class of bugs instantly and should run on every commit.
- Policy-as-code (OPA/Conftest, Sentinel) evaluates the generated plan against organizational rules, catching violations before anything is applied to real infrastructure.
- Integration tests (Terratest, `terraform test`) catch bugs the cheaper layers structurally can't, but should focus on core behavior and risky edge cases rather than exhaustive permutation coverage, given their real time and cost per run.

## Interview Follow-Up Questions

- How would you handle integration test cleanup reliably, ensuring throwaway test infrastructure doesn't accidentally persist and accumulate cost?
- How would you decide which policy rules are strict, blocking violations versus advisory warnings?
- How would you introduce this testing strategy incrementally into an existing large module library that currently has zero test coverage?

## References

- [HashiCorp: Terraform test](https://developer.hashicorp.com/terraform/language/tests)
- [Terratest](https://terratest.gruntwork.io/)
- [Open Policy Agent: Conftest](https://www.conftest.dev/)
