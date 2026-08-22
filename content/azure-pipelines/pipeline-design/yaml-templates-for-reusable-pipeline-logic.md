---
id: azure-pipelines-pipeline-design-yaml-templates-001
title: "You have near-identical build logic copy-pasted across 15 Azure Pipelines YAML files. How would you use templates to share it, and what are the different template types actually for?"
category: azure-pipelines
subcategory: pipeline-design
technologies:
  - azure-pipelines
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - azure-pipelines
  - templates
  - yaml
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You maintain 15 Azure Pipelines YAML files with substantial copy-pasted build logic across them — meaning a fix or improvement has to be manually applied 15 times. How would you use Azure Pipelines templates to share this logic, and what's the actual difference between the template types available?

## Short Answer

Extract the shared logic into a template file (in a dedicated repository if it needs to be shared across multiple pipeline repositories) and reference it via `extends:`, `steps: - template:`, `jobs: - template:`, or `stages: - template:`, depending on what level of the pipeline structure you're actually sharing — a set of steps becomes a step template, a full job becomes a job template, and so on; `extends` templates specifically let you enforce a required overall structure that consuming pipelines can't override, which matters when the goal includes standardization, not just reuse.

## Detailed Explanation

Azure Pipelines templates exist at different structural levels matching the pipeline hierarchy itself (stages contain jobs, jobs contain steps), and picking the right level for what you're actually sharing is what keeps the resulting templates clean and composable rather than forcing everything into one oversized template.

**Step templates** share a sequence of steps meant to be inserted into a job that a consuming pipeline otherwise defines itself — appropriate for something like "our standard build-and-publish-artifact sequence" that gets embedded alongside other steps a specific pipeline also needs.

**Job templates** share an entire job, including its own pool/agent configuration and full set of steps — appropriate when the shared unit of work is a complete job (e.g., "our standard security scan job") that a consuming pipeline just wants to include wholesale, without needing to add anything else inside it.

**Stage templates** share a full stage (potentially multiple jobs) — appropriate for something like "our standard deployment stage," including whatever multi-job structure that deployment process actually requires.

**`extends` templates are structurally different from the others**: rather than being inserted into a pipeline the consumer otherwise controls, an `extends` template defines the base structure of the entire pipeline, and the consuming YAML file effectively fills in specific, template-defined parameters — this is the mechanism for enforcing organization-wide pipeline standards (e.g., "every pipeline must include this security scan stage, and consuming teams can't remove it"), since the consuming pipeline can't restructure what the extends template defines, only supply the parameters it exposes.

**Centralize shared templates in a dedicated repository** if they need to be used across multiple separate pipeline repositories, referenced via a `resources: repositories:` declaration — this is what actually lets a fix to the shared template propagate to every consuming pipeline (once they reference the updated version) instead of requiring the same copy-paste fix repeated everywhere.

## Key Takeaways

- Choose the template type (step, job, stage) matching the actual level of the pipeline structure you're sharing, not just wrapping everything in one large template regardless of shape.
- `extends` templates are structurally different — they define the pipeline's overall required structure, letting you enforce standards a consuming pipeline can't override, unlike the insertable step/job/stage templates.
- Centralize shared templates in a dedicated repository for cross-repository reuse, so a fix or improvement propagates instead of requiring repeated manual copy-paste changes.
- The underlying motivation (going from 15 copy-pasted files to one shared source of truth) is the same reasoning as any other DRY refactor — templates are how Azure Pipelines specifically implements that for pipeline configuration.

## Interview Follow-Up Questions

- How would you version a shared template so a breaking change doesn't immediately affect every consuming pipeline?
- How would you enforce that every pipeline in your organization actually uses the `extends` template with the required security stage, rather than teams opting out?
- How would you test a change to a shared template before it propagates to pipelines that depend on it?

## References

- [Azure Pipelines: Template types & usage](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/templates)
