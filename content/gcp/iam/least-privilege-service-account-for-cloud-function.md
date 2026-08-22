---
id: gcp-iam-least-privilege-cloud-function-service-account-001
title: "How would you design least-privilege IAM for a Cloud Function that reads from Pub/Sub and writes to a specific Cloud Storage bucket?"
category: gcp
subcategory: iam
technologies:
  - gcp
difficulty: intermediate
question_type:
  - architecture
  - practical
tags:
  - gcp
  - iam
  - cloud-functions
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Cloud Function is triggered by Pub/Sub messages and writes processed results to a specific Cloud Storage bucket. By default, many teams just let it run as the project's default compute service account, which typically has broad Editor-equivalent access. How would you design this function's actual permissions to follow least privilege?

## Short Answer

Create a dedicated service account specifically for this function (not the shared default compute service account), grant it exactly `roles/storage.objectCreator` scoped to the one specific destination bucket (not project-wide Storage access), and rely on the Pub/Sub trigger's own invocation mechanism (which doesn't require the function's own service account to have broad Pub/Sub permissions, just enough to be invoked) — this gives the function precisely the two capabilities it actually needs, nothing more.

## Requirements

- The function must be able to write processed results to its specific destination bucket.
- The function should not have broad project-wide access to Cloud Storage, Pub/Sub, or any other service beyond what it actually uses.
- The function's permissions should be attributable specifically to it, not shared with other unrelated functions/workloads via a common default identity.

## Detailed Explanation

The default compute service account is a convenience default, not a least-privilege one — it typically holds Editor-equivalent access because it's designed to work for arbitrary workloads without per-workload configuration, which is precisely the opposite of what a specific, well-understood workload's permissions should look like.

## Architecture

**Create a dedicated service account for this specific function**: rather than the shared default compute service account (which, if broadly permissioned, is shared risk across every workload using it), a function-specific service account means this function's permissions are independently reasoned about, and a compromise of this function's credential doesn't inherit whatever broader access other workloads sharing the default account might have accumulated.

**Grant `roles/storage.objectCreator` scoped to the specific destination bucket, not project-wide**: binding this role at the individual bucket level (rather than at the project level, which would apply to every bucket in the project) means the function can create objects in exactly its intended destination and nowhere else — even if the function's credential were compromised, the resulting access is bounded to one bucket, not every Cloud Storage resource in the project.

**Use `objectCreator` specifically, not a broader storage role, since the function only writes**: `roles/storage.objectCreator` grants only the ability to create new objects — it doesn't grant read, list, delete, or modify capability on existing objects, which more closely matches "this function writes new processed results" than a broader role like `objectAdmin` would, if the function genuinely never needs to read or delete existing objects in that bucket.

**Pub/Sub trigger invocation doesn't require the function's own service account to hold broad Pub/Sub permissions**: the Pub/Sub-to-Cloud-Functions trigger mechanism operates via a separate invocation path (Pub/Sub's own service agent, granted permission to invoke the specific function) — the function's *own* runtime service account doesn't need `pubsub.subscriber` or similar broad Pub/Sub access just to be triggered by messages, which is a common point of confusion; only add explicit Pub/Sub permissions to the function's service account if its own code additionally needs to actively call the Pub/Sub API itself (publishing to another topic, for instance), not merely to receive its trigger.

## Trade-offs

Creating a dedicated service account per function (rather than reusing a shared default) adds a small amount of IAM object sprawl — more service accounts to track, name, and eventually clean up if the function is retired — compared to the convenience of one shared default identity. This is a worthwhile trade for any function handling meaningful data or with a non-trivial blast radius if compromised; for a genuinely trivial, throwaway function, the shared default's convenience might reasonably win out, though this should be a deliberate choice rather than an unexamined default.

## Key Takeaways

- Use a dedicated service account per function rather than the shared default compute service account, so this function's permissions are independently reasoned about and bounded.
- Scope the storage role to the specific destination bucket, not project-wide, so even a compromised credential's access is limited to that one bucket.
- Choose the narrowest role that matches actual behavior (`objectCreator` for write-only, not a broader admin role) rather than defaulting to something more permissive "to be safe."
- The Pub/Sub trigger mechanism doesn't require the function's own service account to hold broad Pub/Sub permissions just to be invoked — only add those if the function's code itself actively calls the Pub/Sub API.

## Interview Follow-Up Questions

- How would you audit an existing set of Cloud Functions to find which ones are still running as the shared default compute service account, as a remediation starting point?
- What would you do if the function occasionally needs to also read an existing object in the same bucket (say, to check if a result already exists) — how would that change the role choice?
- How would you design this same least-privilege pattern for a Cloud Run service instead of a Cloud Function, given they have somewhat different default-identity behavior?

## References

- [Google Cloud: Cloud Functions IAM and service accounts](https://cloud.google.com/functions/docs/securing/function-identity)
- [Google Cloud: IAM roles for Cloud Storage](https://cloud.google.com/storage/docs/access-control/iam-roles)
