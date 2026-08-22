---
id: security-iam-and-access-control-access-review-cadence-001
title: "How would you design a recurring privileged-access review that catches stale access at scale without becoming a rubber-stamp exercise nobody takes seriously?"
category: security
subcategory: iam-and-access-control
technologies:
  - security
difficulty: advanced
question_type:
  - conceptual
  - practical
tags:
  - iam
  - access-review
  - least-privilege
  - compliance
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You need a recurring privileged-access review process for an organization with hundreds of employees and thousands of permission grants across dozens of systems. Done badly, this becomes a quarterly email nobody reads before clicking "approve all." How would you design it so it actually catches stale or inappropriate access, at that scale?

## Short Answer

The failure mode at scale is asking one person (usually a manager) to review too many grants at once with too little context, which guarantees rubber-stamping — the fix is to shrink both the volume and the cognitive load per review: pre-filter to genuinely risky or unusual grants using actual usage data, route each grant to the person with the most relevant context (not always the manager), and make the review itself a specific yes/no question about actual behavior rather than an abstract permission list.

## Detailed Explanation

A review process that asks "does this person still need admin access to this system," repeated a thousand times across an organization, is a process that will get rubber-stamped, because the reviewer has no efficient way to actually know the answer and the review itself doesn't distinguish a genuinely risky grant from a routine one. Fixing this means reducing what humans have to judge, not just changing who judges it.

**Pre-filter using actual usage data, don't review everything with equal weight**: a grant that's been used consistently and recently is low-risk to rubber-stamp; a grant that's gone unused for months, or that grants unusually broad access relative to the person's role, is exactly what a review needs to actually catch — surfacing the latter prominently and letting the former auto-renew with a lighter touch (or a simple confirmation) focuses human attention where it matters.

**Route to the person with the most relevant context, not automatically the manager**: a manager often doesn't know what systems a report actually uses day to day, especially in a large or matrixed organization — routing technical/system access reviews to a system owner or team lead who actually knows the day-to-day usage produces a meaningfully more accurate review than a manager guessing.

**Ask a concrete, answerable question, not an abstract one**: "does this person still need access to System X" is hard to answer confidently; "this person hasn't used their admin access to System X in 90 days — should it be revoked?" is a concrete, evidence-backed question a reviewer can actually answer with confidence, and is far more resistant to rubber-stamping.

**Make revocation the default for non-response, not renewal**: if a review isn't completed by the deadline, access should lapse rather than silently continue — this single design choice is what actually forces reviews to happen rather than being safely ignorable, since ignoring the review now has a real consequence.

## Key Takeaways

- Reviewing every grant with equal weight guarantees rubber-stamping at scale — pre-filter using actual usage data so human attention goes to genuinely risky or unusual grants.
- Route reviews to whoever has the most relevant day-to-day context, which isn't always the direct manager.
- Ask concrete, evidence-backed questions ("unused for 90 days, revoke?") rather than abstract ones ("still needed?") — the former is answerable with confidence, the latter invites rubber-stamping.
- Default to revocation on non-response, not renewal — this is what gives the review process real teeth.

## Interview Follow-Up Questions

- How would you handle pushback from reviewers who say this process is still too much work even after the filtering?
- How would you measure whether this review process is actually catching stale access, versus just generating activity?
- How would this design change for a highly regulated industry where every review decision needs a documented audit trail?

## References

- [NIST SP 800-53: Access Control](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [SOC 2: Access Review Requirements Overview](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)
