---
id: gcp-iam-organization-policy-vs-iam-001
title: "A project has correct IAM roles, but you still need to guarantee no VM ever gets a public IP — is that an IAM problem, or something else?"
category: gcp
subcategory: iam
technologies:
  - gcp
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - gcp
  - iam
  - organization-policy
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You want a hard guarantee that no Compute Engine VM in an entire GCP organization can ever be assigned a public IP address, regardless of who's creating it or what IAM permissions they hold. Is IAM the right tool for this, or does GCP have a separate mechanism specifically for this kind of guarantee?

## Short Answer

This is what Organization Policy (the Resource Manager's constraint system) is for, not IAM — IAM answers "who can do what," while Organization Policy answers "what's allowed to happen at all, regardless of who's doing it." Even a user or service account with full `compute.instanceAdmin` permissions can be blocked from assigning a public IP if an Organization Policy constraint (`compute.vmExternalIpAccess`) disallows it — the two systems operate at genuinely different layers and answer different questions.

## Detailed Explanation

**IAM controls permission; Organization Policy controls what's structurally allowed**: IAM's entire model is "does this principal have permission to perform this action" — it says nothing about restricting the action itself for *everyone*, regardless of their individual permissions. A user with `compute.instanceAdmin` genuinely has permission to create VMs with public IPs, as far as IAM is concerned — Organization Policy is the separate layer that can override this by disallowing the action outright, org-wide, independent of anyone's individual IAM grants.

**Organization Policy constraints apply at the organization, folder, or project level, and inherit down the resource hierarchy**: setting `compute.vmExternalIpAccess` to deny at the organization level means every project underneath it inherits that restriction by default — this hierarchical application is what makes it suitable for genuinely org-wide guarantees, rather than needing to configure the same restriction project by project.

**This is conceptually similar to the relationship between RBAC and Pod Security Standards in Kubernetes**: RBAC answers "who can create this kind of resource," while Pod Security Standards answer "what configurations are allowed to exist at all, regardless of who's creating them" — Organization Policy plays the same structural role relative to IAM that Pod Security Standards play relative to RBAC, even though the underlying technologies are unrelated.

**Common Organization Policy constraints address exactly this class of "no exception, regardless of permissions" requirement**: disallowing public IPs on VMs, requiring OS Login instead of metadata-based SSH keys, restricting which regions resources can be created in, disallowing service account key creation entirely — these are all cases where the actual requirement is "this must never happen, period," which IAM alone structurally cannot express, since IAM's model is fundamentally permission-based, not prohibition-based.

**Both systems should be used together, each for what it's actually good at**: IAM for legitimate, fine-grained access control (who can do what within the boundaries Organization Policy allows), and Organization Policy for hard, org-wide guarantees that hold regardless of any individual's IAM permissions — treating IAM alone as sufficient for a "this must never happen" requirement misses the layer specifically designed for that guarantee.

## Key Takeaways

- IAM answers "who can do what"; Organization Policy answers "what's allowed to happen at all," independent of anyone's individual permissions.
- A user with full permission to perform an action via IAM can still be blocked by an Organization Policy constraint disallowing that action org-wide.
- Organization Policy constraints inherit down the resource hierarchy (organization → folder → project), making them suitable for genuinely org-wide guarantees without per-project configuration.
- This plays a similar structural role to Kubernetes' Pod Security Standards relative to RBAC — a separate "what's allowed to exist" layer beneath "who can create it."

## Interview Follow-Up Questions

- How would you audit an organization to find which Organization Policy constraints are currently set, and which important ones might be missing?
- What would you do if a specific project has a legitimate, reviewed need for an exception to an org-wide Organization Policy constraint?
- How does Organization Policy interact with Terraform-managed infrastructure — would a Terraform apply attempting to violate a constraint fail, and at what point?

## References

- [Google Cloud: Organization Policy Service overview](https://cloud.google.com/resource-manager/docs/organization-policy/overview)
- [Google Cloud: Organization policy constraints](https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints)
