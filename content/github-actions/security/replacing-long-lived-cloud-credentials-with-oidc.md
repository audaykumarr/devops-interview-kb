---
id: github-actions-security-oidc-migration-001
title: "Design a migration from long-lived AWS access keys stored as GitHub Actions secrets to OIDC-based short-lived credentials, for an organization with 40 repositories deploying to production."
category: github-actions
subcategory: security
technologies:
  - github-actions
  - aws
  - oidc
  - security
difficulty: advanced
question_type:
  - scenario
  - security
  - architecture
tags:
  - oidc
  - github-actions
  - iam
  - credentials
  - ci-cd-security
estimated_time_minutes: 12
companies: []
related_questions:
  - aws-iam-least-privilege-migration-001
status: published
last_reviewed: 2026-08-19
last_updated: 2026-08-19
---

## Question

An organization has 40 repositories whose GitHub Actions workflows deploy to AWS using long-lived IAM user access keys stored as repository secrets. You're asked to design a migration to OIDC-based short-lived credentials. Walk through the architecture, rollout plan, and how you'd avoid a mass outage across 40 repos.

## Short Answer

Set up a single AWS IAM OIDC identity provider trusting GitHub's token issuer, create per-purpose IAM roles with trust policies scoped by repository and branch/environment claims, migrate repositories incrementally by adding the OIDC role alongside the existing keys, verifying each workflow before removing its keys, and only revoke the long-lived credentials organization-wide once every repository has cut over.

## Detailed Explanation

OIDC federation lets GitHub Actions exchange a workflow-run-scoped identity token for short-lived AWS credentials via `sts:AssumeRoleWithWebIdentity`, with no secret stored anywhere. AWS trusts GitHub's token issuer directly (via an IAM OIDC identity provider), and each IAM role's trust policy decides which GitHub identities — expressed as claims like repository, branch, environment, or actor — are allowed to assume it. The migration challenge isn't the AWS-side mechanism itself, which is a one-time setup per account; it's doing the rollout across 40 already-working production pipelines without an incident, and without trading "40 leaked keys" for "one overly-permissive role that's just as bad."

The design questions that matter are: how granular the roles should be (one shared role is simple but violates least privilege and creates a single blast radius; one role per repository/purpose is more setup but contains a compromise to what that workflow could already do); how tightly the trust policy's claim conditions are scoped (repository and branch at minimum, ideally tied to GitHub Environments with required reviewers for anything touching production); and how the rollout is sequenced so a misconfigured trust policy on repo #12 doesn't take down repos #1–11 that already migrated successfully.

## Requirements

- Eliminate long-lived AWS access keys from GitHub Actions secrets across all 40 repositories.
- No deployment downtime or broken pipelines during migration.
- Least privilege: each repository/workflow should be able to assume only the role(s) it actually needs, not a shared org-wide deployer role.
- Auditable: it should be possible to trace exactly which repository, branch, and workflow run performed a given AWS action.
- Rollback path if OIDC trust configuration is misconfigured for a given repo.

## Assumptions

- All 40 repositories are within the same GitHub organization.
- AWS accounts are already organized (e.g. per environment or per team) via AWS Organizations; the migration doesn't also need to redesign account structure.
- Workflows currently reference `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets and use `aws-actions/configure-aws-credentials` or the AWS CLI directly.

## Architecture

At the AWS side: one IAM OIDC identity provider per AWS account (or per trust boundary) registered against `https://token.actions.githubusercontent.com`, with the audience set to `sts.amazonaws.com`. Rather than one shared deploy role, define IAM roles per logical purpose (e.g. `gha-deploy-frontend`, `gha-deploy-data-pipeline`), each with a trust policy whose `Condition` restricts the `token.actions.githubusercontent.com:sub` claim to specific repositories and refs — e.g. only `repo:my-org/frontend:ref:refs/heads/main` can assume the production deploy role, while `repo:my-org/frontend:*` (any branch/PR) can assume a more limited read-only or staging role.

At the GitHub side: each repository's workflow uses `aws-actions/configure-aws-credentials` with `role-to-assume` pointing at its scoped role, and the workflow's `permissions:` block sets `id-token: write` so GitHub can mint the short-lived OIDC token for that run. No AWS secrets exist in the repository at all after migration — the trust relationship lives entirely in AWS IAM, keyed off GitHub's identity claims.

## Components

- One `iam:oidc-provider` per AWS account resource, trusting GitHub's OIDC issuer.
- Per-purpose IAM roles with least-privilege permission policies and repo/branch-scoped trust policies.
- A GitHub Actions reusable workflow (or composite action) wrapping `configure-aws-credentials`, so all 40 repos configure OIDC identically instead of each hand-rolling the trust setup.
- A tracking mechanism (a spreadsheet, project board, or a script that scans all repo workflows for `AWS_ACCESS_KEY_ID` usage) to track migration status per repository.
- A deprecation alert (e.g. CloudTrail-based) firing when any of the old IAM users' access keys are actually used, to see live who's still on the old path.

