---
id: security-iam-and-access-control-service-account-sprawl-001
title: "A security audit finds 340 service accounts, and nobody can say for certain which ones are still in use. How do you find and safely remove the dead ones without breaking production?"
category: security
subcategory: iam-and-access-control
technologies:
  - security
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - iam
  - service-accounts
  - access-review
  - least-privilege
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A security audit turns up 340 service accounts across your organization's cloud environment, many with broad permissions, and nobody can say with confidence which ones are actually still in use versus abandoned leftovers from decommissioned services. How do you find and safely remove the dead ones without taking down something that's quietly still depending on one?

## Short Answer

Don't delete anything based on guesswork — use actual last-used activity data (most cloud IAM systems expose this, e.g. AWS IAM Access Analyzer's "last accessed" info or Access Advisor) to separate genuinely dormant accounts from active ones, then move suspected-dead accounts through a staged process — deny new access first while keeping the account itself intact, watch for breakage over a real usage window, and only delete once you've confirmed nothing depends on it.

## Detailed Explanation

The risk in this situation isn't the audit finding sprawl — it's responding to sprawl by deleting based on assumption or missing documentation, which is exactly how "cleanup" turns into an unplanned outage. The fix is replacing guesswork with actual usage data, and replacing irreversible action with a reversible staged process, so uncertainty about any individual account doesn't force a choice between leaving risk in place and risking breakage.

## Symptoms

- A security or compliance audit flags a large, unexplained number of service accounts with no clear owner.
- Many accounts have broad or unused permissions that nobody can currently justify.
- No existing documentation or tagging reliably maps accounts to the services that created them.

## Possible Causes

- Service accounts were created ad hoc during past projects and never cleaned up after the project or service was decommissioned.
- Permissions were granted broadly "to be safe" rather than scoped to actual need, and never revisited.
- Ownership wasn't tracked at creation time (no tags, no linked team), so nobody today can say who to even ask.

## Investigation Steps

1. Pull last-accessed / last-used activity data for every service account from the cloud provider's native tooling, rather than relying on anyone's memory or documentation.
2. Cross-reference accounts with zero recent activity against your infrastructure-as-code and deployment manifests, since an account absent from current IaC is a strong (though not certain) signal it's no longer provisioned intentionally.
3. For accounts with genuinely no activity in a meaningful window (90+ days is a reasonable starting bar, tuned to your environment's actual usage patterns), treat them as candidates for removal rather than immediately assuming they're safe to delete — some accounts are legitimately low-frequency (annual batch jobs, disaster-recovery procedures) and would show as "unused" on a shorter window.
4. For accounts still showing activity, identify what's actually using them before deciding anything, since "still active" doesn't mean "correctly scoped" — some may need permission tightening rather than removal.

## Resolution

1. **Stage removal rather than deleting outright** — first revoke or deny new authentication for a suspected-dead account while leaving the account object itself intact, so if something unexpectedly breaks, you can quickly re-enable rather than having to fully recreate a deleted identity and its trust relationships.
2. **Watch a real usage window** (long enough to cover your slowest legitimate use case — weekly or monthly batch jobs, not just daily traffic) before proceeding to actual deletion, since the whole point of staging is catching the low-frequency legitimate users the "last accessed" data might have missed.
3. **Delete confirmed-dead accounts and document the decision** (when it was disabled, when it was deleted, what evidence supported the call) so a future audit doesn't have to redo this investigation from scratch.
4. **Fix the root cause going forward** — require service-account creation to include an owner tag and a review date at creation time, so the next audit doesn't face the same ownerless-sprawl problem.

## Prevention

- Require every new service account to be tagged with an owning team and a creation ticket/reason at provisioning time, enforced by policy rather than convention.
- Set up automated periodic reporting on unused service accounts (many cloud providers support this natively) so sprawl is caught continuously instead of discovered all at once in an audit.
- Default new service accounts to narrowly scoped permissions rather than broad ones "to be safe," so even an account that does go unnoticed for a while carries less risk.

## Key Takeaways

- Use actual last-accessed activity data to separate dormant from active accounts — never delete based on assumption or missing documentation alone.
- Stage removal (deny new auth, watch a real usage window, then delete) rather than deleting outright, since low-frequency legitimate use is easy to misread as abandonment.
- Fix the root cause (mandatory ownership tagging at creation) so the next audit isn't starting from the same blind spot.
- Sprawl cleanup is also a good moment to tighten scope on accounts that are active but over-permissioned, not just remove the fully dead ones.

## Interview Follow-Up Questions

- How would you handle a service account you strongly suspect is dead, but that has permissions to a system too critical to risk being wrong about?
- What automated guardrails would you put in place so this 340-account sprawl situation doesn't recur in two years?
- How would your approach differ for human user accounts versus machine service accounts?

## References

- [AWS: IAM Access Analyzer](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
- [AWS: Refining permissions using last accessed information](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html)
