---
id: gcp-iam-auditing-owner-editor-grants-001
title: "How would you audit an entire GCP organization to find every principal holding Owner or Editor at the project level, before a security review?"
category: gcp
subcategory: iam
technologies:
  - gcp
difficulty: advanced
question_type:
  - practical
  - security
tags:
  - gcp
  - iam
  - auditing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A security review requires answering: "across our entire GCP organization (potentially hundreds of projects), which users and service accounts currently hold Owner or Editor at the project level?" Checking each project's IAM page individually doesn't scale. How would you actually produce this list?

## Short Answer

Use the Cloud Asset Inventory API's IAM policy search (`gcloud asset search-all-iam-policies`), which can query IAM bindings across an entire organization in one call, filtered to the specific basic roles you're looking for — this is purpose-built for exactly this kind of org-wide IAM audit, rather than iterating through hundreds of individual `gcloud projects get-iam-policy` calls.

## Detailed Explanation

Cloud Asset Inventory exists specifically to answer cross-resource, cross-project questions that would otherwise require enumerating every project individually — for an IAM audit spanning an entire organization, it's the tool built for exactly this use case rather than something you'd want to approximate with a manual loop.

**Use `gcloud asset search-all-iam-policies` scoped to the organization**: `gcloud asset search-all-iam-policies --scope=organizations/<org-id> --query="policy:roles/editor OR policy:roles/owner"` searches IAM policies across every project in the organization in a single call, returning exactly the bindings matching the specified roles — this is dramatically faster and more complete than iterating through projects individually, and less prone to accidentally missing a project.

**Cross-reference results against known-legitimate holders**: a raw list of every Owner/Editor grant isn't itself actionable without knowing which ones are expected (a small number of genuine project administrators) versus unexpected (a service account that accumulated broad access for convenience, a departed employee's account never cleaned up) — annotating the results against an expected-holders list turns the raw audit into a short, actionable list of genuine findings.

**Check specifically for service accounts among the results, not just human users**: service accounts holding broad basic roles are often a bigger practical risk than human users holding them, since a service account's credential (if key-based rather than Workload-Identity-based) can be exfiltrated and used without needing to compromise an actual person — flagging service-account-held basic roles for priority review is a reasonable triage heuristic.

**Check for basic roles inherited from the organization or folder level, not just directly granted at the project level**: IAM bindings at a higher level in the resource hierarchy (organization, folder) apply to every project underneath — a broad grant at the organization level can be a much larger, more consequential finding than any individual project-level grant, and needs to be checked separately from the project-level search.

**Build a remediation list, and re-run the audit periodically**: prioritize service accounts and any grants without a clear, current justification, and work with each resource's owning team to downgrade unnecessary Owner/Editor grants to appropriately-scoped predefined or custom roles. Re-running the same Cloud Asset Inventory query periodically (not just once) catches new basic-role grants as they're introduced over time, since this is exactly the kind of finding that re-accumulates if it's only ever addressed as a one-time cleanup.

## Key Takeaways

- `gcloud asset search-all-iam-policies` scoped to the organization is the purpose-built tool for this exact audit, far more efficient and complete than iterating through projects individually.
- Cross-reference raw results against known-legitimate holders to turn a long list into a short, actionable set of genuine findings.
- Service accounts holding broad basic roles are often a bigger practical risk than human users, since a leaked key-based credential can be used without compromising an actual person.
- Check for basic-role grants inherited from the organization or folder level separately, since these apply to every project underneath and can represent a much larger consequential finding than any single project-level grant.

## Interview Follow-Up Questions

- How would you turn this one-time audit into a continuously-running check that alerts on new Owner/Editor grants as they're created?
- How would you handle a legitimate business need for a specific service account to retain broad access, despite the audit flagging it?
- How would you extend this same Cloud Asset Inventory approach to also audit for overly-permissive custom roles, not just basic roles?

## References

- [Google Cloud: Cloud Asset Inventory — Search all IAM policies](https://cloud.google.com/asset-inventory/docs/searching-iam-policies)
