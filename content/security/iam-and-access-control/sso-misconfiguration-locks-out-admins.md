---
id: security-iam-and-access-control-sso-lockout-001
title: "After a change to your SSO/identity provider configuration, nobody — including admins — can log into any connected system. How do you get back in, and how do you diagnose the actual cause?"
category: security
subcategory: iam-and-access-control
technologies:
  - security
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - sso
  - identity-provider
  - incident-response
  - access-control
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Right after a change to your SSO/identity provider configuration, nobody can log into any connected system — including the admins who'd normally fix this exact kind of problem. How do you get back in, and how do you diagnose what actually broke?

## Short Answer

Get back in through a pre-provisioned emergency access path that doesn't depend on the broken SSO integration — every SSO-dependent system should have a break-glass local admin account or equivalent for exactly this scenario, kept separate from and unaffected by IdP configuration. Once back in, diagnose by reverting the SSO change first (fastest path to restoring access for everyone else) and root-causing after, rather than trying to debug the SSO config live while every user is locked out.

## Detailed Explanation

The reason this scenario is uniquely dangerous is that your normal recovery path — an admin logging in to fix the problem — is itself broken, since admins authenticate through the same SSO integration that just failed. Any real fix depends on having an access path that was deliberately designed to be independent of SSO ahead of time, not improvised during the incident.

## Symptoms

- Users across multiple systems suddenly cannot authenticate, all starting around the same time as an SSO or identity provider configuration change.
- Admin accounts that would normally troubleshoot the issue are also locked out, since they authenticate through the same broken SSO path as everyone else.
- Error messages typically point to authentication or token validation failures, not to the downstream applications themselves.

## Possible Causes

- A change to the IdP's SAML/OIDC configuration (certificate rotation, endpoint URL, claim mapping) broke the trust relationship with one or more connected applications.
- A newly deployed conditional access or MFA policy is unintentionally blocking all sign-ins, not just the intended subset.
- A certificate used for signing SSO assertions expired or was rotated without updating it on the relying-party (application) side.
- A change was tested against one connected application but not the others, and a shared configuration change broke integrations that weren't part of the test.

## Investigation Steps

1. Confirm scope: is this affecting all connected applications, or a specific subset — this narrows whether the root cause is IdP-wide (certificate, global policy) or specific to one integration's configuration.
2. Check the timeline of recent changes to the IdP configuration against when the lockout started, to identify the most likely triggering change.
3. Check certificate validity and expiration on both the IdP and relying-party sides, since certificate mismatches are one of the most common causes of a sudden, total SSO failure.
4. Review any recently deployed conditional access, MFA, or sign-in policy changes for unintended scope (a policy meant for one group accidentally applied organization-wide).

## Resolution

1. **Use pre-provisioned break-glass access to get in immediately** — a local admin account on the IdP itself (or on critical downstream systems) that doesn't depend on SSO, used only for exactly this scenario.
2. **Revert the triggering change first, root-cause after** — once you can identify the likely change (certificate, config, policy), the fastest path to restoring access for everyone is rolling it back, rather than trying to forward-fix a config you don't yet fully understand while the whole organization is locked out.
3. **Verify access is actually restored** across the affected applications, not just the IdP itself, since a revert might fix the IdP side but leave a relying-party's cached configuration stale.
4. **Root-cause and re-apply the original change correctly**, once access is restored and there's no time pressure — including testing the fix against every connected application, not just the one where the change was intended.

## Prevention

- Maintain a documented, tested break-glass local admin account on the IdP and on critical downstream systems, verified periodically (an untested break-glass account is a false sense of security if it turns out to be broken too).
- Set calendar-based alerts well ahead of any SSO-related certificate expiration, so rotation happens on a planned schedule rather than as an emergency.
- Test SSO configuration changes against every connected application in a staging environment before applying to production, since a shared IdP config change can silently break integrations that weren't part of the intended test.
- Stagger risky IdP changes (rolling out to one application or a small user group first) rather than applying organization-wide all at once.

## Key Takeaways

- Every SSO-dependent system needs a pre-provisioned emergency access path that doesn't depend on the SSO integration itself — this is the actual fix for the "even admins are locked out" failure mode.
- When the whole organization is locked out, reverting the likely triggering change is almost always faster than debugging forward under pressure.
- Certificate mismatches and overly broad conditional-access policy changes are the most common causes of a sudden, total SSO outage.
- Test SSO configuration changes against every connected application, not just the one the change was intended for.

## Interview Follow-Up Questions

- How would you verify your break-glass access path actually still works, without waiting for a real incident to find out it doesn't?
- How would you design SSO configuration changes to be safely staged/rolled out, rather than applied all at once?
- What would you do differently if this happened during a compliance audit period, where even the break-glass account's use needs extra scrutiny?

## References

- [Microsoft: Manage emergency access accounts in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)
- [Okta: SAML troubleshooting](https://help.okta.com/en-us/content/topics/apps/apps_app_integration_wizard_saml.htm)
