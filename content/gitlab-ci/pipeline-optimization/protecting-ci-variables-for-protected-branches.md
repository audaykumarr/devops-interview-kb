---
id: gitlab-ci-pipeline-optimization-protected-variables-001
title: "How do you make sure a production deployment token stored as a CI/CD variable can only ever be used by pipelines running against your main branch, not a random feature branch?"
category: gitlab-ci
subcategory: pipeline-optimization
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - security
  - configuration
tags:
  - gitlab-ci
  - security
  - variables
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You've stored a production deployment token as a GitLab CI/CD variable. By default, is that token accessible to a pipeline running against any branch — including a random feature branch anyone could push to? How do you make sure it's only ever available to pipelines running against your protected `main` branch?

## Short Answer

Mark the variable as "Protected" in its CI/CD variable settings — a protected variable is only made available to pipelines running against protected branches or protected tags, meaning a pipeline triggered from an unprotected feature branch simply won't have access to it at all, regardless of what the pipeline's job configuration tries to reference.

## Detailed Explanation

By default, a CI/CD variable defined at the project level is available to every pipeline, regardless of which branch triggered it — which means, without the "Protected" flag, a production deployment token would be exposed to a pipeline running against any feature branch, including one an attacker (or just a careless contributor) could push arbitrary code to and potentially exfiltrate the variable's value from within a job.

**The "Protected" flag scopes variable availability to protected refs only**: enabling this on a variable means GitLab only injects it into pipelines running against branches or tags that are themselves marked "Protected" in the project's repository settings — a pipeline triggered from any other branch simply doesn't have that variable in its environment at all, so even a malicious or careless job script on a feature branch can't access it.

**This depends on your branch protection actually being configured correctly**: the "Protected" variable flag is only meaningful if your `main` branch (and any other branch that should have deploy access) is actually marked as a protected branch in repository settings — if branch protection itself is misconfigured (e.g., every branch is accidentally protected, or `main` isn't protected), the variable-level protection doesn't provide the isolation you'd expect.

**Masking is a separate, complementary setting**: marking a variable as "Masked" prevents its value from appearing in job logs (replacing it with `[MASKED]` if a script accidentally echoes it), which is a different protection than "Protected" — masking prevents accidental log exposure; protection prevents unauthorized branches from accessing the variable at all. Sensitive variables like a production deployment token should typically be both protected and masked.

**Environment-scoped variables add a further layer**: GitLab also supports scoping variables to specific environments (e.g., a variable only available to jobs deploying to the `production` environment), which combines well with protected-branch scoping for defense in depth — a production token should ideally require both the correct protected branch and the correct environment scope to be accessible.

## Key Takeaways

- Mark sensitive CI/CD variables as "Protected" so they're only available to pipelines running against protected branches/tags, not every branch by default.
- This only works correctly if your actual branch protection settings are configured properly — protected variables depend on protected branches being genuinely restrictive.
- "Masked" is a separate setting preventing the value from appearing in job logs — sensitive variables should typically be both protected and masked.
- Environment-scoped variables add a further, complementary layer of restriction on top of branch protection.

## Interview Follow-Up Questions

- How would you audit your existing GitLab project for CI/CD variables that should be protected but currently aren't?
- What would you do if a team legitimately needed to test a production-adjacent deployment process from a non-protected branch?
- How does this compare to using an external secrets manager (like Vault) instead of GitLab's own CI/CD variables for the most sensitive credentials?

## References

- [GitLab Docs: Protect a CI/CD variable](https://docs.gitlab.com/ee/ci/variables/index.html#protect-a-cicd-variable)
- [GitLab Docs: Mask a CI/CD variable](https://docs.gitlab.com/ee/ci/variables/index.html#mask-a-cicd-variable)
