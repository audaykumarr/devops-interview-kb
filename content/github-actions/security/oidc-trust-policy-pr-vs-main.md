---
id: github-actions-security-oidc-trust-policy-pr-vs-main-001
title: "How would you scope an OIDC trust policy differently for a GitHub Actions workflow that runs on pull requests versus one that only runs on main?"
category: github-actions
subcategory: security
technologies:
  - github-actions
  - aws
difficulty: advanced
question_type:
  - security
  - configuration
tags:
  - github-actions
  - oidc
  - security
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An IAM role's OIDC trust policy for GitHub Actions can be scoped by the `sub` (subject) claim GitHub's OIDC token carries. How should that scoping differ for a workflow that runs on pull requests versus one that only runs on `main`, given the very different trust implications of each?

## Short Answer

A `main`-only deploy workflow should scope the trust policy's `sub` condition tightly to `repo:<org>/<repo>:ref:refs/heads/main`, granting deploy-capable permissions only to that exact branch's workflow runs. A pull-request-triggered workflow (running against a PR's, potentially external, code) should never get deploy-capable permissions at all — if it needs any AWS access, it should be scoped to a separate, much more restricted role (read-only, or nothing beyond what's needed to run tests) using the `pull_request` event's own `sub` pattern, since PR-triggered workflows can run code from a fork that hasn't been reviewed.

## Detailed Explanation

GitHub's OIDC token includes a `sub` (subject) claim that encodes exactly what triggered the workflow — the repository, and details like the branch or the event type — and an IAM role's trust policy can (and should) condition on this claim to scope exactly which workflow contexts can assume the role. The scoping needs to differ significantly between these two trigger types precisely because they carry very different trust levels.

**`main`-only workflows** (a deploy job triggered by `push: branches: [main]`) should use a trust policy condition like `token.actions.githubusercontent.com:sub: repo:<org>/<repo>:ref:refs/heads/main` — this ensures only a workflow run actually executing against the `main` branch's code can assume the role. Since merging to `main` already implies code review happened, this is an appropriate point to grant deploy-capable permissions.

**Pull-request-triggered workflows** are a fundamentally different trust situation: `pull_request` events run against the PR's proposed code — for a PR from a fork (an external, potentially untrusted contributor on a public repo, or simply unreviewed code even on a private repo), the workflow is executing code that hasn't been through review yet. Granting deploy-capable AWS permissions to a `pull_request`-triggered workflow means any PR — including a malicious one from an external contributor — could potentially assume a powerful role before any human ever reviewed the change. The `sub` claim for a `pull_request` event follows a different pattern (`repo:<org>/<repo>:pull_request`) that doesn't even distinguish which specific PR or fork triggered it — a further reason not to grant meaningful permissions at this trust level.

The practical pattern: PR-triggered workflows that genuinely need some AWS access (running integration tests against a real AWS sandbox account, for instance) should assume a separate, narrowly-scoped role — read-only, or scoped to a fully isolated sandbox account with nothing sensitive reachable — never the same role a `main`-branch deploy uses. GitHub also specifically warns that `pull_request_target` (a variant that runs with the base repository's permissions and secrets even for fork PRs) requires extra caution for exactly this reason, and should generally be avoided for workflows that check out and execute the PR's own code.

## Key Takeaways

- Scope a `main`-only deploy role's trust policy tightly to that branch's `sub` claim pattern (`ref:refs/heads/main`), since merging implies review already happened.
- Never grant deploy-capable permissions to a `pull_request`-triggered workflow — it may be running unreviewed, potentially malicious code, including from a fork.
- If a PR-triggered workflow genuinely needs AWS access, use a separate, narrowly-scoped role (read-only, isolated sandbox account), never the same role `main` deploys use.
- `pull_request_target` carries extra risk specifically because it runs with the base repo's secrets/permissions even for fork-originated PRs — avoid it for workflows executing the PR's own code.

## Interview Follow-Up Questions

- How would you structure trust policy conditions for a workflow that deploys from multiple long-lived branches (e.g. a staging branch and main)?
- What's the risk of a trust policy condition that only checks the repository name without also constraining the ref or event type?
- How would you audit existing IAM roles' trust policies to find ones that are more broadly scoped than they should be?

## References

- [GitHub Docs: About security hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Docs: Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [GitHub Docs: Keeping your GitHub Actions and workflows secure — pull_request_target](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
