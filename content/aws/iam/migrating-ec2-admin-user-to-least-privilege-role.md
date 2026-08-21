---
id: aws-iam-least-privilege-migration-001
title: "You inherit an EC2 workload that authenticates to AWS using an IAM user with AdministratorAccess. How would you migrate it to least-privilege access without causing an outage?"
category: aws
subcategory: iam
technologies:
  - aws
  - iam
  - ec2
difficulty: advanced
question_type:
  - scenario
  - security
tags:
  - iam
  - least-privilege
  - security
  - credentials
  - migration
estimated_time_minutes: 12
companies: []
related_questions:
  - github-actions-security-oidc-migration-001
  - aws-iam-least-privilege-ecs-lambda-vs-ec2-001
  - aws-iam-third-party-app-static-keys-required-001
  - aws-iam-preventing-workload-iam-user-recurrence-001
status: published
last_reviewed: 2026-08-19
last_updated: 2026-08-19
---

## Question

You inherit an EC2 workload that authenticates to AWS using long-lived access keys belonging to an IAM user with `AdministratorAccess` attached directly. The application is in active production use. How would you migrate it to a least-privilege model without causing downtime, and what would you do differently going forward?

## Short Answer

Move the workload off the IAM user entirely and onto an EC2 instance profile (an IAM role attached to the instance), scoped to only the actions and resources the application actually calls. Do this in parallel with the existing credentials still active, verify the new path works under real traffic, then revoke the IAM user's keys — never delete the user's access before the new path is proven.

## Detailed Explanation

The core problem isn't just that permissions are too broad — it's that the workload depends on long-lived, exportable credentials (access key + secret) that can leak via logs, source control, or a compromised host and keep working indefinitely. An IAM role attached to an EC2 instance profile solves both problems at once: the temporary credentials are scoped to the instance's lifecycle, auto-rotate, and never need to be stored anywhere.

The migration itself should never be a single cutover. Discover the actual permission footprint first — CloudTrail history and IAM Access Analyzer's policy generation feature can reconstruct which API calls the application actually makes over a representative window (ideally covering peak traffic and any batch/cron jobs, not just steady-state). Draft a role and policy from that footprint, attach the role to the instance (or an Auto Scaling launch template), and let the application's SDK pick it up automatically via the instance metadata service — the AWS SDK checks for instance profile credentials without any code change if the IAM user's keys aren't hardcoded as environment variables that take precedence.

Run both credential paths side by side: keep the IAM user active, add the role, and confirm in application logs or CloudTrail that calls are now coming from the role's assumed identity rather than the IAM user. Only after a full business cycle (including any weekly/monthly jobs) shows zero calls from the old user do you deactivate its keys — deactivate first, not delete, so you can instantly roll back if something surfaces. Delete the user only after a further quiet period.

## Real-World Approach

1. Pull 30–90 days of CloudTrail events filtered to the IAM user's ARN to build a complete list of API calls and resources touched.
2. Use IAM Access Analyzer's "generate policy based on access activity" to draft a starting policy, then manually tighten wildcards (e.g. replace `s3:*` on `*` with the specific actions and bucket ARNs actually used).
3. Create the IAM role with that policy, plus a trust policy scoping `sts:AssumeRole` to the EC2 service principal.
4. Attach the role via an instance profile; if using an Auto Scaling group, update the launch template so new instances pick it up automatically.
5. Remove any hardcoded `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` environment variables or credentials files on the instance — their presence overrides the instance profile in the SDK's credential chain.
6. Monitor CloudTrail for `userIdentity.arn` on subsequent calls to confirm they're coming from the assumed role, not the old user.
7. Deactivate (not delete) the IAM user's access keys once confirmed idle.
8. After a further observation window with no errors, delete the unused IAM user and its keys.
9. Add a CloudTrail-based alert (e.g. via EventBridge) for any future IAM user creation with directly attached admin policies, to catch regression.

## Example

A minimal least-privilege policy for an app that only reads from one S3 bucket and writes CloudWatch metrics, replacing a blanket `AdministratorAccess`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::app-input-bucket",
        "arn:aws:s3:::app-input-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["cloudwatch:PutMetricData"],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "cloudwatch:namespace": "MyApp" }
      }
    }
  ]
}
```

## Common Mistakes

- Deleting or disabling the old IAM user's keys before confirming the new role path handles every code path, including rarely-run batch jobs.
- Attaching `AdministratorAccess` to the new role "temporarily to get it working" and never tightening it afterward.
- Forgetting that hardcoded credentials in environment variables or `~/.aws/credentials` on the instance take precedence over the instance profile, so the migration silently doesn't take effect.
- Scoping the policy from a short observation window that misses monthly or quarterly jobs, causing a production failure weeks later.
- Not scoping the trust policy, so any EC2 instance in the account (not just the intended one) could assume the role.

## Interview Follow-Up Questions

- How would this approach differ if the workload ran on ECS or Lambda instead of EC2?
- How would you handle a third-party application that only supports static access keys and can't use instance profiles?
- How would you prevent this situation (a workload built directly on an IAM user) from happening again organizationally?

## Key Takeaways

- Prefer roles and temporary credentials over long-lived IAM user keys for anything running on AWS compute.
- Migrate credentials in parallel and verify before revoking — never cut over blind.
- Use CloudTrail and IAM Access Analyzer to derive real least-privilege policies instead of guessing.
- Deactivate before deleting, and always leave a rollback window.

## References

- [AWS IAM: IAM roles for Amazon EC2](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html)
- [AWS IAM Access Analyzer: Generate policies based on access activity](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html)
- [AWS: Best practices for IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
