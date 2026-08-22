---
id: gitlab-merge-request-workflow-approval-rules-001
title: "How would you configure GitLab merge request approval rules so that changes to a payments module always require sign-off from the payments team specifically, not just any two approvers?"
category: gitlab
subcategory: merge-request-workflow
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - practical
tags:
  - gitlab
  - approval-rules
  - code-review
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your project currently requires "2 approvals" on every merge request, but any two people with approval rights can satisfy that — nothing ensures someone from the payments team specifically reviews a merge request touching the payments module. How would you configure GitLab's approval rules to require sign-off from the right specific people, not just any two approvers?

## Short Answer

Use GitLab's code owner approval combined with a merge request approval rule scoped to specific file paths — assigning the payments module's paths to a specific code owner group in `CODEOWNERS`, and configuring an approval rule (either "Code Owner approval" enforcement, or a separate custom approval rule with eligible approvers limited to the payments team) tied to that path pattern, means a merge request touching those files specifically requires approval from someone on that team, not just any two people with generic approval rights.

## Detailed Explanation

GitLab's default "N approvals required" setting is a simple count, blind to *who* provides those approvals — for a genuinely sensitive area of the codebase, the actual requirement is usually "someone with specific context/authority reviews this," which requires a more targeted mechanism than a generic approval count.

**`CODEOWNERS` combined with code owner approval enforcement scopes review requirements by path**: defining `/payments/ @my-org/payments-team` in the project's `CODEOWNERS` file, combined with enabling "Require approval from code owners" in the project's merge request settings, means any MR touching files under `/payments/` specifically requires approval from someone on the `payments-team` — a generic approver outside that team, even if they're one of the project's usual reviewers, doesn't satisfy this specific requirement.

**Custom approval rules provide more granular control beyond simple code-owner enforcement**: GitLab also supports defining explicit approval rules with a specific eligible-approvers list and a specific number of required approvals from that list, optionally scoped to specific file/path patterns — this is useful when the requirement is more nuanced than a straightforward code-owner mapping (e.g., "any 2 of these specific 5 senior engineers," rather than "anyone on this team").

**Approval rules can be layered — a base project-wide rule plus targeted, path-scoped rules for sensitive areas**: the general "2 approvals from anyone with approval rights" requirement can remain the baseline for most changes, while an additional, more specific rule (requiring payments-team approval for payments-module changes) applies on top, specifically for MRs touching that sensitive path — meaning most changes follow the simpler general policy, and only the genuinely sensitive area gets the additional, targeted requirement.

**This should be enforced as a required, non-bypassable rule for it to actually matter**: GitLab's approval settings include an option to prevent approval rule overrides, and combined with the project's merge request settings disallowing merging without required approvals being satisfied, this makes the targeted approval requirement a genuine gate rather than an easily-skippable suggestion — without this enforcement setting, someone could still merge without satisfying the rule if given sufficient project permissions.

**Group-level approval settings can enforce this consistently across many projects**: for an organization with the same sensitive-module review requirement across multiple repositories (e.g., every project touching a shared payments library), GitLab's group-level approval settings let you define and enforce this policy centrally, rather than needing to replicate the same `CODEOWNERS`/approval rule configuration manually in every individual project.

## Key Takeaways

- GitLab's default "N approvals required" is a blind count — it doesn't ensure approval from any specific person or team, which is insufficient for genuinely sensitive code areas.
- `CODEOWNERS` combined with "Require approval from code owners" scopes an approval requirement to specific file paths, requiring sign-off from the designated team for changes touching those paths.
- Custom approval rules provide more granular control (a specific eligible-approver list, not just a code-owner mapping) for requirements more nuanced than a simple path-to-team assignment.
- Enforce the rule as non-bypassable via project/group merge request settings, since an approval rule that can be overridden isn't a genuine gate.

## Interview Follow-Up Questions

- How would you handle a merge request that touches both the payments module and unrelated code, in terms of which approval rules apply?
- How would you audit whether approval rules are actually being enforced correctly across all projects in a large organization?
- What's the trade-off of requiring code owner approval broadly across many file paths versus reserving it for only the most sensitive, narrow set of paths?

## References

- [GitLab Docs: Merge request approval rules](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/rules.html)
- [GitLab Docs: Code Owners](https://docs.gitlab.com/ee/user/project/codeowners/)
