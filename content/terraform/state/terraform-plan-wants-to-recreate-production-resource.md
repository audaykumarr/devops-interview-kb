---
id: terraform-state-unexpected-recreate-001
title: "terraform plan shows a production RDS instance will be destroyed and recreated after a change you thought was trivial. What would you investigate before running apply?"
category: terraform
subcategory: state
technologies:
  - terraform
  - aws
difficulty: advanced
question_type:
  - troubleshooting
  - scenario
tags:
  - terraform
  - state
  - drift
  - production-safety
estimated_time_minutes: 10
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-19
last_updated: 2026-08-19
---

## Question

You change what looks like a minor attribute on a production RDS instance's Terraform resource block. `terraform plan` shows Terraform intends to destroy and recreate the instance (`-/+`), not update it in place. What would you investigate before running `apply`, and how would you avoid the outage?

## Short Answer

Never trust "it's probably fine" on a `-/+` plan against production — read the plan output carefully to see exactly which attribute is forcing replacement, check that attribute's `ForceNew` behavior in the provider docs, and if replacement really is unavoidable, plan an explicit migration path (e.g. a new resource stood up alongside the old one) rather than letting Terraform destroy the original first.

## Detailed Explanation

Terraform marks a resource for replacement (`-/+`) when a change touches an attribute that the provider has defined as requiring a new resource (`ForceNew` in provider SDK terms) rather than being updatable in place via the cloud API. For RDS, common triggers include changing the `identifier`, `engine`, in some cases `storage_type` transitions, or moving between certain instance class families incompatible with in-place modification. The plan output explicitly annotates which attribute triggered it — Terraform prints `# forces replacement` next to the specific line — so the first step is always to read that annotation rather than assume you know which change caused it.

It's also worth checking whether the diff Terraform is showing is a *real* intended change at all, versus drift: if someone modified the resource outside Terraform (console click, another pipeline, a manual `aws rds modify-db-instance`), Terraform's plan is comparing the desired state in your `.tf` files against the *actual* state in AWS, and what looks like "I only changed X" might actually be Terraform now also reconciling an unrelated drifted attribute that happens to force replacement. Running `terraform plan` with `-refresh-only` first, or reviewing `terraform state show` for the resource, separates "what I intended to change" from "what's actually different."

If replacement genuinely is required by the provider, destroying-then-creating in place means downtime and, for a database, potential data loss unless a final snapshot and restore process is airtight. The safer pattern is `create_before_destroy` in the resource's lifecycle block where the provider supports it (so the new resource is provisioned before the old one is torn down), or more conservatively, standing up the replacement resource under a different Terraform resource address entirely, migrating data/traffic to it manually, and only then removing the old resource from state and configuration once the cutover is confirmed safe.

## Symptoms

- `terraform plan` shows `-/+` (destroy and recreate) instead of `~` (update in place) for a resource that was expected to change minimally.
- The plan is against a stateful, hard-to-recreate resource (database, persistent volume, load balancer with a fixed DNS-attached identity).
- The change that triggered it looked cosmetic or unrelated to anything that should require replacement.

## Possible Causes

- The changed attribute is genuinely `ForceNew` for this provider/resource (e.g. RDS `identifier`, or certain `engine`/`engine_version` combinations, or a change in `availability_zone` for non-Multi-AZ instances).
- Configuration drift: the real resource in AWS no longer matches Terraform's last-known state, and the plan is reconciling that drift, not just your intended edit.
- A provider version upgrade changed how an attribute is handled (some provider updates change whether an attribute is `ForceNew`).
- An unrelated dependency change (e.g. a parameter group, subnet group, or security group replacement) is cascading into forcing the dependent resource to be replaced too.

## Investigation Steps

1. Read the full `terraform plan` output, specifically the `# forces replacement` annotations, to identify the exact attribute responsible.
2. Check that attribute against the provider's resource documentation to confirm whether it's genuinely `ForceNew` or whether the diff is unexpected.
3. Run `terraform plan -refresh-only` to see if state has drifted from real infrastructure independent of your code change.
4. Run `terraform state show <resource_address>` and compare it against the AWS console/CLI (`aws rds describe-db-instances`) to confirm what Terraform currently believes vs. reality.
5. Check `git blame`/PR history on the resource block for anything that changed recently besides your own edit.
6. Check the provider changelog if a provider version bump happened recently alongside this plan.

## Commands

```bash
terraform plan -out=tfplan
terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions | contains(["delete","create"]))'
terraform plan -refresh-only
terraform state show 'aws_db_instance.main'
aws rds describe-db-instances --db-instance-identifier prod-app-db
```

## Resolution

If the replacement is truly unavoidable given the provider's constraints, do not let Terraform destroy-then-create blindly on a stateful production resource. Add `lifecycle { create_before_destroy = true }` where the provider allows it for that resource type, or perform a manual blue/green migration: define the new instance under a new resource address, provision it, migrate data (e.g. RDS snapshot restore or replication), cut connection strings over, verify, and only then remove the old resource from configuration and state. If the trigger turns out to be drift rather than an intended change, reconcile state first (`terraform apply -refresh-only` or correcting the out-of-band change) so the subsequent plan reflects only your real intended edit.

## Prevention

- Treat any `-/+` plan against a stateful production resource as a hard stop requiring manual review, not something to `apply` because CI is green.
- Use `terraform plan` output review (or a policy-as-code tool like Sentinel/OPA/Conftest) in CI to flag destroy actions on protected resource types before they reach a human approver.
- Enable deletion/replacement protection where the cloud provider supports it (e.g. RDS `deletion_protection = true`) as a hard backstop against an accidental apply.
- Avoid manual out-of-band changes to Terraform-managed resources; if one is unavoidable, immediately follow up with `terraform apply` or `import` to bring state back in sync.

## Interview Follow-Up Questions

- How does `create_before_destroy` interact with resources that have unique naming constraints, like a fixed `identifier`?
- How would you design a CI/CD pipeline to automatically block applies that would destroy a production database?
- What's the difference between state drift and a genuine configuration change, and how does `-refresh-only` help distinguish them?

## Key Takeaways

- `-/+` in a plan means the provider requires replacement for that attribute — always identify which attribute via the plan's own annotations.
- Distinguish intended changes from drift before trusting what a plan is telling you.
- For stateful resources, plan an explicit migration path rather than relying on Terraform's default destroy-then-create ordering.
- Provider-level protections (`deletion_protection`, `prevent_destroy`) are a necessary backstop, not a substitute for careful plan review.

## References

- [Terraform docs: Resource behavior (create_before_destroy)](https://developer.hashicorp.com/terraform/language/resources/behavior)
- [Terraform docs: The Meta-Argument lifecycle](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [AWS provider docs: aws_db_instance](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
