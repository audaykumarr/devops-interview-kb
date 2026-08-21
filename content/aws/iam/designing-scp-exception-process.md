---
id: aws-iam-designing-scp-exception-process-001
title: "How would you design the exception process for an SCP blocking IAM user creation, so legitimate cases aren't blocked indefinitely by bureaucracy?"
category: aws
subcategory: iam
technologies:
  - aws
difficulty: advanced
question_type:
  - practical
tags:
  - aws
  - iam
  - governance
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An SCP blocking IAM user/access-key creation needs an exception path for legitimate cases (a vendor requiring static keys). How would you design that exception process so it's fast enough to not become its own bureaucratic bottleneck, while still being a real check?

## Short Answer

Use a tag-based exception mechanism (an account or resource tagged as pre-approved for the exception, checked by the SCP's own condition) combined with a lightweight, fast-turnaround approval step (a short written justification reviewed by a designated approver, not a committee) — the SCP itself can then technically allow the tagged exception automatically, while the human approval step that grants the tag in the first place is what provides the actual governance check, kept fast enough that legitimate needs aren't stuck waiting.

## Detailed Explanation

**Tag-based technical exception mechanism**: rather than having the SCP hard-block with no exception path at all (forcing a slow, manual SCP-modification process for every legitimate case), design the SCP's `Deny` condition to exempt principals/resources carrying a specific, deliberately-hard-to-self-grant tag (e.g. `iam-user-exception: approved`) — approved exceptions become a normal, low-friction technical configuration once approved, rather than requiring the SCP document itself to be edited each time.

**Fast, lightweight approval for granting the tag**: the actual governance happens at the point of granting that exception tag, not in the SCP's technical mechanism — a short, specific written justification (what's the constraint, why can't it use role-based credentials) reviewed by a designated approver (a platform/security team lead, not a full committee) with a fast turnaround target (days, not weeks) keeps the process from becoming its own bottleneck while still requiring a real justification, not a rubber stamp.

**Separate who can request the exception from who can grant it**: the tag itself should only be settable by a restricted, trusted set of principals (the platform/security team granting approved exceptions), not by the team requesting it — otherwise the "exception process" is trivially self-service and provides no real governance at all, defeating the SCP's purpose.

**Time-bound or periodically-reviewed exceptions**: rather than a permanent exception once granted, tying the exception to a review date (revisit in 6-12 months — is this constraint still real, has role-based credential support since become available) prevents an exception granted for a genuine reason at the time from silently becoming permanent, unreviewed technical debt.

**Track all granted exceptions centrally**: maintaining a visible registry of every currently-granted exception (which account, why, when it was granted, when it's due for review) gives the platform/security team ongoing visibility into the actual scope of exceptions across the organization, rather than each exception being an isolated, hard-to-track configuration change.

## Key Takeaways

- A tag-based technical exception mechanism keeps the SCP itself simple while making approved exceptions a normal, low-friction configuration once granted.
- The real governance check happens at the human approval step granting the exception tag — keep it fast (a short justification, a designated approver, days not weeks) so it doesn't become its own bottleneck.
- Restrict who can grant the exception tag separately from who can request it, or the process provides no real governance.
- Time-bound exceptions with a periodic review date prevent a legitimate-at-the-time exception from silently becoming permanent, unreviewed technical debt.

## Interview Follow-Up Questions

- How would you handle a genuinely urgent exception request that can't wait for the normal approval turnaround?
- What would you do if the exception registry reveals dozens of exceptions accumulating — how would you prioritize reviewing them?
- How would you prevent the designated approver from becoming a bottleneck as the organization and exception volume grow?

## References

- [AWS: Service control policies (SCPs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
