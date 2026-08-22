---
id: azure-identity-networking-rbac-scope-inheritance-001
title: "A user was granted Contributor access to a single resource group, but they can see and modify resources across the entire subscription. How is that possible, and how do you audit for this?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - azure
  - rbac
  - access-control
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You're reviewing access and find a user who was granted the Contributor role on a single resource group. But when you check further, they're able to see and modify resources across the entire subscription, not just that one resource group. How is that possible, given the role assignment appears scoped to just one resource group?

## Short Answer

Azure RBAC role assignments are inherited downward through the resource hierarchy (management group → subscription → resource group → resource), but they can also exist at a *higher* level than you initially checked — if this user (or a group they belong to) also has a role assignment at the subscription or management group level, that assignment inherits down to every resource group underneath, including ones you might not have checked, giving them the broader access you're observing regardless of what the specific resource-group-level assignment says. The fix is auditing role assignments at every level of the hierarchy for this specific identity, not just the resource group where you first found an assignment.

## Detailed Explanation

The core thing to understand about Azure RBAC is that access is the union of every applicable role assignment across the entire resource hierarchy for a given identity — finding one assignment doesn't mean it's the only one, and a broader assignment higher in the hierarchy silently grants access that looks inconsistent with a narrower assignment found lower down, since both are simply additive.

## Symptoms

- A user's observed access (what they can actually see and do) is broader than what a specific role assignment you found would suggest.
- Multiple role assignments for the same identity may exist at different levels of the resource hierarchy (management group, subscription, resource group), each individually appearing reasonable in isolation.
- The user may also be a member of an Azure AD group that itself has a role assignment, which isn't visible when only checking direct, individual role assignments.

## Possible Causes

- The user (or a group they belong to) has an additional role assignment at the subscription or management group level, which inherits down to every resource group beneath it, including the one you found the narrower assignment on.
- Group-based role assignment: the broader access comes not from a direct assignment to the user at all, but from their membership in an Azure AD group that has a subscription- or management-group-level role assignment — checking only direct user assignments misses this entirely.
- A custom role definition with broader-than-expected permissions was assigned, and its actual permission set wasn't fully understood at assignment time.

## Investigation Steps

1. Check the user's *effective* access at the subscription level directly (Azure Portal's "Check access" feature, or `az role assignment list --assignee <user> --all`), which surfaces every applicable role assignment across the hierarchy, not just what's visible at any single scope.
2. Check the user's Azure AD group memberships and cross-reference each group against role assignments at every level of the hierarchy, since group-based assignments are a common source of access that isn't obvious from checking direct user assignments alone.
3. Trace the resource hierarchy upward from the resource group in question (subscription, and any management group it belongs to) and check role assignments at each level specifically.
4. Confirm exactly what the custom or built-in role actually grants, if a custom role is involved, since role names alone (especially for custom roles) don't always accurately reflect their actual permission scope.

## Resolution

1. **Identify every role assignment actually contributing to the user's effective access**, using the `az role assignment list --assignee <user> --all` command (or the portal's "Check access" feature) as the authoritative source, rather than manually checking assignments scope by scope and potentially missing one.
2. **Remove or narrow whichever assignment is broader than intended** — if the higher-level (subscription or management group) assignment was unintentional or is genuinely too broad for what this user should have, remove it or replace it with a more appropriately scoped one.
3. **If the broader access comes from group membership**, address it at the group level — either removing the user from the group if their membership itself was inappropriate, or narrowing the group's own role assignment if the group's access is broader than intended for its actual members.
4. **Verify the fix** by re-running the effective-access check for the user, confirming their actual observable access now matches what was intended, not just that the specific assignment you found earlier was corrected.

## Prevention

- When auditing access, always check effective access via the authoritative "all assignments across the hierarchy" view, not just role assignments visible at the specific scope you're currently looking at.
- Prefer group-based role assignments over direct-to-user assignments for maintainability, but ensure group membership itself is reviewed with the same rigor as direct assignments, since group membership is an equally real source of access.
- Periodically audit role assignments at the subscription and management group level specifically, since broad assignments at these higher levels have the largest blast radius and are the easiest to overlook when access reviews focus primarily on resource-group-level assignments.

## Key Takeaways

- Azure RBAC access is the union of every applicable role assignment across the entire resource hierarchy for an identity — a role assignment found at one level doesn't mean it's the only one affecting that identity's actual access.
- Assignments at the subscription or management group level inherit down to every resource group beneath them, which can produce access inconsistent with what a narrower, resource-group-level assignment alone would suggest.
- Group-based role assignments are a common, easy-to-miss source of broader access, since checking only direct user assignments doesn't reveal what a user's group memberships grant.
- Use the authoritative effective-access check (`az role assignment list --all`, or the portal's "Check access" feature) rather than manually piecing together assignments scope by scope during an audit.

## Interview Follow-Up Questions

- How would you design a regular access review process that reliably catches unintended broad access from higher-level or group-based assignments?
- What's the trade-off of using many narrowly-scoped custom roles versus Azure's built-in roles, in terms of both precision and audit complexity?
- How would you use Azure AD Privileged Identity Management (PIM) to reduce the standing risk of broad role assignments like the subscription-level one found here?

## References

- [Azure Docs: Azure RBAC — How Azure RBAC determines if a user has access to a resource](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview)
- [Azure CLI: az role assignment list](https://learn.microsoft.com/en-us/cli/azure/role/assignment#az-role-assignment-list)
