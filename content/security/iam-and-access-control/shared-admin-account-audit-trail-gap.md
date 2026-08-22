---
id: security-iam-and-access-control-shared-admin-account-001
title: "A critical production system is accessed via one shared 'admin' account used by six engineers, with no individual audit trail. How do you fix this?"
category: security
subcategory: iam-and-access-control
technologies:
  - security
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - iam
  - shared-credentials
  - audit-trail
  - access-control
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You discover a critical production system is accessed via one shared "admin" account and password, used by six different engineers. There's no way to tell who actually did what — every action in the audit log just says "admin." How do you fix this without disrupting anyone's ability to do their job?

## Short Answer

Move to individual, attributable accounts (or individual role assumption, for systems that support it) for each of the six engineers, backed by real per-person authentication — then either retire the shared account entirely or, if the system genuinely can't support individual accounts, wrap it with a mechanism that logs who checked out the shared credential and when, so at minimum you get attribution even if you can't eliminate the shared credential itself.

## Detailed Explanation

A shared admin account is a systemic audit and accountability gap: it's not just that "admin" isn't a person — it's that when something goes wrong (an accidental change, a security incident, a compliance question), there's genuinely no way to know which of six people did it, which means you can't investigate, can't hold anyone accountable, and can't even confirm whether the action was one of your six known engineers or someone else entirely who got hold of the shared password.

## Symptoms

- Audit logs for a critical system show all activity attributed to a single generic account (e.g., "admin") regardless of who actually performed the action.
- Multiple engineers know and use the same login credential.
- Investigating any specific incident or change on this system is impossible to attribute to an individual.

## Possible Causes

- The system was set up before individual accounts were provisioned, and the shared account was never replaced afterward.
- The system genuinely doesn't support multiple individual accounts (a real constraint for some legacy systems), and a shared account was the only way to give the team access at all.
- Individual account provisioning was seen as more overhead than it was worth for a system only a small team touches, and the shared account persisted out of inertia.

## Investigation Steps

1. Confirm whether the system actually supports individual accounts or role-based access — this determines whether the fix is a straightforward migration or requires a workaround.
2. Identify every current user of the shared credential (not just the six known engineers — check whether the password has been shared more widely than assumed).
3. Check whether any compliance or audit requirement (SOC 2, ISO 27001, industry-specific regulation) explicitly requires individual attribution for this system, which affects urgency.
4. Assess what would actually break if the shared account were disabled today, to plan a safe cutover rather than an abrupt one.

## Resolution

1. **Provision individual accounts or role assumptions for each of the six engineers**, with access scoped to what each person actually needs rather than uniformly mirroring the shared account's full admin rights — this is also a natural moment to right-size access, not just attribute it.
2. **Run both in parallel briefly, then disable the shared account** — giving engineers time to confirm their individual access works correctly before removing the fallback, rather than a hard cutover that risks locking people out mid-task.
3. **If the system genuinely can't support individual accounts**, implement a credential-checkout process (a password vault that logs who checked out the shared credential and when) as a fallback — imperfect attribution is still much better than none.
4. **Rotate the shared password** as part of this process regardless of the outcome, since a credential that's been known to six people for an unknown period should be treated as having a wide, uncertain exposure.

## Prevention

- Make individual account provisioning part of the standard system setup checklist, so new systems don't start down the shared-credential path in the first place.
- Periodically audit for shared/generic account usage across your environment, since this pattern tends to recur wherever provisioning individual access felt like unnecessary overhead at the time.
- When evaluating new tools or systems, treat lack of support for individual accounts and audit trails as a real requirement, not a nice-to-have, during procurement.

## Key Takeaways

- A shared admin account isn't just a convenience shortcut — it's a systemic gap in accountability and incident investigation capability.
- Migrate to individual accounts run in parallel with the shared one briefly, then disable the shared account, rather than an abrupt cutover.
- If individual accounts genuinely aren't supported, a credential-checkout process with logging is a meaningful fallback, even if imperfect.
- Rotate the shared credential regardless, since its exposure to multiple people over time is inherently harder to reason about than an individual credential's.

## Interview Follow-Up Questions

- How would you handle discovering that the shared password had also been shared with a former employee who no longer works at the company?
- How would you prioritize fixing this system against other work, given it's not actively causing an incident right now?
- What would you check to make sure this same shared-credential pattern doesn't exist on other systems you haven't looked at yet?

## References

- [NIST SP 800-53: Identification and Authentication](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [CIS Controls: Account and Credential Management](https://www.cisecurity.org/controls)