## Trade-offs

- Per-repository, per-purpose roles are more setup work upfront than one shared deploy role, but a shared role would violate least privilege and make the blast radius of any single compromised workflow the entire org's AWS footprint — worth the extra setup.
- Migrating incrementally (old keys + new OIDC role coexisting temporarily) is slower than a flag-day cutover but avoids an all-40-repos-broken-at-once outage if the OIDC trust policy has a mistake.
- A reusable workflow standardizes the setup and is easier to audit, but requires teams to adopt it rather than configuring credentials however they like — needs organizational buy-in, not just a technical change.

## Failure Scenarios

- A trust policy's `sub` condition is written too loosely (e.g. matching `repo:my-org/*` instead of a specific repo), letting any repository in the org assume a sensitive production role — mitigated by reviewing trust policies as carefully as permission policies, and preferring the `repo:org/name:environment:prod` claim form tied to GitHub Environments with required reviewers, not just branch name.
- The OIDC provider's thumbprint/audience is misconfigured, causing every workflow using it to fail `sts:AssumeRoleWithWebIdentity` at once — mitigated by testing the provider setup against one low-risk repository first, not all 40 simultaneously.
- A repository is migrated (keys removed) before its workflow's OIDC role assumption is verified working, causing a deployment failure — mitigated by the "add OIDC, verify, then remove keys" sequencing rather than swapping in one step.

## Security

Short-lived OIDC-issued credentials (typically valid for the duration of the job) eliminate the risk of a leaked long-lived key being usable indefinitely. Scoping trust policies to specific repositories, and ideally to GitHub Environments with required reviewers for production roles, means a compromised workflow in one low-risk repository can't assume a production deploy role for an unrelated repository. Combined with least-privilege permission policies per role, the blast radius of any single compromised Action or dependency is limited to what that specific role can do.

## Scalability

The architecture scales to any number of repositories without additional AWS-side objects per repo beyond a role, since the OIDC provider itself is created once per AWS account. The reusable workflow means onboarding a new repository is a config change (which role ARN to assume), not new AWS infrastructure. For a much larger org, roles could additionally be templated via Terraform from a data-driven list of repo-to-role mappings rather than defined by hand.

## Cost Considerations

OIDC federation and IAM roles carry no direct AWS cost. The main cost is engineering time for the migration itself; incremental migration (vs. a rewrite) minimizes risk-driven cost (incident response, rollback effort) at the expense of a longer overall timeline.

## Real-World Approach

1. Create the IAM OIDC provider in each relevant AWS account, trusting `token.actions.githubusercontent.com`.
2. Build one reusable GitHub Actions workflow that wraps OIDC credential configuration, so every repo adopts the same pattern.
3. Pilot with one low-risk, non-production repository: add the OIDC role trust policy, update its workflow to use OIDC alongside (not replacing) existing keys, verify successful `AssumeRoleWithWebIdentity` and successful deploy.
4. Remove that pilot repo's long-lived keys once confirmed, and treat it as the template for the rest.
5. Roll out repo-by-repo (or in small batches), tracking status, always verifying before removing old keys.
6. Once all 40 repositories are confirmed migrated, deactivate (not immediately delete) the old IAM users' access keys org-wide.
7. Monitor CloudTrail for any further use of the old keys; after a clean observation window, delete the IAM users entirely.

## Common Mistakes

- Writing an overly broad `sub` claim condition in the trust policy, effectively giving every repository in the org access to a sensitive role.
- Cutting all 40 repositories over simultaneously instead of piloting and verifying first.
- Forgetting to add `permissions: id-token: write` to the workflow, causing OIDC token minting to fail even with correct AWS-side configuration.
- Leaving the old IAM users' keys active indefinitely "just in case," which defeats the purpose of the migration.

## Interview Follow-Up Questions

- How would you scope the trust policy differently for a workflow that runs on pull requests versus one that only runs on `main`?
- How would this design change for a monorepo where multiple deploy targets live in one repository?
- How would you detect and alert on someone reintroducing a long-lived AWS key as a GitHub secret after the migration?

## Key Takeaways

- OIDC removes long-lived credentials from CI entirely — trust is established per-run via short-lived tokens, not stored secrets.
- Scope trust policies as tightly as permission policies; a loose `sub` condition undermines the whole migration.
- Migrate incrementally with verification at each step; never assume "identical setup" scales safely to a flag-day cutover across dozens of repos.
- A reusable workflow turns a security migration into a repeatable, auditable pattern instead of 40 one-off configurations.

## References

- [GitHub Docs: About security hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Docs: Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)
