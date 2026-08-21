---
id: devsecops-pipeline-security-measuring-remediation-rate-001
title: "How would you measure whether engineers are actually acting on security scan findings, versus just dismissing them to unblock their PR?"
category: devsecops
subcategory: pipeline-security
technologies:
  - devsecops
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - devsecops
  - metrics
  - vulnerability-management
estimated_time_minutes: 6
companies: []
related_questions:
  - devsecops-pipeline-security-scanning-without-slowdown-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A security scanning rollout looks successful by the metric of "scans are running on every PR," but that doesn't tell you whether engineers are actually fixing what's found versus dismissing or suppressing findings just to unblock themselves. How would you actually measure the difference?

## Short Answer

Track outcome metrics, not activity metrics: what fraction of findings are actually resolved (fixed) versus dismissed/suppressed, how long resolution takes, and whether the same suppression justification gets reused repeatedly on similar findings (a sign of rubber-stamping rather than genuine case-by-case risk assessment) — activity metrics like "scans ran" or "findings were surfaced" only prove the tool is running, not that it's changing behavior.

## Detailed Explanation

The gap between "the scanner ran" and "the finding got meaningfully addressed" is exactly where a well-intentioned security tooling rollout can quietly fail — engineers under deadline pressure will find the path of least resistance, and if that path is a one-click dismissal with minimal justification required, the scanning tool ends up providing the appearance of security rigor without the substance.

**Resolution rate and time-to-resolution**: track, per finding severity, what fraction get genuinely fixed (the vulnerable dependency is upgraded, the SAST-flagged code pattern is changed) versus dismissed/suppressed, and how long resolution takes from when the finding first appeared. A high dismissal rate, or a resolution time that's suspiciously always "just before the PR needs to merge," are both signals worth investigating rather than metrics that look fine on the surface.

**Dismissal justification quality, not just dismissal count**: if the tooling requires a reason when dismissing/suppressing a finding, review those reasons periodically — not exhaustively, but enough to catch patterns like the same boilerplate justification ("false positive," with no specifics) being reused across many genuinely different findings, which suggests the justification requirement isn't actually functioning as a real check, just a formality being clicked through.

**Recurrence of previously-dismissed findings**: if a dismissed finding reappears (the same vulnerable pattern shows up again elsewhere, or the same dependency's vulnerability is later actually exploited or escalated by a researcher), that's a direct, retrospective signal about whether the earlier dismissal was actually sound — worth periodically auditing dismissed findings against later real-world developments, not just trusting the dismissal was correct at the time.

**Trend over time, segmented by team**: aggregate resolution-rate and dismissal-rate trends across the whole organization can hide meaningful variation — segmenting by team surfaces whether the tooling is working as intended broadly, or whether specific teams under particular pressure have developed a pattern of routine dismissal that the aggregate number obscures.

The overall principle: measure what actually happened to the risk (fixed, genuinely triaged and accepted, or rubber-stamped away), not just whether the process technically ran — the latter is easy to satisfy without the tooling actually improving security outcomes.

## Key Takeaways

- Measure outcome (resolution rate, time-to-resolution, dismissal justification quality) rather than activity (scans ran, findings surfaced) — activity metrics don't prove the tooling changed anything.
- Reviewing dismissal justifications periodically catches rubber-stamped, boilerplate dismissals that a raw dismissal count wouldn't reveal.
- Auditing whether dismissed findings later recur or get exploited provides a real, retrospective check on dismissal quality.
- Segmenting trends by team surfaces localized problems an aggregate organization-wide number can hide.

## Interview Follow-Up Questions

- How would you design the dismissal justification requirement so it's genuinely useful without becoming its own bureaucratic burden?
- What would you do if a specific team consistently showed a much higher dismissal rate than the rest of the organization?
- How would you balance auditing dismissed findings against the effort cost of doing that review regularly?

## References

- [OWASP: DevSecOps Guideline](https://owasp.org/www-project-devsecops-guideline/)
- [NIST: Guide to Enterprise Patch Management Planning](https://csrc.nist.gov/pubs/sp/800/40/r4/final)
