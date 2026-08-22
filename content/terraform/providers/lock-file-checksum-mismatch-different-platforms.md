---
id: terraform-providers-lock-file-checksum-mismatch-platforms-001
title: "terraform init fails with a provider checksum mismatch after a teammate on a different OS committed the lock file — what's happening?"
category: terraform
subcategory: providers
technologies:
  - terraform
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - terraform
  - dependency-lock-file
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A teammate on macOS ran `terraform init` and committed the resulting `.terraform.lock.hcl` update. A CI pipeline running on Linux then fails `terraform init` with a checksum mismatch error for the same provider version. Both are using the exact same provider version number — why would the checksum differ, and how do you fix this correctly?

## Short Answer

Provider checksums in `.terraform.lock.hcl` are recorded per-platform, and by default `terraform init` only records checksums for the platform it's actually running on — a lock file updated on macOS only has macOS checksums unless explicitly generated otherwise, so a Linux CI runner has no matching entry to verify against, even for the identical provider version. Fix it by regenerating the lock file with `terraform providers lock -platform=<each-needed-platform>` for every platform your team and CI actually use.

## Detailed Explanation

Provider checksums in the lock file are platform-specific by default unless explicitly configured otherwise — `.terraform.lock.hcl` only records checksums for the platform(s) it's actually been generated for, and if the macOS run only recorded macOS-specific checksums, a Linux `terraform init` has no matching checksum for the Linux binary it needs to verify, producing exactly this mismatch/missing-checksum error.

## Symptoms

- `terraform init` fails on CI (or any platform different from whoever last updated the lock file) with a checksum verification error for a specific provider.
- The provider version referenced is identical between the working and failing environments.
- The lock file was recently updated by someone on a different operating system than where the failure occurs.

## Possible Causes

- The lock file was generated (or updated) by running `terraform init` on a single platform (macOS, in this example) without the `-platform` flag ensuring checksums for other needed platforms (like Linux, for CI) were also included.
- The lock file genuinely only contains checksums for the platform(s) present when it was last written, and a new platform trying to use it has no matching entry to verify against.

## Investigation Steps

**Inspect the actual `.terraform.lock.hcl` file's recorded platforms for the affected provider**: the lock file's `h1:` hash entries are recorded per-platform — checking which platforms are actually present for the specific provider in question directly confirms whether Linux (or whatever the failing platform is) is simply missing from the recorded set.

**Confirm the failure is genuinely a missing/mismatched checksum, not an actual provider version discrepancy**: reading the specific error message carefully distinguishes "no checksum recorded for this platform" from "checksum recorded but doesn't match" — both point to the same underlying multi-platform lock-file gap, but the exact wording confirms which specific situation you're in.

**Check how the lock file was most recently generated/updated**: reviewing whether `terraform init` was run with `-platform=linux_amd64 -platform=darwin_amd64` (explicitly requesting checksums for multiple platforms) or just run plainly (recording checksums only for the local platform) explains why the gap exists.

## Resolution

Regenerate the lock file explicitly including every platform your team and CI actually need: `terraform providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64` (adjusted to your team's actual mix of local development OSes and CI runner platform) produces a lock file with checksums for all of them, resolving the gap for whichever platform was previously missing. Commit this updated lock file, and establish the convention (documented, or enforced via a pre-commit/CI check) that any future lock file update should be generated with the full set of needed platforms, not just whatever platform the person happened to be using at the time.

## Key Takeaways

- The dependency lock file's provider checksums are platform-specific — a lock file generated on one platform doesn't automatically include valid checksums for a different platform's provider binary.
- This produces a genuine, common friction point when local development (often macOS) and CI (often Linux) differ, and someone updates the lock file without accounting for both.
- `terraform providers lock -platform=<platform>` (repeated per needed platform) generates a lock file including checksums for every platform your team actually uses.
- Establish a team convention (or automated check) ensuring lock file updates always include the full set of needed platforms, not just the updater's own.

## Interview Follow-Up Questions

- How would you set up a CI check that automatically verifies the lock file includes checksums for every platform your team and pipelines actually use?
- What's the security purpose the checksum verification itself serves, beyond just being an inconvenience to work around?
- How would you handle a team with genuinely diverse local development platforms (some on macOS Intel, some Apple Silicon, some Linux, some Windows) keeping the lock file correctly comprehensive?

## References

- [Terraform: Dependency Lock File](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform: providers lock command](https://developer.hashicorp.com/terraform/cli/commands/providers/lock)
