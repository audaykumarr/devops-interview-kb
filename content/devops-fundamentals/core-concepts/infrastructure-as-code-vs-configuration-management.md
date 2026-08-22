---
id: devops-fundamentals-core-concepts-iac-vs-config-mgmt-001
title: "Terraform and Ansible can both technically install packages on a server. What's the actual conceptual difference between infrastructure-as-code and configuration management?"
category: devops-fundamentals
subcategory: core-concepts
technologies:
  - devops
difficulty: beginner
question_type:
  - comparison
tags:
  - devops-fundamentals
  - infrastructure-as-code
  - configuration-management
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Terraform is described as an "infrastructure as code" tool, and Ansible as a "configuration management" tool — but Terraform's `local-exec` provisioner can technically run install commands, and Ansible can technically create cloud resources via its cloud modules. Given that overlap, what's the actual conceptual difference between these two categories, and why does it still matter which tool you reach for?

## Short Answer

Infrastructure as code tools (Terraform, CloudFormation) are fundamentally declarative and state-tracking — you describe the desired end state of infrastructure resources, and the tool computes and applies the diff against its own tracked record of current state. Configuration management tools (Ansible, Chef, Puppet) are fundamentally about configuring the *inside* of already-provisioned systems — installing packages, managing files, ensuring services are running — and while some (like Ansible) can be written in a largely declarative style, they generally don't maintain the same kind of persistent, tracked state file describing exactly what exists. The overlap in capability doesn't erase this conceptual difference — each tool's core design center of gravity is genuinely different, which is why using the wrong one for a given job (heavy infrastructure provisioning in Ansible, or deep OS-level configuration in Terraform) tends to feel awkward and fight the tool's actual design.

## Detailed Explanation

The practical overlap in capability (both can technically touch both concerns) is real, but doesn't mean the tools are interchangeable — the underlying design philosophy and what each tool is actually optimized for differs enough that reaching for the "wrong" one for a given job creates real friction, even when it's technically possible.

**Infrastructure as code tools track state explicitly and reason about resource lifecycle**: Terraform maintains a state file recording exactly what resources it's created and their current known configuration — this is what lets it compute an accurate diff between desired and current state, decide whether a change requires an in-place update or a destroy-and-recreate, and detect drift. This state-tracking is the core architectural feature that makes Terraform good at managing the *existence and configuration* of infrastructure resources (VMs, networks, managed databases) as first-class, individually tracked objects.

**Configuration management tools are optimized for converging a system's internal state, typically without the same persistent state-tracking**: Ansible playbooks describe the desired configuration of a system (packages installed, files present with specific content, services running) and, when written idempotently, converge the target toward that state each run — but Ansible doesn't maintain a Terraform-style state file recording "here's exactly what I created and its ID" the way Terraform does; it re-evaluates the target system's actual current state each run (checking whether a package is already installed, a file already has the right content) rather than consulting a separate persistent record.

**This difference in state-tracking approach is why each tool suits different problems well**: Terraform's explicit state tracking is well-suited to managing discrete, individually-identifiable infrastructure resources with complex lifecycle relationships (a VM depends on a network, which depends on a VPC) — exactly the kind of dependency graph Terraform's planning engine is built to reason about. Ansible's approach (re-checking actual system state each run, without a separate state file) fits configuring the internals of systems that already exist, where the "source of truth" for current state is genuinely just the system itself, not a separate tracked record.

**Using a configuration management tool for heavy infrastructure provisioning loses the state-tracking benefits Terraform provides**: you could use Ansible's cloud modules to create VMs, but you lose Terraform's explicit plan/diff workflow, its dependency graph resolution, and its drift detection — Ansible would need to re-query the cloud provider's actual state each run to figure out what exists, which is a fundamentally less robust approach for managing complex, interdependent infrastructure resources at scale.

**Using an infrastructure-as-code tool for deep OS-level configuration fights against its actual design**: Terraform's `local-exec`/`remote-exec` provisioners exist, but are explicitly documented as a last resort — they're imperative escape hatches bolted onto a fundamentally declarative, state-tracked tool, lacking configuration management's actual strengths (proper idempotency checking for OS-level changes, a rich library of platform-specific configuration modules, structured handling of configuration drift within a running system).

**The practical convention that reflects this**: use Terraform (or equivalent) to provision and manage the existence/configuration of infrastructure resources; use Ansible (or equivalent) to configure what runs inside those resources once they exist — often used together in the same pipeline, each doing the part it's actually designed for, rather than one tool trying to do both jobs.

## Key Takeaways

- Infrastructure as code tools (Terraform) maintain explicit, persistent state tracking, enabling accurate diffing, dependency resolution, and drift detection for discrete infrastructure resources.
- Configuration management tools (Ansible) converge a system's internal configuration by re-checking actual current state each run, without the same persistent state-tracking file.
- The capability overlap (both can technically touch both concerns) doesn't erase the difference in what each tool is actually optimized for and designed around.
- The practical convention is using each tool for what it's designed for — infrastructure provisioning via IaC, in-system configuration via configuration management — often together in the same pipeline.

## Interview Follow-Up Questions

- What are the risks of relying heavily on Terraform's `local-exec`/`remote-exec` provisioners instead of a proper configuration management tool for post-provisioning setup?
- How would you design a pipeline that uses both Terraform and Ansible together, and what's the natural handoff point between them?
- How does Kubernetes' own declarative resource model relate to this IaC-versus-configuration-management distinction?

## References

- [Terraform: Provisioners are a last resort](https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax)
- [Ansible: How Ansible works](https://docs.ansible.com/ansible/latest/getting_started/index.html)
