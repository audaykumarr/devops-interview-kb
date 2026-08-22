---
id: github-actions-workflow-design-environment-protection-001
title: "How would you design a GitHub Actions deployment workflow so that deploying to production requires a manual approval, while deploying to staging doesn't?"
category: github-actions
subcategory: workflow-design
technologies:
  - github-actions
difficulty: intermediate
question_type:
  - architecture
tags:
  - github-actions
  - deployment
  - environments
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You want staging deployments to happen automatically on every merge to main, but production deployments to require an explicit manual approval from a designated reviewer. How would you design this in GitHub Actions?

## Short Answer

Use GitHub Actions' Environments feature: define a `staging` environment with no protection rules and a `production` environment with a required-reviewers protection rule, then reference the appropriate environment (`environment: staging` or `environment: production`) on each deployment job — GitHub automatically pauses any job targeting a protected environment until a designated reviewer approves it, without needing custom approval logic in your workflow itself.

## Detailed Explanation

GitHub Environments are the built-in mechanism specifically designed for this pattern, and using them instead of a custom approval workaround (like a manual workflow_dispatch gate) gives you a real, auditable approval record tied directly to the deployment, integrated into GitHub's own permission model.

## Requirements

- Staging deployments should proceed automatically without manual intervention.
- Production deployments must pause and require explicit approval from a designated reviewer before proceeding.
- The approval must be auditable — who approved, when, for which specific deployment.

## Architecture

**Define separate GitHub Environments for staging and production**: in the repository's settings, `staging` is configured with no protection rules (or minimal ones), while `production` has a "required reviewers" protection rule naming the specific people or team authorized to approve production deployments.

**Reference the environment at the job level in your workflow**: each deployment job specifies `environment: staging` or `environment: production` — this single line is what connects the job to the environment's protection rules; GitHub Actions automatically enforces them without any custom logic needed in the workflow's own YAML.

**A production deployment job automatically pauses at the protection gate**: when a workflow run reaches a job targeting the `production` environment, GitHub Actions holds that job (visible as "waiting" in the run) until one of the designated reviewers approves it directly in the GitHub UI — the workflow doesn't need to poll or implement any waiting logic itself.

**Combine with environment-scoped secrets for additional safety**: secrets can be scoped to a specific environment (a `production` secret only accessible to jobs targeting that environment), meaning even if a workflow file has a bug that accidentally tries to deploy to production from an unexpected trigger, it still can't access production credentials without also passing through the environment's protection gate.

## Trade-offs

This relies on GitHub's own environment protection feature being correctly configured (the required-reviewers list must be kept accurate and current) — a misconfigured or overly broad reviewer list undermines the control just as much as not having one. It also means the approval step is tied to GitHub's own UI/permission model, which is usually the right level of integration for this use case, but is worth knowing if your organization has a separate change-approval system that also needs to be satisfied.

## Key Takeaways

- GitHub Environments with required-reviewer protection rules are the built-in, purpose-built mechanism for this pattern — prefer them over custom approval workarounds.
- Referencing `environment: production` on a job is what connects it to the protection rule; GitHub enforces the pause and approval automatically.
- Environment-scoped secrets add a second layer of safety, since production credentials aren't accessible to a job unless it's actually targeting the protected environment.
- Keep the required-reviewers list accurate and current — the control is only as good as who's actually authorized to approve.

## Interview Follow-Up Questions

- How would you handle an urgent production hotfix that needs to bypass the normal approval flow, without undermining the control entirely?
- How would you audit historical production deployment approvals for a compliance review?
- How would you extend this pattern to a multi-stage deployment (staging, then a canary environment, then full production) with different approval requirements at each stage?

## References

- [GitHub Docs: Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
