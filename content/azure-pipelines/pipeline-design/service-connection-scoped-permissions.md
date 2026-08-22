---
id: azure-pipelines-pipeline-design-service-connection-scope-001
title: "A single Azure service connection with subscription-wide Contributor access is used by every pipeline, including ones that only read a storage account. What's wrong here?"
category: azure-pipelines
subcategory: pipeline-design
technologies:
  - azure-pipelines
difficulty: advanced
question_type:
  - security
  - architecture
tags:
  - azure-pipelines
  - service-connections
  - least-privilege
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You discover that every pipeline in your Azure DevOps project — including ones that only need to read from a storage account — uses the same single service connection, which has Contributor access across the entire Azure subscription. What's wrong with this setup, and how would you fix it?

## Short Answer

This is a broad, shared over-permissioning problem: any pipeline (or anyone who can trigger/modify one) effectively has subscription-wide Contributor access, meaning a mistake or compromise in any single pipeline's configuration — even one that only needed read access to a storage account — has subscription-wide blast radius. Fix by creating narrowly-scoped service connections per actual need (per resource group, or per specific resource, with the minimum role required), and assign each pipeline only the service connection matching what it actually does.

## Detailed Explanation

The core problem is that a single, broadly-scoped, shared credential violates least privilege in exactly the way that turns a small mistake into a large incident — a pipeline that only needs to read a storage account has no functional need for subscription-wide write access, but because it's using the same service connection as pipelines that do need broader access, it has that access anyway, with no structural boundary preventing misuse (accidental or malicious) of the excess permission.

## Requirements

- Each pipeline should have access scoped to only what it actually needs to do its job.
- A mistake or compromise in one pipeline's configuration should not automatically grant subscription-wide impact.
- Legitimate pipelines that genuinely need broader access (a full deployment pipeline, for instance) should still be able to get it, scoped appropriately to their actual need.

## Architecture

**Audit what each pipeline actually needs, not what's convenient to assume**: before creating new service connections, determine each pipeline's genuine minimum required access — a pipeline reading from one storage account needs read access to that specific storage account, not Contributor access to the subscription, and this needs to be verified by checking actual pipeline behavior, not just guessed at.

**Create narrowly-scoped service connections matching actual need**: rather than one subscription-wide connection, create service connections scoped to specific resource groups (for pipelines that manage resources within one resource group) or specific resources (for pipelines with a narrower need, like the storage-account-reading example), each granted only the role actually required (Reader instead of Contributor, where write access isn't needed).

**Reassign each pipeline to its appropriately-scoped connection**: this is a real migration — going through each pipeline, determining which narrow connection now matches its actual need, and updating its configuration, then verifying it still works correctly with the reduced permissions before considering the migration complete for that pipeline.

**Restrict who can create or modify service connections at the project level**: this specific problem (one shared, over-broad connection used everywhere) often originates from convenience during initial setup — restricting service connection creation/management to a smaller group, and requiring new connections to be justified by actual need, prevents the pattern from recurring as new pipelines get added.

## Trade-offs

Narrowly-scoped service connections mean more connections to create and manage over time, and a genuine coordination cost when a pipeline's needs legitimately grow (requiring a connection scope update, ideally reviewed rather than just widened without scrutiny). This is a real ongoing operational cost, weighed against the security benefit of bounding each pipeline's actual blast radius to what it genuinely needs.

## Key Takeaways

- A single, broadly-scoped, shared service connection means every pipeline effectively has that connection's full access, regardless of what any specific pipeline actually needs — violating least privilege by default.
- Audit actual per-pipeline access needs before creating narrower connections, rather than guessing or assuming.
- Scope new service connections to the actual resource group or resource, with the minimum role required (Reader versus Contributor), matching each pipeline's genuine need.
- Restrict who can create/manage service connections going forward, so this pattern doesn't quietly re-emerge as new pipelines are added over time.

## Interview Follow-Up Questions

- How would you prioritize which pipelines to migrate to narrowly-scoped connections first, given this affects every pipeline in the project?
- How would you handle a pipeline whose actual access needs are genuinely unclear or poorly documented, similar to the Classic-pipeline migration problem?
- What ongoing process would you put in place so new pipelines default to a narrowly-scoped connection rather than reusing the broad one out of convenience?

## References

- [Azure DevOps: Manage service connections](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints)
- [Azure: Least privilege administrative model](https://learn.microsoft.com/en-us/security/compass/privileged-access-access-model)
