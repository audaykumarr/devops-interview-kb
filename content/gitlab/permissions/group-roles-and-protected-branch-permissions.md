---
id: gitlab-permissions-group-roles-protected-branches-001
title: "What's the actual difference between GitLab's Developer, Maintainer, and Owner roles in terms of what each one can do to a protected branch and CI/CD variables?"
category: gitlab
subcategory: permissions
technologies:
  - gitlab
difficulty: beginner
question_type:
  - conceptual
tags:
  - gitlab
  - permissions
  - protected-branches
  - access-control
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

GitLab has a role hierarchy — Guest, Reporter, Developer, Maintainer, Owner. What's the actual difference between Developer, Maintainer, and Owner in terms of what each can do to a protected branch and to CI/CD variables, and why does that distinction matter when setting up a project?

## Short Answer

By default, Developers can push to unprotected branches and open merge requests but cannot push directly to or merge into a protected branch (typically `main`) unless a protected-branch rule explicitly grants them that; Maintainers can push to and merge protected branches, manage most project settings, and manage CI/CD variables; Owner sits above that, controlling group/project membership itself and irreversible actions like deleting the project. The distinction matters because protected branches and protected/masked CI/CD variables are exactly the mechanism GitLab gives you to make sure "can open a merge request" doesn't imply "can push secrets-bearing pipeline config" or "can merge without review."

## Detailed Explanation

GitLab's role model is additive and hierarchical — each higher role includes the capabilities of the ones below it, plus more:

- **Guest**: can view/comment, essentially no write access (varies by GitLab tier).
- **Reporter**: read access to code, issues, pipelines; no push access.
- **Developer**: can push to non-protected branches, create merge requests, trigger pipelines. Crucially, Developer-level push/merge access to a *protected* branch is not automatic — it depends entirely on what the protected branch rule for that branch actually allows.
- **Maintainer**: everything Developer can do, plus (per protected branch rule config) typically push/merge to protected branches, manage project-level settings including CI/CD variables, runners, and webhooks, and manage protected branch/tag rules themselves.
- **Owner**: everything Maintainer can do, plus managing group/project membership and role assignments, and destructive actions like deleting or transferring the project.

The protected branch feature is where this actually bites in practice: a protected branch rule specifies, independently, who can *merge* into it and who can *push* to it directly — commonly configured as "Maintainers can push and merge, Developers can merge (via MR) but not push directly," which forces even trusted contributors through the merge request/review flow for anything landing on `main`, while still letting them do normal feature-branch work freely.

CI/CD variables have a parallel protection concept: a variable can be marked "Protected," meaning it's only exposed to pipelines running on protected branches or tags — so a secret needed only in production deploys isn't accidentally exposed to a pipeline running on an arbitrary feature branch, regardless of who triggered it. This is a separate axis from role-based access, but the two work together: Developers can trigger pipelines but can't see or edit protected variables' values, and even Maintainers editing pipeline config on a non-protected branch won't have protected variables injected into that run.

## Key Takeaways

- Role hierarchy is additive: Developer < Maintainer < Owner, each including the capabilities below it.
- Push/merge access to a protected branch is governed by the protected branch rule, not automatically implied by role — Developer access to protected branches has to be explicitly granted.
- CI/CD "Protected" variables are a separate mechanism from roles, restricting a variable's exposure to pipelines running on protected refs regardless of who triggered them.
- Getting this configuration right is what lets you give broad Developer access for day-to-day work while still gating what lands on `main` and what secrets are exposed where.

## Interview Follow-Up Questions

- How would you structure protected branch rules differently for a fast-moving startup versus a regulated environment requiring strict change control?
- What's the difference between a "Protected" and a "Masked" CI/CD variable, and why would you want both on the same variable?
- How do GitLab's group-level and project-level roles interact when a user has different roles at each level?

## References

- [GitLab Docs: Roles and permissions](https://docs.gitlab.com/ee/user/permissions.html)
- [GitLab Docs: Protected branches](https://docs.gitlab.com/ee/user/project/protected_branches.html)
- [GitLab Docs: Protected CI/CD variables](https://docs.gitlab.com/ee/ci/variables/#protect-a-cicd-variable)
