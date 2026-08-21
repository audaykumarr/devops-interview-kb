---
id: aws-iam-least-privilege-ecs-lambda-vs-ec2-001
title: "How does the approach to workload identity and least privilege differ if a workload runs on ECS or Lambda instead of EC2?"
category: aws
subcategory: iam
technologies:
  - aws
  - ecs
  - lambda
difficulty: intermediate
question_type:
  - comparison
  - conceptual
tags:
  - aws
  - iam
  - ecs
  - lambda
  - least-privilege
estimated_time_minutes: 7
companies: []
related_questions:
  - aws-iam-least-privilege-migration-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The pattern for giving an EC2 workload least-privilege access is an IAM role attached via an instance profile. How does the equivalent look for a workload running on ECS or on Lambda instead — are the mechanics the same, or fundamentally different?

## Short Answer

The underlying principle is identical (attach a scoped IAM role to the compute, never long-lived credentials), but the mechanism differs per service: EC2 uses an instance profile providing credentials to everything running on that instance via the metadata service; ECS uses a **task role** scoped to an individual task definition, so different services on the same cluster can have different, narrower permissions than an instance-wide EC2 role would allow; Lambda uses an **execution role** attached directly to the function, with credentials delivered automatically to the function's environment, no metadata-service call needed at all.

## Detailed Explanation

**EC2**: an instance profile wraps an IAM role and is attached to the whole EC2 instance. Every process running on that instance can retrieve the role's temporary credentials via the instance metadata service (IMDS). This is coarse-grained by nature — if multiple applications or services run on the same instance, they all share the same role's permissions, which is exactly the kind of over-broad access the original least-privilege migration scenario was trying to move away from.

**ECS**: a task role is attached at the level of an individual ECS task definition, not the underlying EC2 instance (or Fargate compute) it runs on. This is meaningfully more granular — two different services running as separate ECS tasks on the same cluster (or even the same EC2 instance, in EC2-launch-type ECS) can have entirely different task roles with different permissions, since credentials are delivered per-task via a task-specific metadata endpoint rather than the instance-wide one. This directly solves the "everything on this instance shares one role" problem EC2 instance profiles have.

**Lambda**: an execution role is attached directly to the function resource itself. AWS handles credential delivery automatically to the function's runtime environment (via environment variables populated at invocation), with no metadata-service polling needed — the mechanism is simpler because Lambda's execution model (one function, one clear identity) doesn't have the "multiple things sharing one host" ambiguity EC2 does. Each Lambda function gets exactly the permissions its own execution role grants, naturally aligned with least privilege at the function level.

The common thread across all three: none of them should ever involve a static IAM user's access keys embedded in code or config — the mechanism for delivering temporary, automatically-rotated credentials differs by compute type, but the underlying pattern (scoped role, no long-lived keys) is the same goal expressed through each service's own credential-delivery mechanism. Migrating a workload from EC2 to ECS or Lambda is actually an opportunity to get *more* granular than an EC2 instance profile typically allowed, not just a mechanical swap.

## Key Takeaways

- The core pattern (attach a scoped role, avoid long-lived credentials) is identical across EC2, ECS, and Lambda — only the delivery mechanism differs.
- ECS task roles are more granular than EC2 instance profiles, since they scope to an individual task rather than the whole instance.
- Lambda execution roles are the simplest case, since one function has one clear identity with no "shared host" ambiguity.
- Migrating from EC2 to ECS or Lambda is a chance to tighten permissions further, not just replicate the EC2-level role.

## Interview Follow-Up Questions

- How would you audit whether an ECS task role or Lambda execution role is actually scoped tightly, versus just copy-pasted from a broader existing role?
- What's the mechanism difference between how EC2's IMDS delivers credentials versus how Lambda delivers them to a function's environment?
- How would this comparison extend to a workload running on EKS, where pod identity is yet another mechanism (IRSA or Pod Identity)?

## References

- [AWS: IAM roles for Amazon ECS tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- [AWS: Lambda execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [AWS: IAM roles for Amazon EC2](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html)
