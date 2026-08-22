---
id: terraform-providers-state-lock-acquisition-failure-001
title: "terraform plan fails with Error acquiring the state lock — how do you diagnose whether it's a genuine concurrent run or a stale lock?"
category: terraform
subcategory: providers
technologies:
  - terraform
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - terraform
  - state-locking
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Running `terraform plan` fails immediately with "Error acquiring the state lock," referencing a lock ID and who supposedly holds it. This could mean a genuine concurrent Terraform run is actually in progress, or it could mean a previous run crashed/was killed without releasing its lock, leaving a stale lock behind. How do you tell which, and how do you actually proceed?

## Short Answer

The error message itself includes who created the lock and when — check whether that corresponds to a run that's genuinely still in progress (a CI pipeline currently executing, a teammate who confirms they're actively running Terraform right now) versus a run that ended (crashed, was killed, or the CI job finished/failed) without properly releasing the lock. Only force-unlock (`terraform force-unlock <lock-id>`) after confirming no genuine concurrent operation is actually still running — force-unlocking while a real concurrent run is active risks state corruption from two processes writing simultaneously, which is exactly what locking exists to prevent.

## Detailed Explanation

State locking exists specifically to prevent two concurrent Terraform operations from modifying the same state simultaneously, which could otherwise corrupt it — the lock error is the mechanism working correctly; the diagnostic question is whether it's protecting against a genuine current operation or blocking on a lock nobody's still using.

## Symptoms

- `terraform plan` or `apply` immediately fails with "Error acquiring the state lock."
- The error message includes lock metadata: who created it, when, and typically the operation type.
- No obvious indication from the error alone whether the lock-holding process is still actually running.

## Possible Causes

- A genuine concurrent Terraform operation is actively running (a CI pipeline mid-execution, a teammate running Terraform locally right now) and legitimately holds the lock.
- A previous Terraform run was killed, crashed, or lost network connectivity mid-operation without going through its normal cleanup, leaving a stale lock that nothing will ever release on its own.
- A CI pipeline job was cancelled or timed out mid-Terraform-operation, leaving a lock behind from a run that's no longer actually executing.

## Investigation Steps

**Read the lock error's own metadata carefully**: the error output includes the lock ID, the identity/info of who created it (often including a hostname or CI job identifier), and the timestamp — this is the starting point for determining whether it corresponds to something still plausibly running.

**Check whether the identified CI pipeline run (if the lock holder looks like a CI job) is actually still executing**: checking the CI system directly (is that specific pipeline run still shown as in-progress, or has it already completed/failed/been cancelled) is a direct, reliable way to confirm whether the lock's creator is genuinely still active.

**Check with the identified individual if the lock holder appears to be a person running locally**: if the lock metadata suggests a specific teammate's local run, directly asking them (rather than assuming) confirms whether they're still actively running something.

**Check how long ago the lock was created relative to how long a normal operation takes**: a lock that's hours old, when a normal `plan`/`apply` for this configuration typically takes minutes, is a strong (though not certain on its own) signal the lock is stale rather than protecting a genuinely still-running operation.

## Resolution

If the lock is confirmed stale (the creating process genuinely isn't running anymore), use `terraform force-unlock <lock-id>` to manually clear it, then proceed with the intended operation. If there's any doubt about whether a genuine concurrent operation might still be active, wait and re-check rather than force-unlocking — the cost of waiting a few extra minutes is far lower than the cost of state corruption from two concurrent writes. After resolving, consider why the lock became stale in the first place (a CI pipeline timeout without cleanup, network instability) and whether a structural fix (better CI job cleanup handling, more reliable network path to the state backend) would prevent recurrence.

## Key Takeaways

- The lock error's own metadata (who created it, when) is the starting point for determining whether it's protecting a genuine concurrent operation or is stale.
- Confirm directly (checking the CI system, asking a teammate) rather than assuming — force-unlocking while a genuine concurrent operation is still running risks real state corruption.
- A lock's age relative to how long a normal operation typically takes is a useful, though not definitive, signal for staleness.
- After resolving a stale lock, investigate why it became stale (CI timeout, network issue) to prevent the same situation recurring.

## Interview Follow-Up Questions

- How would you design CI pipeline job configuration to more reliably release the state lock even if the job is cancelled or times out?
- What's the actual mechanism behind state locking for a specific backend (like DynamoDB for an S3 backend), and how does `force-unlock` interact with it?
- How would you build monitoring/alerting specifically for a state lock that's been held unusually long, to catch this proactively rather than discovering it via a failed plan?

## References

- [Terraform: State Locking](https://developer.hashicorp.com/terraform/language/state/locking)
- [Terraform: force-unlock command](https://developer.hashicorp.com/terraform/cli/commands/force-unlock)
