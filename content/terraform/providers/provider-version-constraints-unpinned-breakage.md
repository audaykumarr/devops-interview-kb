---
id: terraform-providers-version-constraints-unpinned-breakage-001
title: "A Terraform pipeline that worked yesterday suddenly fails today with no code changes — how does an unpinned provider version cause this?"
category: terraform
subcategory: providers
technologies:
  - terraform
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - terraform
  - providers
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Terraform CI pipeline has been running the same configuration successfully for months. With no code change at all, a run suddenly fails — either `terraform plan` produces an unexpected diff, or `apply` fails outright with an error referencing a resource argument that used to work. What's the likely cause, and how does an unpinned or loosely-pinned provider version produce exactly this symptom?

## Short Answer

Without an explicit, narrow version constraint on the provider (or without a committed `.terraform.lock.hcl` file being honored), `terraform init` can pull a newer provider version than was used previously — a new provider version can introduce breaking changes (a renamed argument, a changed default, new validation) even without any change to your own `.tf` files, since the configuration is being evaluated against a different provider version than before, and the failure appears to come from nowhere specifically because nothing in your own code actually changed.

## Detailed Explanation

Terraform providers are versioned and released independently of your own configuration — a `required_providers` block without a narrow version constraint effectively says "any version is fine," which means the specific version used can silently drift upward across separate `terraform init` runs, especially if the lock file isn't being consistently committed and honored.

## Symptoms

- A Terraform pipeline that ran successfully previously suddenly fails, with no change to the `.tf` configuration files.
- The failure references a specific resource argument, attribute, or behavior that previously worked without issue.
- `terraform init` ran as part of the failing pipeline run (rather than reusing a previously-initialized working directory).

## Possible Causes

- `required_providers` has no version constraint at all, or a very loose one (like `>= 4.0`), allowing `terraform init` to pull the latest available version, which can be meaningfully newer than what was previously used.
- `.terraform.lock.hcl` (the dependency lock file, which pins exact provider versions/checksums) either doesn't exist, isn't committed to version control, or the CI pipeline's `terraform init` isn't actually honoring it (missing `-lockfile=readonly`, or the lock file wasn't checked out correctly).
- A CI runner or local environment's cached provider plugins were cleared/reset, forcing a fresh `terraform init` that pulls whatever the current latest matching version is, rather than reusing a previously-cached specific version.

## Investigation Steps

**Check the actual provider version used in the failing run versus a previous successful run**: Terraform's own output during `init` states the provider version it's installing — comparing this against the version used in the last known-good run (visible in that older run's own logs, if retained) directly confirms whether a version change is actually what happened.

**Check the `required_providers` version constraint's actual strictness**: reviewing the Terraform configuration's `required_providers` block for how narrowly (or loosely) the version is constrained reveals whether a newer version was ever actually preventable given the current constraint.

**Check whether `.terraform.lock.hcl` exists, is committed, and is actually being honored by the CI pipeline**: confirming the lock file's presence in version control, and that the pipeline's `terraform init` command doesn't skip or bypass it, identifies whether the lock file mechanism (specifically designed to prevent this exact problem) was actually in effect.

**Check the newer provider version's changelog for the specific breaking change**: once the version discrepancy is confirmed, the provider's own release notes/changelog for versions between the old and new pinned version usually documents the specific breaking change directly, confirming the root cause with certainty rather than just correlation.

## Resolution

Pin the provider to a specific, narrow version constraint (or rely on a correctly-committed and CI-honored lock file) going forward, and explicitly test and adopt newer provider versions as a deliberate, reviewed upgrade rather than allowing them to be silently pulled in — upgrading `required_providers`' constraint (and re-running `terraform init -upgrade` deliberately, reviewing the resulting plan) is the controlled way to move to a newer version when you're ready, rather than it happening as an unplanned surprise.

## Key Takeaways

- An unpinned or loosely-constrained provider version means `terraform init` can pull a meaningfully newer version than previously used, with no change to your own configuration files.
- `.terraform.lock.hcl`, when committed and honored by CI, pins exact provider versions/checksums specifically to prevent this class of silent drift.
- The symptom (a pipeline that "worked yesterday" suddenly failing with no code change) is a strong, specific signal pointing at a dependency-version change, not a code regression.
- Treat provider version upgrades as deliberate, reviewed changes (via `terraform init -upgrade` and reviewing the resulting plan) rather than something that happens implicitly.

## Interview Follow-Up Questions

- How would you set up a controlled process for periodically, deliberately upgrading provider versions rather than either pinning forever or allowing silent drift?
- What's the difference between the lock file's role and the `required_providers` version constraint's role, given both relate to provider versioning?
- How would you audit an existing set of Terraform configurations across many repositories to find ones with missing or overly loose provider version constraints?

## References

- [Terraform: Provider Requirements](https://developer.hashicorp.com/terraform/language/providers/requirements)
- [Terraform: Dependency Lock File](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
