---
id: gcp-iam-basic-roles-vs-predefined-vs-custom-001
title: "Why is granting a GCP Editor or Owner basic role considered dangerous, and how do predefined and custom roles fix that?"
category: gcp
subcategory: iam
technologies:
  - gcp
difficulty: beginner
question_type:
  - conceptual
  - security
tags:
  - gcp
  - iam
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

GCP IAM has three tiers of roles: basic (Owner, Editor, Viewer), predefined, and custom. A new team member asks why not just grant "Editor" to everything and move on, since it clearly grants enough access to get work done. Why is that specifically discouraged, and what do predefined and custom roles offer instead?

## Short Answer

Basic roles are extremely broad by design — "Editor" grants create/modify/delete permissions across nearly every resource type in the entire project, far beyond what almost any specific task actually needs, making it the IAM equivalent of AWS's `AdministratorAccess` for anything short of true administrative need. Predefined roles (like `roles/storage.objectViewer`) are scoped to a specific service and a specific level of access within it, and custom roles let you assemble an even more precisely-scoped permission set — both give you the ability to actually practice least privilege, which basic roles structurally can't provide.

## Detailed Explanation

**Basic roles predate GCP's more granular IAM model and were never designed for least-privilege use**: Owner, Editor, and Viewer are broad, project-wide roles spanning virtually every GCP service — Editor alone grants the ability to create, modify, and delete resources across compute, storage, networking, and most other services simultaneously, which is almost never what a specific task, service account, or team member actually needs.

**A compromised credential with Editor access has an enormous blast radius**: if a service account or user with Editor access is compromised (a leaked key, a phished credential), the attacker inherits broad create/modify/delete capability across nearly the entire project — this is exactly the scenario least-privilege design exists to limit, and basic roles structurally prevent limiting it.

**Predefined roles scope access to a specific service and a specific capability level within it**: `roles/storage.objectViewer` grants read-only access to Cloud Storage objects specifically — nothing else. GCP ships hundreds of predefined roles across its services, each scoped to a coherent, specific set of permissions for a specific use case, which is almost always a closer match to what a real task actually needs than a basic role.

**Custom roles let you assemble an even more precise permission set when predefined roles don't fit exactly**: for a case where even the narrowest applicable predefined role still grants more than genuinely needed (or doesn't quite match a specific unusual requirement), a custom role lets you hand-pick the exact permissions to include — this is more maintenance overhead (a custom role needs to be actively maintained as GCP's permission model evolves) but gives maximum precision when it's genuinely warranted.

**The practical guidance is a hierarchy of preference, not an absolute rule**: prefer predefined roles as the default (they're maintained by Google, updated as services evolve, and cover the large majority of real use cases), reach for custom roles specifically when a predefined role doesn't fit precisely enough, and reserve basic roles (especially Owner/Editor) for genuinely broad administrative needs — a human administrator managing the whole project, not a service account performing one specific task.

## Key Takeaways

- Basic roles (especially Editor) grant extremely broad, project-wide access spanning nearly every service — far beyond what almost any specific task needs.
- A compromised credential with Editor access has a correspondingly enormous blast radius, which is exactly what least-privilege design exists to limit.
- Predefined roles scope access to a specific service and capability level, and are Google-maintained, making them the right default choice for most real use cases.
- Custom roles offer maximum precision when even the narrowest predefined role doesn't fit exactly, at the cost of needing to be actively maintained yourself.

## Interview Follow-Up Questions

- How would you audit an existing GCP project to find every principal (user or service account) currently granted a basic role, as a first step toward tightening it?
- What's the maintenance risk of a custom role, given GCP's own predefined roles are automatically updated as services evolve but custom roles are not?
- How would you design the migration from a service account with Editor access down to a properly-scoped predefined or custom role, without breaking its existing functionality?

## References

- [Google Cloud: Understanding roles](https://cloud.google.com/iam/docs/understanding-roles)
- [Google Cloud: Best practices for using and managing service accounts](https://cloud.google.com/iam/docs/best-practices-service-accounts)
