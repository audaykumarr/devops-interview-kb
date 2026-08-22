---
id: security-iam-and-access-control-vendor-access-review-001
title: "A third-party vendor's contract is up for renewal, and their integration still has the broad access it was granted two years ago during initial setup. How do you review and right-size it before renewing?"
category: security
subcategory: iam-and-access-control
technologies:
  - security
difficulty: intermediate
question_type:
  - scenario
tags:
  - iam
  - vendor-access
  - access-review
  - least-privilege
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A third-party vendor integration is up for contract renewal. Digging into its access, you find it still has the broad permissions granted two years ago during initial setup — access nobody has revisited since. How do you review and right-size this before renewing, without breaking the integration?

## Short Answer

Treat this like any other least-privilege review: find out what the integration actually uses today (via access logs or API call history, not the original setup documentation), compare that against what it's currently granted, and narrow the grant to match actual current usage — then make renewal conditional on the vendor being able to operate correctly under the narrowed scope, verified in a non-production environment before cutting over in production.

## Detailed Explanation

The core problem is that access grants tend to only ever expand over time — someone widens a permission to unblock a one-off need and nobody narrows it back down afterward — so a two-year-old integration's grant is a reasonable proxy for "everything anyone thought it might need at some point," not "what it actually needs today." A renewal cycle is a natural, low-friction moment to correct this, since it's already a checkpoint where both sides are engaged.

**Determine actual current usage, not assumed usage**: pull the vendor integration's actual API call or access log history over a representative period (long enough to capture any periodic/batch behavior, not just daily traffic) rather than relying on the original integration documentation, which likely reflects intended use two years ago rather than actual use today.

**Compare granted permissions against actual usage**: any permission the integration is granted but has never exercised in the observed window is a candidate for removal — this is the same "unused permission" logic as an internal service account review, just applied to an external vendor relationship.

**Verify in a non-production environment before narrowing production access**: test the narrowed permission set against a staging or sandbox instance of the integration first, since removing access the vendor didn't know it depended on (an edge case, an infrequent batch job) would otherwise surface as a production breakage during or after renewal.

**Make the narrowed scope part of the renewal conversation, not a unilateral silent change**: looping the vendor in (rather than just changing their access and hoping nothing breaks) gives them the chance to flag a legitimate but infrequent use case you might have missed in the usage-log window, and sets an expectation that access will continue to be periodically reviewed going forward.

## Key Takeaways

- Access grants only tend to expand over time unless something forces a review — a contract renewal is a natural, low-friction checkpoint to correct that drift.
- Base the review on actual observed usage (logs, API call history), not the original setup documentation, which reflects intent from the time of setup rather than current reality.
- Test a narrowed permission set in non-production before cutting over, since an infrequent legitimate use case is easy to miss in a usage-log window.
- Loop the vendor into the narrowing conversation rather than changing access unilaterally — they may know about a legitimate edge case your log review didn't catch.

## Interview Follow-Up Questions

- How would you build a recurring process so vendor access review happens on a schedule, rather than only at contract renewal?
- What would you do if the vendor pushed back and insisted they need the original broad access, without a specific justification?
- How would this review differ for a vendor with write/modify access to production systems versus one with read-only access?

## References

- [NIST SP 800-53: Access Control](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [AWS: Refining permissions using last accessed information](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html)
