---
id: gitops-repository-patterns-environment-promotion-001
title: "In a GitOps setup, how do you actually promote a change from staging to production — is it a separate deploy, or literally the same Git commit moving between environments?"
category: gitops
subcategory: repository-patterns
technologies:
  - gitops
difficulty: intermediate
question_type:
  - practical
  - architecture
tags:
  - gitops
  - environment-promotion
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

In a traditional CI/CD pipeline, promoting a build from staging to production is often a re-run or re-trigger of the same pipeline against a different target. In a GitOps setup, where Git is the source of truth for what's deployed, how does promotion actually work — is it a separate deploy process, or literally the same Git commit moving between environments?

## Short Answer

Promotion in GitOps is a Git operation, not a separate deploy mechanism: each environment has its own directory or branch declaring its desired state, and promoting a change from staging to production means updating production's declared configuration (typically the image tag/version) to match what's already been validated in staging — usually via a PR that copies the exact, already-tested artifact reference forward, so production ends up running literally the same build that was validated in staging, not a fresh build re-triggered against production.

## Detailed Explanation

The core GitOps principle — Git as the single source of truth for desired state — extends naturally to environment promotion: since each environment's desired state is declared in Git, "promoting" a change is simply updating the declaration for the next environment, which the GitOps reconciliation loop then applies automatically, rather than promotion being a separate imperative action outside Git's tracking.

## Requirements

- Production must run the exact, already-validated artifact/build that passed staging, not a fresh rebuild that could introduce inconsistency between what was tested and what's deployed.
- The promotion action itself must be reviewable and auditable, matching the same governance GitOps applies to other changes.
- Different environments must be able to have some environment-specific configuration (replica counts, resource limits) without that blocking promotion of the actual application version.

## Architecture

**Each environment has its own declared desired state, commonly via directory or branch structure**: a common pattern uses per-environment directories (`environments/staging/`, `environments/production/`) or branches, each declaring that environment's current desired configuration, including which specific image tag/version should be running — this gives each environment an independently declared, Git-tracked state, rather than one shared declaration ambiguously applying to all environments.

**Promotion updates the target environment's declared image tag/version to match what was validated**: rather than rebuilding or re-triggering a pipeline against production, promotion is literally updating `environments/production/`'s manifest to reference the same image tag that's currently running successfully in staging — since it's the identical artifact, there's no risk of "it worked in staging but the production build was subtly different," a real risk in pipeline-re-trigger-based promotion models.

**The promotion PR is itself the review and audit trail**: opening a PR that changes production's declared image tag is a natural, reviewable unit of change — a teammate can review exactly what's being promoted (which version, referencing the staging validation that preceded it) before merging, giving promotion the same governance rigor as any other GitOps-tracked change, without needing a separate approval system outside Git.

**Environment-specific configuration stays separate from the promoted artifact reference**: each environment's directory can independently declare its own replica count, resource limits, or environment-specific config values, while the image tag/version field is what actually gets promoted — this separation means promoting an application version doesn't require also promoting environment-specific settings that should legitimately differ between staging and production.

**Automation can generate the promotion PR, keeping the human step as review rather than manual editing**: rather than manually editing the production manifest, a common pattern uses automation (triggered after staging validation succeeds) to automatically open a promotion PR with the correct updated image reference — reducing manual error while still requiring a human review/merge as the actual gate before production changes.

## Trade-offs

This model requires genuine discipline in keeping environment-specific configuration separate from the promoted application version, since conflating them (accidentally promoting environment-specific settings) can cause unintended cross-environment configuration drift. It also means promotion latency depends on how quickly a promotion PR is reviewed and merged — if this becomes a slow, manual bottleneck, it can undermine the goal of fast, safe promotion the pattern is meant to support, similar to any other PR-based approval gate.

## Key Takeaways

- Promotion in GitOps is a Git operation — updating the target environment's declared configuration to reference an already-validated artifact — not a separate deploy mechanism or a rebuild against the new environment.
- Promoting the exact, already-tested artifact (not rebuilding) is what guarantees what's deployed to production is identical to what was actually validated in staging.
- The promotion PR itself serves as the review and audit trail, giving promotion the same governance as any other GitOps-tracked change.
- Keep environment-specific configuration (replica counts, resource limits) separate from the promoted application version reference, so promotion doesn't inadvertently carry over settings that should legitimately differ between environments.

## Interview Follow-Up Questions

- How would you automate generating the promotion PR while still requiring meaningful human review before it merges?
- How would you handle a rollback in this model — is it also just a Git revert of the promotion commit?
- How would you extend this pattern to more than two environments (dev, staging, canary, production) with different promotion criteria at each stage?

## References

- [Argo CD: Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Weaveworks: GitOps Guide](https://www.weave.works/technologies/gitops/)
