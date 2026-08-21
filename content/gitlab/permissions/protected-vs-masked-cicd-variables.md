---
id: gitlab-permissions-protected-vs-masked-variables-001
title: "What's the difference between a \"Protected\" and a \"Masked\" GitLab CI/CD variable, and why would you want both on the same variable?"
category: gitlab
subcategory: permissions
technologies:
  - gitlab-ci
difficulty: beginner
question_type:
  - conceptual
  - comparison
tags:
  - gitlab
  - ci-cd
  - secrets
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

GitLab CI/CD variables can independently be marked "Protected" and "Masked." What's the actual difference between these two settings, and why would a sensitive variable typically want both enabled at once?

## Short Answer

"Protected" controls *where* a variable's value is exposed — it's only made available to pipelines running on protected branches or protected tags, not to pipelines on arbitrary feature branches. "Masked" controls *how* the value appears in job logs — it's automatically redacted (replaced with `[MASKED]` or similar) wherever it would otherwise print in log output. They address genuinely different risks — exposure to the wrong pipeline context versus accidental exposure in logs — which is exactly why a real secret typically wants both enabled together, not just one.

## Detailed Explanation

**Protected** addresses the question "which pipelines even get this value at all." Marking a variable Protected means it's only injected into pipelines running on a branch or tag that's itself marked protected in the project's settings — a pipeline running on an arbitrary, unprotected feature branch never receives the variable's value, regardless of who triggered that pipeline or what the job's script tries to do with it. This matters because a production deploy credential, for instance, shouldn't be available to a pipeline running on some developer's experimental feature branch at all — Protected is the mechanism preventing that exposure by restricting which pipeline contexts even have access to the value in the first place.

**Masked** addresses a different question: "if a job's script were to accidentally print this value (a debug `echo`, an error message that includes it, a verbose logging flag), would it show up in the job's log output." Marking a variable Masked tells GitLab to scan job log output for the variable's exact value and replace any occurrence with `[MASKED]` before the log is stored or displayed — protecting against accidental exposure through logging, even for a pipeline that legitimately has access to the value.

These are genuinely independent concerns: a variable could be Protected but not Masked (only available to protected-branch pipelines, but if a script there accidentally logs it, the raw value appears in that pipeline's logs) or Masked but not Protected (redacted from logs everywhere, but available to every pipeline including untrusted feature branches, where a script could still exfiltrate it in other ways — sending it to an external endpoint, for instance, which masking doesn't prevent). A genuinely sensitive value — an API key, a database password, a deploy credential — should generally have both enabled: Protected limits which pipelines can access it at all, and Masked limits accidental exposure in logs within the pipelines that do have legitimate access. Neither alone provides the other's protection.

## Key Takeaways

- Protected restricts which pipelines (only those on protected branches/tags) receive a variable's value at all.
- Masked automatically redacts a variable's value from job log output wherever it would otherwise appear.
- The two address different risks — wrong-pipeline exposure versus accidental-log exposure — and neither substitutes for the other.
- A genuinely sensitive CI/CD variable should typically have both settings enabled together.

## Interview Follow-Up Questions

- What's a scenario where Masked alone wouldn't actually prevent a secret from leaking, even though the log output looks clean?
- How would you audit an existing GitLab project for sensitive variables that are missing one or both of these settings?
- What's the trade-off of marking a variable Protected if a legitimate non-protected-branch pipeline actually needs it?

## References

- [GitLab Docs: Protect a CI/CD variable](https://docs.gitlab.com/ee/ci/variables/#protect-a-cicd-variable)
- [GitLab Docs: Mask a CI/CD variable](https://docs.gitlab.com/ee/ci/variables/#mask-a-cicd-variable)
