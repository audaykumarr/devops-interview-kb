---
id: infrastructure-as-code-module-design-tool-choice-001
title: "How would you actually decide between Terraform, Pulumi, and a cloud-native tool like CloudFormation for a new project, beyond just 'what the team already knows'?"
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
  - pulumi
  - tool-selection
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Starting a new project, you need to choose an Infrastructure as Code tool: Terraform, Pulumi, or a cloud-native option like CloudFormation. Beyond "what the team already knows," what actually distinguishes these, and how would you make a deliberate choice?

## Short Answer

Terraform's declarative HCL and broad multi-cloud provider ecosystem make it the reasonable default for most teams, especially multi-cloud or provider-agnostic ones. Pulumi's key differentiator is using a genuine general-purpose programming language (Python, TypeScript, Go) instead of a domain-specific language, which is a real advantage for teams wanting to apply existing language tooling (testing frameworks, IDEs, package managers) directly to infrastructure code, at the cost of a steeper learning curve for infrastructure-focused engineers less familiar with general-purpose programming. Cloud-native tools like CloudFormation offer the tightest integration and fastest support for new features on their specific cloud, at the direct cost of being locked to that one provider.

## Detailed Explanation

The decision genuinely depends on specific project and team characteristics, not a universal "best tool" — each option optimizes for a different combination of provider breadth, language ergonomics, and ecosystem maturity.

**Terraform's strength is breadth and ecosystem maturity**: a huge, mature provider ecosystem covering essentially every major cloud and many SaaS tools, a large community producing reusable modules, and a declarative model (HCL) that's purpose-built for describing infrastructure state — the reasonable default for teams working across multiple clouds/providers or wanting the largest available ecosystem of existing modules and community knowledge to draw on.

**Pulumi's strength is using a real programming language**: rather than a domain-specific language, Pulumi lets you write infrastructure code in Python, TypeScript, Go, or other general-purpose languages — meaning you get real loops, conditionals, functions, and can directly use that language's existing testing frameworks, IDE tooling, and package ecosystem, rather than HCL's more constrained expression capabilities. This is a genuine advantage for teams who want infrastructure code to feel like "real code" with all the tooling that implies, though it requires infrastructure engineers to be comfortable with general-purpose programming, which isn't a universal skill even among experienced infrastructure teams.

**Cloud-native tools (CloudFormation, ARM templates, Google Deployment Manager) offer the tightest integration with their specific cloud**: new provider features often land in the cloud-native tool first (sometimes significantly before Terraform's provider catches up), and there's no third-party provider layer between your configuration and the cloud's actual API — the direct trade-off is complete lock-in to that one cloud, which is a non-starter for any multi-cloud strategy and a real constraint even for single-cloud teams who might want portability optionality later.

**Provider support lag is a real, practical consideration**: Terraform and Pulumi both depend on provider maintainers (sometimes the cloud vendor itself, sometimes community-maintained) keeping pace with new cloud features — a brand-new cloud service might not have Terraform/Pulumi provider support for weeks or months after launch, while the cloud-native tool typically supports it immediately, which matters if your project needs to adopt cutting-edge services quickly.

**State management approach also differs and matters for team workflow**: Terraform's explicit state file model (requiring deliberate remote state configuration, locking, and the operational discipline covered in other state-management questions) differs from how Pulumi and cloud-native tools handle state — this is worth understanding concretely for your team's specific workflow, not just abstractly, since state-handling mistakes are a common source of real incidents regardless of which tool you choose.

**The practical decision framework**: multi-cloud or provider-agnostic needs favor Terraform's breadth; a team that wants infrastructure code to be "real code" with existing language tooling favors Pulumi; a team fully committed to one cloud that wants the fastest access to that cloud's newest features favors the cloud-native tool — "what the team already knows" is a legitimate practical factor too, but shouldn't be the only one considered, since a mismatch between tool strengths and actual project needs creates real friction down the line regardless of initial familiarity.

## Key Takeaways

- Terraform's breadth (multi-cloud provider ecosystem, large module community) makes it the reasonable default for most teams, especially multi-cloud ones.
- Pulumi's key differentiator is using a real general-purpose programming language, letting teams apply existing language tooling directly to infrastructure code, at the cost of requiring general-purpose programming comfort.
- Cloud-native tools offer the tightest, fastest integration with one specific cloud, at the direct cost of complete lock-in to that provider.
- Provider support lag for new cloud features is a real, practical difference between third-party tools (Terraform/Pulumi) and cloud-native tools, worth weighing if your project needs fast access to cutting-edge services.

## Interview Follow-Up Questions

- How would you migrate an existing large Terraform codebase to Pulumi (or vice versa) if the tool choice needed to change later?
- How would you evaluate a specific cloud provider's Terraform provider maturity before committing to it for a critical project?
- What organizational factors, beyond the technical comparison, would influence this decision in a real company?

## References

- [HashiCorp: Terraform](https://developer.hashicorp.com/terraform)
- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [AWS: CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html)
