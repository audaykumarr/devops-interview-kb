---
id: github-actions-security-oidc-monorepo-multiple-targets-001
title: "How would the OIDC-based deploy design change for a monorepo where multiple independent deploy targets live in one repository?"
category: github-actions
subcategory: security
technologies:
  - github-actions
  - aws
difficulty: expert
question_type:
  - architecture
tags:
  - github-actions
  - oidc
  - monorepo
  - security
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The single-repo OIDC deploy pattern scopes a trust policy to a repository and branch. In a monorepo with several independent services, each deploying to its own AWS resources, how does that design need to change so one service's workflow can't deploy another's infrastructure?

## Short Answer

A repository-and-branch-scoped `sub` claim alone can't distinguish between services in a monorepo, since they all share the same repo and branch — the fix is using GitHub's **environments** (each service gets its own named deployment environment) combined with the `sub` claim's environment-aware pattern (`repo:<org>/<repo>:environment:<name>`), giving each service's deploy job a distinct trust-policy condition tied to its own environment, with a separate IAM role per service scoped only to that service's resources.

## Detailed Explanation

The single-repo pattern's scoping unit (repository plus branch) simply isn't granular enough once several independently-deployable services live under that same repository and branch — a new scoping dimension is needed that maps to "which service," not just "which repo/branch."

## Requirements

- Each service's deploy workflow must only be able to assume the IAM role for its own resources, not another service's.
- The trust policy scoping must work within a single repository and branch, since a monorepo shares both across all services.
- Adding a new service to the monorepo shouldn't require broadening any existing service's permissions.

## Architecture

**GitHub Environments as the scoping unit**: define a separate GitHub environment per service (`environment: service-a-production`, `environment: service-b-production`) in each service's deploy job. GitHub's OIDC token includes the environment in its `sub` claim when a job specifies one (`repo:<org>/<repo>:environment:<name>`), which is exactly the missing piece a plain repo/branch-scoped condition can't provide within a monorepo — it lets the trust policy distinguish which specific deploy job (by environment name) is requesting credentials, not just which repository and branch.

**One IAM role per service, each trusting only its own environment**: each service gets its own dedicated IAM role, with a trust policy condition scoped to that service's specific environment `sub` pattern, and permissions scoped only to that service's own AWS resources (its own S3 buckets, its own ECS service/Lambda function, etc.) — mirroring the single-repo pattern's role-per-purpose approach, just keyed by environment instead of by repository.

**Path-based or label-based triggering combined with environment scoping**: since all services share one repository, the workflow logic itself typically needs path filtering (`paths:` in the trigger, or a monorepo build tool detecting which service actually changed) to decide which service's deploy job should even run — this is a separate concern from the OIDC trust scoping, but works together with it: path filtering decides *whether* a deploy job runs at all for a given change, and environment-scoped OIDC trust decides *what that job is allowed to do* once it does run.

**GitHub Environment protection rules as an additional control**: environments support their own protection rules (required reviewers, restricted branches) independent of the OIDC trust policy — layering environment-level approval requirements on top of the OIDC scoping gives an additional control point specific to each service, without needing separate repositories.

## Trade-offs

This design requires more IAM roles and more GitHub Environments to manage (one pair per service, rather than one for the whole repo) — real operational overhead that grows with the number of services in the monorepo, but it's the necessary cost of genuine least-privilege isolation between services sharing one repository. An alternative some teams choose instead is splitting genuinely independent services into separate repositories specifically to get natural repo-level OIDC scoping back "for free," trading monorepo's code-sharing/atomic-commit benefits for simpler per-service credential isolation — a legitimate choice, but a different, larger architectural decision than just fixing OIDC scoping in place.

## Key Takeaways

- Repo-and-branch-scoped OIDC trust conditions alone can't distinguish between services sharing one monorepo, since they all share that same repo and branch.
- GitHub Environments provide the missing scoping unit — each service gets its own environment, reflected in the OIDC token's `sub` claim, letting the trust policy distinguish per-service deploy jobs.
- Each service should still get its own dedicated IAM role scoped only to its own resources, mirroring the single-repo least-privilege pattern.
- Path/monorepo-tool-based triggering (deciding whether a deploy runs) is a separate concern from OIDC trust scoping (deciding what a running deploy is allowed to do) — both are needed together.

## Interview Follow-Up Questions

- How would you structure the monorepo's CI configuration to avoid duplicating near-identical deploy job definitions across many services?
- What would you do if two services in the monorepo legitimately need to share some AWS resources — how does that change the role design?
- How would you audit, across a growing monorepo, that no service's role has accidentally been scoped too broadly?

## References

- [GitHub Docs: About security hardening with OpenID Connect — environments](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#example-subject-claims)
- [GitHub Docs: Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
