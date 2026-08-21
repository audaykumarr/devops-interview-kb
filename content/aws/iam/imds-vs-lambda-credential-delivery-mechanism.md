---
id: aws-iam-imds-vs-lambda-credential-delivery-001
title: "What's the mechanism difference between how EC2's IMDS delivers credentials versus how Lambda delivers them to a function's environment?"
category: aws
subcategory: iam
technologies:
  - aws
  - lambda
difficulty: advanced
question_type:
  - comparison
tags:
  - aws
  - iam
  - lambda
  - ec2
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Both EC2 instance profiles and Lambda execution roles deliver temporary credentials to running code, but the actual mechanism is quite different. How does EC2's Instance Metadata Service (IMDS) approach differ from how Lambda delivers credentials to a function?

## Short Answer

EC2's IMDS is a pull-based, network-accessible HTTP endpoint (`169.254.169.254`) that any process on the instance can query at any time to fetch (and periodically refresh) temporary credentials — the instance's role isn't pushed to the process, the process has to actively request it. Lambda's mechanism is push-based and pre-populated: AWS injects the function's execution role's temporary credentials directly into the execution environment as environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) before the function code even starts running, with no network call needed to fetch them at all.

## Detailed Explanation

**EC2's IMDS**: an HTTP metadata service reachable only from within the instance (a link-local address, `169.254.169.254`), which any process on that instance can query to retrieve the instance profile's current temporary credentials — this is a pull model: nothing is automatically provided to a process unless it actively makes the HTTP request. This also means IMDS access itself is a real security consideration (IMDSv2's session-oriented, token-based design specifically hardens against SSRF-style attacks that could otherwise trick a vulnerable application into fetching credentials on an attacker's behalf) — the network-accessible nature of the mechanism is exactly what creates that specific class of risk, distinct from Lambda's approach.

**Lambda's mechanism**: AWS's own Lambda service infrastructure (not something the function's code or a network call reaches out to at invocation time) provisions the execution environment with the function's role's temporary credentials already populated as environment variables before the handler code runs at all — a push model, where the credentials are simply *there* in the environment, no request needed. This structurally avoids the SSRF-style IMDS-credential-theft risk entirely, since there's no network endpoint an attacker-influenced request could be tricked into querying — the credentials are already local to the process's own environment variables, not fetched over a network path that could be manipulated.

**Refresh behavior differs too**: IMDS-delivered credentials are periodically refreshed by the instance's underlying infrastructure, and a long-running process needs to either re-query IMDS periodically (most AWS SDKs handle this automatically) or handle credential expiration explicitly. Lambda's environment-variable credentials are tied to that specific execution environment's lifecycle — a fresh or reused execution environment gets credentials appropriate to its current invocation context, managed by the Lambda service itself rather than requiring the function code to handle refresh logic directly.

**Practical security implication**: Lambda's push-based, no-network-call mechanism structurally eliminates an entire class of credential-theft risk (SSRF-triggered IMDS queries) that EC2's pull-based, network-reachable IMDS has to specifically defend against via IMDSv2 hardening — a genuine architectural difference in the credential-delivery mechanism, not just a cosmetic API difference.

## Key Takeaways

- EC2's IMDS is a pull-based, network-accessible HTTP endpoint that processes actively query to fetch and refresh credentials.
- Lambda's mechanism is push-based — credentials are pre-populated as environment variables before the function code runs, with no network call needed.
- This difference has real security implications: IMDS's network-reachability creates an SSRF-based credential-theft risk that IMDSv2 specifically hardens against, a risk Lambda's mechanism structurally avoids.
- Credential refresh is handled differently too — IMDS requires periodic re-querying (usually automatic via SDKs); Lambda's environment-variable credentials are scoped to the execution environment's own lifecycle, managed by the Lambda service.

## Interview Follow-Up Questions

- How does IMDSv2's token-based session model specifically prevent the SSRF-based credential theft that IMDSv1 was vulnerable to?
- How would you verify whether an EC2 instance in your account is still using the less-secure IMDSv1?
- How does ECS's task metadata endpoint mechanism compare to both of these?

## References

- [AWS: Instance metadata and user data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html)
- [AWS: Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
