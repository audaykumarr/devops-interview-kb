---
id: bash-scripting-cron-cloud-cli-credentials-001
title: "A script needs cloud CLI credentials (like AWS/Azure/gcloud auth) that are normally provided by an interactive session's environment. How do you handle that for a cron-scheduled script?"
category: bash
subcategory: scripting
technologies:
  - bash
  - aws
difficulty: intermediate
question_type:
  - practical
  - scenario
tags:
  - bash
  - cron
  - credentials
  - automation
estimated_time_minutes: 7
companies: []
related_questions:
  - bash-scripting-cron-environment-mismatch-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A script that calls the AWS CLI (or another cloud CLI) works fine run manually, because your interactive session already has credentials configured — SSO session, environment variables set by a login script, or an assumed role from an earlier command. How do you provide equivalent credentials to the same script when it's run by cron, which has none of that interactive session state?

## Short Answer

Don't rely on anything tied to an interactive session (SSO sessions, manually-run `aws sso login`, environment variables set by a shell startup file cron never sources) — instead, give the cron job its own explicit, non-interactive credential source: an IAM role if the script runs on AWS compute (instance profile, ECS task role), or a dedicated service credential (an IAM user scoped tightly to just what the script needs, or a stored SSO/OIDC-based short-lived credential refreshed by the script itself) referenced explicitly in the cron job's own environment, not inherited from wherever it happens to run.

## Detailed Explanation

The reason this breaks specifically for cron is the same root cause as the general cron-environment-mismatch problem: cron doesn't source shell startup files, so any credential setup that lives there (an `export AWS_PROFILE=...` in `.bashrc`, an SSO login performed once per day in an interactive terminal) simply isn't present when cron runs the script — the script has no idea those credentials were ever configured, because from cron's non-interactive shell's perspective, they never were.

The fix depends on where the script actually runs and what's available:

**If running on cloud compute** (an EC2 instance, an ECS task, a Lambda function on a schedule): use the compute's own IAM role mechanism (instance profile, task role, execution role) — this is the cleanest fix, since credentials are automatically available to any process on that compute via the metadata service, with no explicit configuration needed in the cron job itself, and no static credential to manage or leak at all.

**If running somewhere without a native cloud identity** (an on-prem server, a personal machine, a non-cloud CI runner): a dedicated, narrowly-scoped credential is required — either a static IAM user's access keys (accepting the trade-offs of a long-lived credential, scoped tightly and rotated, per the earlier third-party-app pattern) stored securely (a secrets manager, an encrypted credentials file readable only by the account the cron job runs as) and referenced explicitly (`AWS_SHARED_CREDENTIALS_FILE=/path/to/creds` set directly in the crontab or the script itself, not relying on a default location that assumes interactive-session setup), or a short-lived credential obtained via an automated, non-interactive auth flow (e.g. an OIDC-based exchange) that the script itself performs before making any cloud API calls, rather than assuming credentials are already present.

**Explicit over inherited, in all cases**: whatever the credential source, it should be referenced explicitly within the cron job's own execution context (set directly in the crontab's environment, or sourced from a file the script explicitly reads) rather than assumed to be inherited from "whatever's normally configured" — since cron's minimal environment guarantees nothing is inherited by default.

## Key Takeaways

- Cron's non-interactive, non-login shell doesn't inherit interactive-session credential setup (SSO sessions, environment variables from shell startup files) — the same root cause as the general cron-environment-mismatch problem.
- On cloud compute, the IAM role mechanism (instance profile, task role) is the cleanest fix — no static credential needed, automatically available to any process.
- Off cloud compute, a dedicated, narrowly-scoped credential (stored securely, referenced explicitly) or an automated non-interactive auth flow is required.
- Credentials for a cron job should always be referenced explicitly within its own execution context, never assumed to be inherited from interactive-session state.

## Interview Follow-Up Questions

- How would you rotate a static credential used by a cron job without causing a failed run during the rotation window?
- What's the security risk of storing cloud credentials in a file readable by a cron job, and how would you mitigate it?
- How would this approach change if the cron job needed to authenticate to multiple different cloud providers in the same script?

## References

- [AWS CLI: Configuration and credential file settings](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [AWS: IAM roles for Amazon EC2](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html)
