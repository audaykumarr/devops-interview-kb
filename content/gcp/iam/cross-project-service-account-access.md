---
id: gcp-iam-cross-project-service-account-access-001
title: "A service account in Project A needs to read from a Cloud Storage bucket in Project B — how does IAM actually handle this cross-project access?"
category: gcp
subcategory: iam
technologies:
  - gcp
difficulty: intermediate
question_type:
  - practical
tags:
  - gcp
  - iam
  - cross-project
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A service account created in Project A needs read access to a Cloud Storage bucket that lives in Project B. Does the service account need to be recreated in Project B, or is there a way to grant an identity from one project access to a resource in another? How would you actually set this up?

## Short Answer

GCP service accounts are identities, not resources scoped to being usable only within their home project — a service account from Project A can be granted an IAM role directly on a resource in Project B (the bucket itself, or at the Project B level), the same way any other principal would be granted access. No recreation is needed; you grant the Project-A service account's email address a role binding on the Project-B resource.

## Detailed Explanation

**A service account's identity is global (identified by its email address), while its "home" project is just where it was created**: `my-sa@project-a.iam.gserviceaccount.com` is a valid principal identity usable anywhere in GCP, not just within Project A — IAM role bindings elsewhere reference it by this email address, regardless of which project the binding itself lives in.

**Granting cross-project access means adding an IAM binding in the target project (or on the specific resource) naming the source project's service account**: for the bucket-read example, granting `roles/storage.objectViewer` on the specific bucket in Project B, with the member being `serviceAccount:my-sa@project-a.iam.gserviceaccount.com`, is all that's needed — this can be done at the bucket level (most narrowly scoped) or at the Project B level (broader, applying to every resource of that type in the project), following the same principle of preferring the narrowest scope that satisfies the actual need.

**This pattern is extremely common in real multi-project GCP architectures**: organizations frequently use separate projects for different environments, teams, or purposes (a common GCP best practice, similar in spirit to AWS multi-account strategies), and cross-project service account access is the standard mechanism for controlled, deliberate access between them — rather than either consolidating everything into one project (losing the isolation benefits) or duplicating service accounts per project (losing the "one identity, clearly attributable" property).

**Resource-level bindings are generally preferable to project-level ones for cross-project access specifically**: granting access at the specific bucket (rather than "this service account can read all Cloud Storage buckets in Project B") keeps the cross-project grant narrowly scoped to exactly the resource that's actually needed — since cross-project access inherently crosses a trust/ownership boundary, being precise about scope matters even more here than for within-project grants.

**Auditing cross-project access requires checking from both directions**: understanding what access a specific service account has requires checking not just its home project's IAM policy, but every other project/resource where it might have been granted access — this is exactly the kind of question Cloud Asset Inventory's organization-wide search is built to answer, since a service-account-scoped view within just its home project wouldn't reveal grants made in other projects.

## Key Takeaways

- A service account's identity (its email address) is usable anywhere in GCP, not confined to its "home" project — no recreation is needed for cross-project access.
- Cross-project access is granted by adding an IAM binding in the target project (or on the specific resource) naming the source project's service account as the member.
- Prefer resource-level bindings (a specific bucket) over project-level ones for cross-project grants, keeping the scope as narrow as the actual need.
- Auditing a service account's full access picture requires checking beyond its home project, since grants can exist in any project — Cloud Asset Inventory's org-wide search is built for exactly this.

## Interview Follow-Up Questions

- How would you audit all the cross-project grants a specific service account currently has, across an entire organization?
- What's the security consideration of a service account from a less-trusted project (say, a shared development project) being granted access into a more sensitive production project?
- How would this pattern differ for a Shared VPC setup, where cross-project resource sharing has its own dedicated mechanism separate from ad hoc IAM bindings?

## References

- [Google Cloud: Service accounts](https://cloud.google.com/iam/docs/service-account-overview)
- [Google Cloud: Cloud Storage access control](https://cloud.google.com/storage/docs/access-control/iam)
