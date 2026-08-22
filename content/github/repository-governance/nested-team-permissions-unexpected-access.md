---
id: github-repository-governance-nested-team-permissions-001
title: "A security review finds a contractor has write access to a sensitive repository, but nobody remembers explicitly granting it. How did this happen, and how do you audit for it going forward?"
category: github
subcategory: repository-governance
technologies:
  - github
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - github
  - teams
  - access-review
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A security review discovers a contractor has write access to a sensitive repository, but a check of the repository's direct collaborator list and explicit team access doesn't show them or their team listed anywhere obvious. How did this access actually happen, and how would you audit for this class of issue going forward?

## Short Answer

The most common cause is nested team membership: GitHub teams can be organized in a parent-child hierarchy, and repository access granted to a parent team automatically extends to every child team's members too — the contractor is very likely a member of some child team that's nested under a parent team with access to the repository, which isn't visible unless you specifically check the team hierarchy, not just the repository's direct access list.

## Detailed Explanation

GitHub's team nesting feature is genuinely useful for modeling organizational structure (a broad "Engineering" parent team containing more specific child teams like "Platform" and "Backend"), but it also means repository access granted at a parent team level silently cascades to every nested child team's members — a repository's own "who has access" view doesn't always make this cascading relationship obvious at a glance, especially in an organization with several layers of nesting.

## Symptoms

- A person has access to a repository, but they're not listed as a direct collaborator, and their obviously-relevant team isn't listed in the repository's direct team access either.
- The access seems to have "appeared" without anyone specifically recalling granting it to this person or their immediate team.
- The organization has a nested team structure (parent teams containing child teams) for at least some part of its team hierarchy.

## Possible Causes

- The contractor is a member of a child team nested under a parent team that has explicit access to the repository — access cascades down through the nesting hierarchy automatically, without a separate, explicit grant to the child team itself being necessary.
- The contractor was added to a broad team for an unrelated, legitimate reason (onboarding convenience, a broad "all contractors" team) that happens to be nested under or have access to more than was originally intended when that team's access was set up.
- Repository access was granted to a parent team at some point in the past for a reason that made sense then, and the organization's team nesting structure changed since (new child teams added) without anyone re-reviewing what access now cascades as a result.

## Investigation Steps

1. Check the organization's full team hierarchy (Settings → Teams, viewing parent/child relationships) rather than just the repository's own direct access list, to find every team (including nested ones) that resolves to having access.
2. Trace the contractor's team memberships and cross-reference against that full hierarchy to identify exactly which team (and at what nesting level) is granting them access.
3. Determine whether the parent team's access to this specific repository was ever intended to cascade to this specific child team, or whether this is genuinely unintended scope creep from team restructuring.
4. Check GitHub's audit log for the organization, which can show historical team membership and repository access changes, to understand when and how the current state came to be.

## Resolution

1. **Remove the unintended access** — either by removing the contractor from the specific team granting cascading access, restructuring the team nesting so the parent team's repository access doesn't cascade to that child team, or adjusting the parent team's own repository access to be more narrowly scoped.
2. **Verify the fix doesn't remove legitimate access other members of that team actually need**, since the fix needs to address this specific unintended case without breaking access other people in the same nested team structure genuinely require.
3. **Document the corrected, intended access model** for this repository and its related teams, so the reasoning is clear for the next person reviewing it, rather than leaving the corrected state just as unclear as the original misconfigured one.

## Prevention

- When auditing repository access, always check the full team hierarchy (including nested/child teams), not just the repository's own direct access listing, since that view alone doesn't reveal cascading access.
- Periodically review what actually cascades from parent team access, especially after any team restructuring (new child teams added, teams re-nested), since access review needs to happen not just when access is granted but whenever the org's team structure changes.
- Consider whether broad, deeply-nested parent teams should have direct repository access at all for sensitive repositories, versus more narrowly-scoped teams with explicit, individually-reviewed access — nesting is convenient for organizational modeling but can work against precise access control for the most sensitive repositories.

## Key Takeaways

- GitHub's nested team structure means repository access granted to a parent team automatically cascades to every child team's members, which isn't obvious from a repository's own direct access listing alone.
- Auditing repository access requires checking the full team hierarchy, not just directly-listed collaborators and teams, to find all the ways access could be resolving for a given person.
- Team restructuring (adding new child teams under an existing parent) can silently create new, unintended access without anyone explicitly granting it at the time.
- For the most sensitive repositories, consider whether broad, nested parent-team access is appropriate at all, versus more narrowly-scoped, individually-reviewed access.

## Interview Follow-Up Questions

- How would you build a recurring, automated audit process that specifically checks for unintended cascading access from team nesting?
- How would you balance the organizational convenience of team nesting against the access-control precision needed for your most sensitive repositories?
- How would you use GitHub's audit log to reconstruct exactly when and how this specific access situation developed over time?

## References

- [GitHub Docs: About teams](https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams)
- [GitHub Docs: Reviewing the audit log for your organization](https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization)
