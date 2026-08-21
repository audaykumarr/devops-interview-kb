---
id: gitlab-permissions-group-vs-project-role-interaction-001
title: "How do GitLab's group-level and project-level roles interact when a user has different roles assigned at each level?"
category: gitlab
subcategory: permissions
technologies:
  - gitlab
difficulty: intermediate
question_type:
  - conceptual
tags:
  - gitlab
  - permissions
  - groups
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A user can have a role assigned at the group level (inherited by every project in that group) and potentially a different, explicit role assigned directly at the project level. How do these two actually interact when they differ?

## Short Answer

GitLab resolves this by taking the **highest** of the two roles — a project-level role can grant a user *more* access than their group-level role alone would provide, but it can't be used to grant them *less* than the group role already provides; the group role acts as a floor, not a ceiling, for any project within that group.

## Detailed Explanation

Group membership in GitLab is inherited downward: adding a user as a Developer at the group level automatically gives them Developer access to every project within that group (and its subgroups), without needing to add them individually to each project. This inheritance is the baseline — the floor — for that user's access to any project in the group.

A project-level role, assigned directly and explicitly to a specific project (independent of group membership), can only ever *increase* that floor for that specific project, never decrease it. If a user is a Developer at the group level and is additionally given Maintainer access directly on one specific project within that group, they effectively have Maintainer access to that project (the higher of the two) while remaining a Developer everywhere else in the group. What GitLab does not support is the reverse — there's no mechanism to explicitly *reduce* a user's access on one project below what their group membership already grants them; if someone is a Maintainer at the group level, they're a Maintainer on every project in that group, full stop, regardless of any project-level setting, since the inherited group role can't be locally overridden downward.

This has a practical consequence worth being deliberate about: broad group-level role assignments (making someone a Maintainer at the group level "for convenience") propagate that access to every current *and future* project created within the group — a much bigger grant than it might appear at assignment time, since it's not scoped to what exists today. The more precise, least-privilege approach for access that's genuinely only needed on specific projects is assigning at the project level directly rather than reaching for a broad group-level grant, reserving group-level roles for access that's genuinely meant to apply uniformly across the whole group's current and future projects.

## Key Takeaways

- GitLab resolves group-level and project-level role differences by taking the highest of the two — group role is a floor, not a ceiling.
- A project-level role can grant more access than the group role alone provides, for that one specific project.
- There's no mechanism to reduce a user's access on one project below what their group-level membership already grants them.
- Broad group-level role assignments propagate to every current and future project in the group — worth being deliberate about, versus scoping access at the project level when it's genuinely project-specific.

## Interview Follow-Up Questions

- How would you audit a large GitLab instance to find users with broader effective access than intended, given this inheritance model?
- What's the risk of a subgroup structure where permissions cascade through multiple nested levels?
- How does this inheritance model compare to how GitHub organizes teams and repository permissions?

## References

- [GitLab Docs: Roles and permissions](https://docs.gitlab.com/ee/user/permissions.html)
- [GitLab Docs: Group membership](https://docs.gitlab.com/ee/user/group/#add-users-to-a-group)
