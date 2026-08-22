---
id: security-iam-and-access-control-break-glass-design-001
title: "How would you design a 'break-glass' emergency access process that lets an engineer bypass normal approval during a critical incident, without that becoming a permanent backdoor around your access controls?"
category: security
subcategory: iam-and-access-control
technologies:
  - security
difficulty: expert
question_type:
  - architecture
tags:
  - iam
  - break-glass
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

Your normal access-approval process is deliberately slow for good reasons, but during a critical production incident at 3am, waiting on a normal approval chain can turn a 10-minute fix into a multi-hour outage. How would you design a "break-glass" emergency access process that lets an engineer bypass normal approval when it genuinely matters, without that mechanism quietly becoming a permanent backdoor around your access controls?

## Short Answer

Make break-glass access easy to *use* but expensive to use *quietly* — grant temporary elevated access fast and without a human approval gate in the moment, but pair it with strong, unavoidable logging, automatic time-boxing (access expires on its own, not on someone remembering to revoke it), and mandatory after-the-fact review of every single use — so the friction moves from "before, blocking the incident" to "after, making misuse or overuse visible and accountable."

## Detailed Explanation

The core design tension is that the two things break-glass access needs to satisfy — fast enough to actually help during a real incident, and controlled enough to not undermine your access model — pull in opposite directions if you try to solve both with the same mechanism. The resolution is to stop trying to gate it in the moment (which is what makes it slow) and instead make its use radically visible and reviewed after the fact, which is a control that doesn't cost any time during the incident itself.

## Requirements

- An engineer must be able to get emergency elevated access without waiting on a human approver, since the entire point is bypassing exactly that bottleneck during genuine incidents.
- Every use must be automatically and unavoidably logged, in a system the person using break-glass can't quietly disable or edit.
- Elevated access must expire automatically after a bounded window, not rely on the person remembering to relinquish it.
- Every use must trigger mandatory after-the-fact review, so the absence of an upfront gate doesn't mean the absence of accountability.

## Architecture

**Self-service activation with immutable logging**: an engineer can activate break-glass access themselves (e.g., via a dedicated IAM role they can assume, or a documented emergency procedure), but activation is logged to a system outside their own control — a separate audit log or SIEM the activating engineer has no write/delete access to — so there's no way to use the access and also erase the record of having used it.

**Automatic time-boxing, not manual revocation**: the elevated access is granted with a short, hard expiration (e.g., one to four hours) baked into the credential or session itself, so it lapses on its own regardless of whether anyone remembers to revoke it — removing "did someone forget to clean this up" as a failure mode entirely.

**Mandatory, fast-turnaround post-use review**: every activation automatically triggers a review — ideally within 24 to 48 hours — where the engineer explains what happened and a second person (their manager, a security lead) confirms it was a legitimate use. This is the actual control point in this design: not preventing use, but ensuring every use gets looked at.

**Real-time alerting on activation, not just after-the-fact logging**: activation should also fire an immediate alert to a security channel or on-call security contact, so genuinely suspicious use (an activation with no corresponding incident) gets noticed quickly rather than only surfacing during the scheduled review.

## Trade-offs

This design accepts a real risk — someone could misuse break-glass access and it wouldn't be caught until the after-the-fact review, meaning it's not a preventive control in the moment. That's a deliberate trade against the alternative (gating activation itself), which would reintroduce the exact delay the mechanism exists to eliminate. The design also requires investment in the immutable-logging and automatic-alerting infrastructure upfront, and depends on the review process actually being followed rigorously — a break-glass system whose review step quietly stops happening degrades back into an ungoverned backdoor.

## Key Takeaways

- Resolve the speed-versus-control tension by moving control from before use (which costs time during an incident) to after use (immutable logging, mandatory review) — not by trying to gate the moment of activation.
- Automatic time-boxing removes "forgot to revoke" as a failure mode; don't rely on manual cleanup.
- Real-time activation alerts catch obviously suspicious use fast, while the scheduled review catches everything else.
- The whole system depends on the after-the-fact review actually happening every time — an unenforced review step is how break-glass quietly becomes a permanent backdoor.

## Interview Follow-Up Questions

- How would you handle a case where the after-the-fact review finds a use that wasn't actually a legitimate emergency?
- How would you prevent break-glass from becoming a habitual workaround for a normal approval process that's simply too slow?
- What would you measure to know whether this mechanism is being used appropriately over time?

## References

- [NIST SP 800-53: Access Control (AC-6, Least Privilege)](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [AWS: Temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp.html)
