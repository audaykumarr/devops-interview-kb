---
id: github-actions-security-detecting-reintroduced-long-lived-keys-001
title: "After migrating to OIDC, how would you detect and alert on someone reintroducing a long-lived AWS access key as a GitHub secret?"
category: github-actions
subcategory: security
technologies:
  - github-actions
  - aws
difficulty: intermediate
question_type:
  - practical
  - security
tags:
  - github-actions
  - oidc
  - security
  - monitoring
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A repository has been fully migrated from static AWS access keys to OIDC-based short-lived credentials. Months later, someone under time pressure adds `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` back as repository secrets to unblock a workflow. How would you detect and alert on that regression?

## Short Answer

Combine a repository-configuration check (scan for the presence of secrets named like AWS static credentials, via the GitHub API, on a schedule) with an AWS-side detective control (CloudTrail-based alerting on any IAM user access key actually being used, since a genuinely OIDC-only setup should show zero long-lived-credential API activity) — the first catches the regression at the GitHub layer quickly, the second is the ground-truth backstop confirming whether a reintroduced key was ever actually used.

## Detailed Explanation

**GitHub-side detection**: the GitHub API (`GET /repos/{owner}/{repo}/actions/secrets`) lists a repository's configured Actions secrets by name (not value, which GitHub never exposes). A scheduled check — a GitHub Actions workflow itself, running on a cron schedule, or an external scanning job — can call this endpoint and flag any secret name matching a known static-credential pattern (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or an organization-specific naming convention for such secrets) that shouldn't exist post-migration. This catches the regression essentially as soon as it happens, without needing the credential to actually be used first.

**AWS-side detection**: since the whole point of migrating to OIDC is that workflows no longer need static IAM user credentials, a CloudTrail-based alert watching for **any** API activity performed by an IAM user's access key (as opposed to an assumed-role session, which is what OIDC produces) is a strong, independent confirmation signal — in a genuinely OIDC-only setup, this should be zero, so any activity at all is worth investigating. This is the ground-truth backstop: even if a reintroduced secret somehow isn't caught by the GitHub-side scan (a naming convention that doesn't match the expected pattern, for instance), actual usage of a static key would still show up here.

**Combining both layers matters** because they catch different failure points: the GitHub-side check catches the secret's *existence*, independent of whether it's ever used — useful for catching the regression immediately, before any real exposure. The AWS-side check catches actual *usage*, which is the ground truth for whether real risk materialized, and doesn't depend on correctly guessing every possible secret-naming pattern someone might use when reintroducing a key.

**Preventing the regression from being tempting in the first place** is worth pairing with detection: if OIDC-based deploys are already the well-documented, easy default (the actual root-cause prevention from the earlier IAM-user-recurrence discussion), someone under time pressure is less likely to reach for a static key as the path of least resistance — detection is the safety net, not the primary defense.

## Key Takeaways

- Scan repository secrets via the GitHub API on a schedule for names matching known static AWS credential patterns, as an early, existence-based detection layer.
- Alert on any CloudTrail activity from an IAM user access key (versus an assumed-role session) as the ground-truth, usage-based backstop, since a genuine OIDC-only setup should show zero such activity.
- The two layers catch different things — existence versus actual usage — and neither alone is a complete detection strategy.
- Pairing detection with an easy, well-documented OIDC-based default reduces how often someone is tempted to reintroduce a static key under pressure in the first place.

## Interview Follow-Up Questions

- How would you handle a legitimate, narrow exception where a static key genuinely is still required (per the third-party-vendor scenario), without it triggering false alarms in this monitoring?
- How would you extend this detection to organization-wide secrets, not just repository-level ones?
- What would you do if the scheduled GitHub-side scan itself needs credentials — how would you avoid that becoming its own static-credential liability?

## References

- [GitHub REST API: Actions secrets](https://docs.github.com/en/rest/actions/secrets)
- [AWS: Logging IAM and AWS STS API calls with CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
- [GitHub Docs: About security hardening with OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
