---
id: azure-pipelines-pipeline-design-approval-gates-001
title: "How would you design a multi-stage Azure Pipelines YAML pipeline so production deployment requires manual approval, while dev and staging deploy automatically?"
category: azure-pipelines
subcategory: pipeline-design
technologies:
  - azure-pipelines
difficulty: intermediate
question_type:
  - architecture
tags:
  - azure-pipelines
  - approvals
  - environments
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You want a single multi-stage Azure Pipelines YAML pipeline to deploy automatically through dev and staging, but require an explicit manual approval before the production stage runs. How would you design this?

## Short Answer

Define each deployment target as an Azure DevOps Environment (`dev`, `staging`, `production`), and configure a required-approval check specifically on the `production` environment (via Environment settings, not in the pipeline YAML itself) — deployment jobs targeting a protected environment automatically pause for approval when they reach it, while jobs targeting `dev` and `staging` (with no approval check configured) proceed automatically.

## Detailed Explanation

Azure DevOps Environments are the purpose-built mechanism for exactly this pattern, similar in spirit to GitHub Actions' environment protection rules — the approval requirement lives on the environment's own configuration, not scattered through pipeline YAML conditionals, which keeps the pipeline definition itself simple and keeps the approval policy centrally manageable independent of any specific pipeline's YAML.

## Requirements

- Dev and staging deployments should proceed automatically without manual intervention.
- Production deployment must pause and require explicit approval from a designated approver before proceeding.
- The approval decision must be auditable, tied to the specific pipeline run and deployment.

## Architecture

**Define separate Environments for each deployment target**: in Azure DevOps, `dev`, `staging`, and `production` are each configured as their own Environment resource, with `production` having a "Approvals" check configured naming the specific people or group authorized to approve.

**Reference the environment in each deployment job**:

```yaml
- stage: DeployProduction
  jobs:
    - deployment: Deploy
      environment: production
      strategy:
        runOnce:
          deploy:
            steps:
              - script: ./deploy.sh
```

The `environment: production` reference is what connects this deployment job to the environment's approval check — Azure Pipelines automatically enforces it without any custom wait/poll logic needed in the YAML itself.

**The pipeline pauses natively at the approval gate**: when a run reaches a deployment job targeting `production`, it shows as "waiting for approval" in the Azure DevOps UI, and a designated approver reviews and approves (or rejects) directly there — the approval record, including who approved and when, is tied to that specific pipeline run for audit purposes.

**Combine with environment-scoped resources for additional safety**: service connections and variable groups can also be scoped to require approval or be restricted per environment, meaning production credentials aren't just gated by the deployment step's approval but can also require their own explicit authorization to be used at all — a useful additional layer if your production deployment credentials are especially sensitive.

## Trade-offs

This depends on the approver list actually being kept current and appropriately scoped — an approval gate naming someone who's left the team, or an overly broad approver list, undermines the control. It also means the approval process is tied to Azure DevOps' own UI/permission model, which is the right level of integration for most teams, but worth knowing if your organization needs the approval decision to also be reflected in a separate external change-management system.

## Key Takeaways

- Azure DevOps Environments with configured Approval checks are the purpose-built mechanism for this pattern — the approval policy lives on the environment, not scattered through pipeline YAML.
- Referencing `environment: production` on a deployment job is what connects it to the approval gate; Azure Pipelines enforces the pause automatically.
- Approval decisions are tied to the specific pipeline run for audit purposes, showing who approved and when.
- Keep the approver list current and appropriately scoped — the control's value depends entirely on who's actually authorized to approve.

## Interview Follow-Up Questions

- How would you handle an urgent production hotfix that needs to move faster than the normal approval process allows, without permanently weakening the control?
- How would you configure a multi-approver requirement (e.g., two people must approve) for particularly sensitive production deployments?
- How would you audit historical approval decisions for a compliance review across many pipelines?

## References

- [Azure Pipelines: Define approvals and checks](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals)
- [Azure Pipelines: Environments](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments)
