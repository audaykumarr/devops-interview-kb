---
id: gcp-storage-versioning-lifecycle-noncurrent-deletion-incident-001
title: "Object versioning was enabled for safety, but a lifecycle rule deleting noncurrent versions caused the same data loss versioning was meant to prevent — how?"
category: gcp
subcategory: storage
technologies:
  - gcp
  - cloud-storage
difficulty: advanced
question_type:
  - troubleshooting
  - scenario
tags:
  - gcp
  - cloud-storage
  - versioning
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team enabled object versioning on a bucket specifically so an accidental overwrite or deletion would be recoverable from a prior version. A lifecycle rule was also configured to delete noncurrent versions after 7 days, to control storage cost. An application bug caused repeated accidental overwrites of a critical file over the course of two weeks, and by the time anyone noticed, every version old enough to contain the correct data had already been deleted by the lifecycle rule. Versioning didn't actually protect the data. What went wrong, and how would you design around this?

## Short Answer

The lifecycle rule's 7-day noncurrent-version retention window was shorter than the actual time it took to detect the problem (two weeks) — versioning genuinely preserved history, but only within a window that had already expired by the time anyone noticed, deleting every version that still held the correct data before recovery was ever attempted. The fix is two things together: extend retention to genuinely exceed realistic worst-case detection latency, and add monitoring that catches this class of problem far sooner, since a longer window only helps if detection happens within it.

## Detailed Explanation

Versioning and a noncurrent-version deletion lifecycle rule are in direct, structural tension — versioning exists to preserve recoverability, while the lifecycle rule exists to bound how long that recoverability lasts, and if the rule's retention window is shorter than how long it actually takes to notice a problem, the rule can delete the exact recovery point you needed before anyone knew there was a problem to recover from.

## Symptoms

- An application bug caused repeated accidental overwrites of an object over an extended period.
- By the time the problem was noticed, no recoverable version containing the correct, pre-bug data still existed.
- Object versioning was enabled and, in isolation, appeared to be a sufficient safety net.

## Possible Causes

- The lifecycle rule's noncurrent-version retention window (7 days) was shorter than the actual time it took to detect the problem (two weeks) — versioning was preserving history, but only for a window shorter than the actual incident's detection latency.
- No monitoring existed to detect the repeated accidental overwrites as they were happening, meaning the 7-day window had no chance of being noticed in time even if it had been theoretically sufficient in some other scenario.
- The lifecycle rule was configured based on a cost-optimization goal ("we don't need old versions taking up space") without considering the actual worst-case detection latency for the kind of problem versioning was meant to protect against.

## Investigation Steps

**Confirm the actual timeline: when did the bad overwrites start, when were they detected, and what was the lifecycle rule's retention window**: reconstructing this timeline directly (via Cloud Audit Logs showing object write history, and comparing against the lifecycle rule's configured age threshold) confirms precisely how the retention window and detection latency interacted to produce this outcome.

**Check whether any monitoring existed that could have caught the problem sooner**: reviewing what observability existed around this specific data path (application error monitoring, data quality checks, anything that might have caught the repeated overwrites earlier) reveals whether faster detection was realistically achievable, which matters for designing the actual fix.

**Check whether the lifecycle rule's retention window was ever deliberately chosen against a realistic detection-latency requirement, or just picked as a round number for cost reasons**: understanding whether 7 days was a considered decision or an arbitrary default clarifies whether the fix is "choose a better-considered number" or "recognize this requires a fundamentally different approach than lifecycle-rule-based retention alone."

## Resolution

Extend the noncurrent-version retention window to genuinely exceed realistic worst-case detection latency for the kind of problem versioning is meant to protect against — this is a real cost-versus-safety trade-off that needs to be made deliberately, not defaulted to whatever number minimizes storage cost. Separately, and more fundamentally, add monitoring/alerting that can catch this class of problem (repeated unexpected overwrites, data quality anomalies) much sooner than "someone eventually notices," since a longer retention window only helps if detection happens within it — the two fixes are complementary, not substitutes for each other. For genuinely critical data, consider a separate, longer-retention backup mechanism (a periodic export to a separate, more conservatively-retained location) rather than relying on lifecycle-rule-bounded versioning alone as the sole safety net.

## Key Takeaways

- Object versioning's protection is only as good as the lifecycle rule's retention window — a rule deleting noncurrent versions after 7 days means recoverability doesn't extend past 7 days, regardless of when a problem is actually noticed.
- A retention window shorter than realistic worst-case detection latency for the class of problem being protected against defeats the purpose of the safety net entirely.
- Faster detection (monitoring/alerting on the underlying problem) and a longer retention window are complementary fixes, not substitutes — either alone leaves a gap.
- For genuinely critical data, a separate, more conservatively-retained backup mechanism is worth considering rather than relying solely on lifecycle-rule-bounded versioning.

## Interview Follow-Up Questions

- How would you determine the right noncurrent-version retention window for a specific bucket, balancing cost against realistic detection-latency risk?
- How would you design monitoring specifically to catch repeated unexpected overwrites of a critical object, rather than relying on someone noticing downstream symptoms?
- How does this same tension (retention window versus detection latency) apply to backup strategies more broadly, beyond just Cloud Storage versioning specifically?

## References

- [Google Cloud: Object versioning](https://cloud.google.com/storage/docs/object-versioning)
- [Google Cloud: Object lifecycle management](https://cloud.google.com/storage/docs/lifecycle)
