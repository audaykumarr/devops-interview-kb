---
id: gcp-iam-leaked-service-account-key-response-001
title: "A GCP service account key was accidentally committed to a public repository — walk through your incident response, GCP-specific steps included."
category: gcp
subcategory: iam
technologies:
  - gcp
difficulty: advanced
question_type:
  - scenario
  - security
tags:
  - gcp
  - iam
  - incident-response
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A developer accidentally commits a downloaded GCP service account JSON key to a public GitHub repository. It's discovered within a few hours, but the exposure window is real. Walk through your incident response — what's genuinely GCP-specific here, beyond the generic "rotate the credential" playbook?

## Short Answer

Beyond the generic response (revoke, investigate exposure, prevent recurrence), the GCP-specific steps are: immediately disable (not just plan to rotate) the specific key ID via `gcloud iam service-accounts keys disable`, check Cloud Audit Logs for any activity from that service account during the exposure window (which directly shows whether it was actually used, not just exposed), and review exactly what IAM roles were bound to that service account, since GCP service accounts commonly accumulate broader project-level roles than the specific task ever needed — meaning the real exposure could be broader than "this one credential leaked."

## Detailed Explanation

A service account key, once created, has no built-in way to prove or disprove misuse without checking activity records — the investigation has to actively determine whether it was actually used, not just assume based on how quickly it was caught.

## Symptoms

- A GCP service account JSON key file is found in a public repository (via secret-scanning, a security researcher report, or internal discovery).
- The exposure duration (from commit to discovery) is known but the actual usage during that window is not yet known.
- The service account's actual granted permissions may not be immediately clear without checking.

## Possible Causes

- A developer downloaded a service account key for local testing/development convenience and accidentally committed it alongside other code.
- No secret-scanning pre-commit hook or CI check was in place to catch this before the push reached a public repository.
- The service account itself may have been granted broader roles than strictly necessary, common when roles are assigned pragmatically ("just give it Editor so it works") rather than deliberately scoped.

## Investigation Steps

**Disable the specific key ID immediately — don't wait to plan a full rotation first**: `gcloud iam service-accounts keys disable <key-id> --iam-account=<sa-email>` (or delete it outright with `keys delete`) invalidates that specific key within moments — this is the single fastest, most direct containment action, and should happen before anything else in the investigation.

**Check Cloud Audit Logs for actual activity from this service account during the exposure window**: Cloud Audit Logs (specifically Admin Activity and Data Access logs, if Data Access logging was enabled for the relevant services) record every API call made using that service account's identity — filtering by the service account's email and the exposure timeframe directly reveals whether it was actually used by anyone other than its legitimate owners, which determines whether this is "credential exposed, no evidence of misuse" or "confirmed unauthorized access," a meaningfully different severity.

**Review exactly what IAM roles were bound to the service account**: `gcloud projects get-iam-policy <project> --flatten="bindings[].members" --filter="bindings.members:<sa-email>"` shows every role bound to it — if it was granted broad project-level roles (Editor, or even Owner) rather than narrowly scoped ones, the actual exposure is significantly worse than the incident might initially appear, since an attacker with that credential during the exposure window could have done far more than whatever the service account's intended narrow task was.

**Check whether other, similarly-scoped service accounts have the same pattern of broader-than-needed permissions**: this specific incident is worth using as a trigger to audit for the same root-cause pattern elsewhere (other service accounts also over-permissioned "for convenience"), rather than treating this as an isolated, one-off fix.

## Resolution

Disable/delete the leaked key immediately, confirm (via audit logs) whether any unauthorized activity actually occurred and respond accordingly if so (treating it as a broader compromise, not just a credential leak, if confirmed), and — going forward — migrate this service account's actual use case to Workload Identity or another key-less authentication mechanism where possible, since the underlying fix for "a key can be accidentally committed" is often "don't have a downloadable key file at all." Add secret-scanning to the CI/CD pipeline and pre-commit hooks specifically to catch this class of leak before it reaches a public repository in the future. Review and tighten the service account's granted roles to match its actual minimum necessary permissions.

## Key Takeaways

- Disable the specific key ID immediately via `gcloud iam service-accounts keys disable` — this is faster and more direct than planning a full rotation first.
- Cloud Audit Logs are the concrete source for determining whether the leaked key was actually used, not just exposed — this materially changes the incident's severity.
- Review the service account's actual granted IAM roles as part of the investigation — a leaked credential for an over-permissioned service account is a much bigger exposure than the leak itself might suggest.
- The long-term structural fix is migrating away from downloadable keys entirely (Workload Identity, or another key-less mechanism) rather than just rotating and hoping it doesn't happen again.

## Interview Follow-Up Questions

- How would you configure organization-wide policy to prevent service account key creation entirely, for organizations that want to enforce key-less authentication as a hard requirement?
- How would you audit an entire GCP organization to find every service account with an active downloadable key, as a proactive risk-reduction exercise?
- How would you design a pre-commit hook specifically to catch a GCP service account JSON key's distinctive format before it's ever committed?

## References

- [Google Cloud: Best practices for using service accounts](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Google Cloud: Cloud Audit Logs](https://cloud.google.com/logging/docs/audit)
