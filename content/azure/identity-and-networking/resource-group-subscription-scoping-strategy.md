---
id: azure-identity-networking-resource-group-scoping-001
title: "How would you design a resource group and subscription structure for an organization with 15 teams, balancing isolation, cost tracking, and not making every team manage their own subscription?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
difficulty: intermediate
question_type:
  - architecture
tags:
  - azure
  - resource-groups
  - subscriptions
  - governance
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your organization has 15 engineering teams that all need Azure resources. You need to design the resource group and subscription structure balancing genuine isolation between teams, accurate cost tracking per team, and not making subscription management itself an operational burden. How would you approach this?

## Short Answer

Use subscriptions as the primary isolation boundary for genuinely separate concerns (typically by environment — production versus non-production — and/or by significant organizational grouping, not necessarily one subscription per team), with resource groups as the finer-grained organizational unit within each subscription (commonly one resource group per team per environment, or per application), combined with a consistent tagging strategy for cost tracking that doesn't rely on subscription/resource-group boundaries alone. Management Groups then provide a hierarchy for applying policy and access control consistently across many subscriptions, rather than configuring each one independently.

## Detailed Explanation

The design question is fundamentally about matching Azure's actual isolation boundaries (subscription being the strongest, resource group being finer-grained within a subscription) to what genuinely needs strong isolation versus what just needs organizational grouping and cost visibility.

## Requirements

- Meaningful isolation between environments (production changes shouldn't be able to accidentally affect non-production, and vice versa) and, where warranted, between teams.
- Accurate cost attribution per team, without requiring an unmanageable number of separate subscriptions.
- Consistent policy and access control enforcement across the organization, without needing to configure each subscription independently from scratch.

## Architecture

**Subscriptions as the primary isolation boundary, scoped by what genuinely needs strong separation**: a subscription is Azure's strongest isolation unit — separate billing, separate default quotas/limits, a genuine security boundary — making it the right unit for separating environments (a `production` subscription entirely separate from `non-production`) and, for genuinely high-risk or heavily regulated teams, potentially their own subscription. For most of the 15 teams, though, one subscription per team is often unnecessary overhead — subscription-level management (quotas, policies, access reviews) multiplied by 15 becomes a real operational burden without a correspondingly strong isolation need for most of them.

**Resource groups as the finer-grained organizational unit within subscriptions**: within a shared subscription (e.g., a `non-production` subscription used by multiple teams), each team gets its own resource group (or one per team per application), providing a clear organizational boundary and a natural unit for access control (RBAC role assignments scoped to a specific resource group) without needing the heavier weight of a full separate subscription.

**A consistent, enforced tagging strategy for cost attribution, independent of the group/subscription structure**: relying purely on subscription or resource group boundaries for cost tracking becomes limiting once resources within a shared subscription need attribution to specific teams or cost centers — tagging every resource (via Azure Policy enforcement, not just convention) with a required `team`/`cost-center` tag lets cost reports be generated accurately regardless of the underlying resource group structure, and is more flexible than relying solely on structural boundaries.

**Management Groups provide a policy and access hierarchy across subscriptions**: rather than configuring Azure Policy, RBAC, and other governance settings independently on each of potentially several subscriptions, Management Groups let you define a hierarchy (e.g., grouping all "production" subscriptions under one management group, all "non-production" under another) and apply policy/access control at that level, inherited automatically by everything beneath it — this is what keeps governance manageable as the number of subscriptions grows, rather than requiring N times the configuration effort for N subscriptions.

**Teams needing genuinely stronger isolation get their own subscription, decided deliberately, not by default**: a team working with particularly sensitive data, subject to specific regulatory requirements, or needing quota/limit isolation from the rest of the organization is a legitimate case for a dedicated subscription — this should be an explicit decision based on real isolation need, not applied uniformly to all 15 teams regardless of whether they actually need that level of separation.

## Trade-offs

Fewer, shared subscriptions reduce subscription-management overhead but mean resource group-level RBAC and tagging discipline become more important (and more critical to get right), since the strongest Azure-native isolation boundary (subscription) isn't being used per-team — a misconfigured resource group-level permission has a different (potentially broader) blast radius than a misconfigured permission would within a fully separate, dedicated subscription. More subscriptions provide stronger native isolation but multiply the ongoing management burden (policy configuration, access reviews, quota management) across each one, which Management Groups help mitigate but don't eliminate entirely.

## Key Takeaways

- Use subscriptions as the primary isolation boundary for genuinely separate concerns (environments, and teams with real isolation needs) — not necessarily one subscription per team by default.
- Resource groups provide finer-grained organization within a shared subscription, a natural unit for team-level RBAC without the overhead of a full separate subscription.
- A consistently enforced tagging strategy (via Azure Policy, not just convention) provides accurate cost attribution independent of the structural group/subscription boundaries.
- Management Groups apply policy and access control consistently across many subscriptions, which is what keeps governance manageable as the subscription count grows.

## Interview Follow-Up Questions

- How would you decide which of the 15 teams genuinely need their own dedicated subscription versus sharing one?
- How would you enforce the tagging strategy so it's actually applied consistently, rather than relying on teams remembering to tag resources correctly?
- How would you handle a team that outgrows a shared subscription's quota limits, needing to migrate to a dedicated one later?

## References

- [Azure Docs: Organize your Azure resources effectively](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-setup-guide/organize-resources)
- [Azure Docs: Management groups](https://learn.microsoft.com/en-us/azure/governance/management-groups/overview)
