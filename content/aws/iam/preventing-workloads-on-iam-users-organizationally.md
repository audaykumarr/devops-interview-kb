---
id: aws-iam-preventing-workload-iam-user-recurrence-001
title: "How would you prevent a new workload from ever being built directly on a static IAM user again, at an organizational level rather than case by case?"
category: aws
subcategory: iam
technologies:
  - aws
difficulty: advanced
question_type:
  - scenario
  - security
tags:
  - aws
  - iam
  - governance
  - least-privilege
estimated_time_minutes: 8
companies: []
related_questions:
  - aws-iam-least-privilege-migration-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You've just finished migrating one workload off a static IAM user onto a proper role. How would you prevent this from happening again organization-wide, rather than just fixing this one instance and waiting to discover the next one the same way?

## Short Answer

Combine a preventive guardrail (a Service Control Policy or IAM permissions boundary that blocks creating new IAM users with programmatic access outside an explicit exception process) with a detective control (scheduled scanning for IAM users with active access keys, alerting when one appears) and a paved-road default (make the role-based path the easy, documented default for provisioning new workload access, not an extra step people skip under deadline pressure) — prevention alone tends to get bypassed under pressure without a genuinely easier default path available.

## Detailed Explanation

Fixing one instance of a workload built on a static IAM user solves that instance; it doesn't address why it happened, which is usually some combination of "the role-based path wasn't the obvious default" and "there was no guardrail actively stopping the shortcut." A durable fix addresses both.

**Preventive control**: an AWS Organizations Service Control Policy (SCP) can deny `iam:CreateAccessKey` (or `iam:CreateUser` entirely) account-wide, with an explicit exception mechanism (e.g. a specific tag or a separate break-glass account) for the rare legitimate case — like the third-party-vendor scenario requiring static keys — where it's genuinely unavoidable. This makes the shortcut structurally unavailable by default rather than merely discouraged in a wiki page nobody reads under deadline pressure.

**Detective control**: even with a preventive SCP, drift and exceptions happen — a scheduled scan (AWS Config rule, or a custom Lambda on a schedule) checking for IAM users with active access keys, reporting findings to a channel the platform/security team actually watches, catches anything that slips through or predates the guardrail. This is the safety net for the cases prevention alone doesn't cover.

**Paved-road default**: guardrails alone tend to just create friction if there's no easier alternative offered alongside them — if provisioning a proper IAM role for a new workload is a slower, less-documented process than "just create a user with an access key," people will find a way around the guardrail (or petition for an exception) under time pressure. Pairing the restriction with genuinely easy self-service role provisioning (a Terraform module, a service-catalog-style internal tool, clear documentation with copy-pasteable examples) removes the incentive to route around the guardrail in the first place, since the correct path is no longer the harder one.

The combination matters because each piece covers a different failure mode: prevention stops the common case outright, detection catches what prevention misses (legitimate exceptions, older resources, policy gaps), and a good default removes the pressure that causes people to seek workarounds for the prevention in the first place.

## Key Takeaways

- Fixing one instance doesn't prevent recurrence — that requires addressing why it happened structurally, not just this one case.
- A preventive SCP denying IAM user/access-key creation by default (with an explicit exception path) makes the shortcut structurally unavailable.
- A detective scan for IAM users with active access keys catches what prevention misses or predates.
- Guardrails without an easier paved-road alternative just create pressure to bypass them — pair restriction with genuinely easy self-service role provisioning.

## Interview Follow-Up Questions

- How would you design the exception process for the SCP so legitimate cases (like a vendor requiring static keys) aren't blocked indefinitely by bureaucracy?
- What would you do if the detective scan found dozens of pre-existing IAM users with active keys across many accounts — how would you prioritize remediation?
- How would you measure whether this governance change actually worked, six months later?

## References

- [AWS: Service control policies (SCPs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [AWS Config: iam-user-no-policies-check and related managed rules](https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html)
