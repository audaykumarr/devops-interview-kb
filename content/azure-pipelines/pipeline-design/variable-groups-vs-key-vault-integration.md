---
id: azure-pipelines-pipeline-design-variable-groups-vs-key-vault-001
title: "When would you store a pipeline secret in an Azure Pipelines variable group directly versus linking the variable group to Azure Key Vault?"
category: azure-pipelines
subcategory: pipeline-design
technologies:
  - azure-pipelines
difficulty: intermediate
question_type:
  - comparison
tags:
  - azure-pipelines
  - secrets-management
  - key-vault
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Azure Pipelines variable groups can store secret values directly, or be linked to Azure Key Vault to pull secrets from there instead. When would you use each approach?

## Short Answer

Storing a secret directly in a variable group is simpler but ties the secret's lifecycle and access control entirely to Azure DevOps itself, with manual rotation. Linking to Key Vault centralizes secret storage and access control in a system designed specifically for that (with proper audit logging, access policies, and support for rotation), at the cost of additional setup — the right default for anything beyond a small team or low-stakes secret is linking to Key Vault, treating Azure DevOps variable groups as a reference to secrets, not the actual source of truth for them.

## Detailed Explanation

The comparison mirrors the same trade-off as choosing between a CI tool's built-in credentials store and an external secrets manager elsewhere — the question is whether you want your CI system to be the actual secret store (simpler, but coupling secret security entirely to that CI system's own access model) or a consumer of secrets held in a purpose-built system.

**Directly-stored variable group secrets are simple and self-contained**: no external system integration required, secrets are encrypted at rest within Azure DevOps, and access is controlled via Azure DevOps' own variable group permissions — a reasonable approach for a small team or genuinely low-sensitivity values, where the operational simplicity outweighs the benefits of centralization.

**Key Vault-linked variable groups centralize secrets in a system built specifically for secret management**: Key Vault provides its own detailed access policies (independent of, and layered on top of, Azure DevOps' own permissions), a real audit log of every secret access, and support for automated rotation — none of which Azure DevOps' own variable group storage provides natively. Since many organizations already use Key Vault for application runtime secrets too, linking pipeline secrets to the same Key Vault means one consistent secret store and audit trail across both CI/CD and application runtime, rather than secrets scattered across multiple disconnected systems.

**Key Vault linking also reduces blast radius from an Azure DevOps compromise specifically**: if Azure DevOps itself were compromised (a malicious pipeline, an over-privileged service connection, a compromised admin account), directly-stored variable group secrets would be directly exposed; Key Vault-linked secrets still require whatever access token or service connection Azure Pipelines uses to reach Key Vault, meaning an additional access-control layer that a directly-stored secret doesn't have.

**The practical trade-off is setup and operational overhead**: linking a variable group to Key Vault requires configuring a service connection with appropriate Key Vault access, and means secret changes happen in Key Vault rather than directly in the Azure DevOps UI — a real workflow change for teams used to managing secrets in one place.

## Key Takeaways

- Directly-stored variable group secrets are simple but tie secret security entirely to Azure DevOps' own access model, with manual rotation.
- Key Vault-linked variable groups centralize secrets in a purpose-built system with proper access policies, audit logging, and rotation support.
- Using the same Key Vault for both pipeline secrets and application runtime secrets gives one consistent store and audit trail, rather than secrets scattered across systems.
- The practical cost is setup and workflow overhead — a real trade-off worth making deliberately based on team scale and secret sensitivity, not defaulting to the simpler option purely out of habit.

## Interview Follow-Up Questions

- How would you migrate an existing set of directly-stored variable group secrets to Key Vault without disrupting running pipelines?
- What access control would you put on the service connection Azure Pipelines uses to reach Key Vault, so that connection itself doesn't become an overly broad point of access?
- How would you handle secret rotation in Key Vault in a way that pipelines automatically pick up the new value without manual pipeline changes?

## References

- [Azure Pipelines: Link secrets from an Azure key vault](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)
- [Azure Key Vault: Documentation](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
