---
id: gcp-cloud-functions-works-locally-fails-in-production-001
title: "A Cloud Function works perfectly with the Functions Framework locally but fails immediately in production — how do you systematically narrow down why?"
category: gcp
subcategory: cloud-functions
technologies:
  - gcp
  - cloud-functions
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - gcp
  - cloud-functions
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A developer runs a Cloud Function locally using the Functions Framework and everything works — the function correctly calls another GCP service and returns the expected result. After deploying, the exact same code fails immediately in production. What are the systematic categories of things that differ between local and deployed execution, and how would you narrow down which one is the actual cause?

## Short Answer

Local execution and deployed execution differ in at least three structural ways worth checking in order: authentication (locally you're likely using your own gcloud user credentials via Application Default Credentials, while in production the function runs as its configured service account, which may have different/insufficient permissions), environment variables/configuration (locally-set env vars or a local `.env` file may not be replicated in the deployed function's actual configuration), and networking (a local machine has different network reachability than the deployed function's execution environment, especially relevant if the function needs to reach something over a VPC or private IP).

## Detailed Explanation

"Works locally, fails in production" for a Cloud Function almost always traces back to one of a small number of environment differences between how the Functions Framework runs locally versus how the actual deployed function executes — narrowing down which category is responsible is more effective than guessing at the specific cause directly.

## Symptoms

- The function behaves correctly when run locally via the Functions Framework.
- The identical deployed code fails, typically with a permission error, a missing configuration error, or a connectivity failure.
- No code difference exists between the local and deployed versions.

## Possible Causes

- **Authentication**: locally, the Functions Framework typically uses Application Default Credentials derived from your own `gcloud auth application-default login` session (your personal user identity's permissions) — in production, the function runs as its configured service account, which may lack a permission your personal account happens to have.
- **Environment variables/configuration**: local development often relies on a `.env` file or manually-exported shell environment variables that were never actually configured as the function's deployed environment variables (`--set-env-vars` or equivalent), meaning a configuration value the code depends on is simply absent in production.
- **Networking**: if the function needs to reach a resource over a private IP/VPC (a Cloud SQL instance, an internal service), your local machine's network path to that resource (perhaps via a VPN, or simply because it's a different network entirely) doesn't reflect the deployed function's actual network reachability, which may require a VPC connector that isn't yet configured.

## Investigation Steps

**Check the exact error message and category first — it usually points directly at one of the three areas**: a permission-denied error points at authentication; a "variable not defined" or similar error points at environment configuration; a connection timeout or unreachable-host error points at networking — reading the specific error precisely, rather than assuming, narrows the investigation immediately.

**Compare the function's configured service account's actual IAM roles against what the local session's identity has**: `gcloud functions describe <name>` shows the configured service account; checking its IAM roles against what the code actually needs to do (and comparing against your own local user account's typically-broader permissions) often directly reveals a genuine permission gap.

**Compare the function's actual deployed environment variables against what local execution relies on**: `gcloud functions describe <name>` also shows configured environment variables — comparing this against the local `.env` file or shell exports the code depends on reveals any configuration that was never actually deployed alongside the code.

**Check whether the function needs VPC connectivity it doesn't currently have configured**: if the failure is network-related and the target resource is on a private IP, confirming whether a Serverless VPC Access connector is configured (and correctly targets the right VPC/subnet) identifies a missing networking prerequisite.

## Resolution

Fix follows directly from the identified category: grant the function's actual service account the specific missing IAM role if it's an authentication/permission gap; deploy the missing environment variables via `--set-env-vars` (or a proper secrets-management integration for sensitive values) if it's a configuration gap; add or correct a Serverless VPC Access connector if it's a networking gap. Confirm the fix by redeploying and testing the same operation that failed, rather than assuming the specific fix resolved it without re-testing.

## Key Takeaways

- "Works locally, fails in production" for Cloud Functions almost always traces to authentication, environment configuration, or networking differences between local and deployed execution.
- Local execution typically uses your own broader personal credentials via Application Default Credentials, while production runs as the function's own, often more narrowly-scoped, service account.
- Environment variables set locally (a `.env` file, shell exports) don't automatically carry over to the deployed function's configuration — they need to be explicitly deployed.
- Read the specific error message category first (permission, missing variable, connectivity) to immediately narrow which of the three areas to investigate.

## Interview Follow-Up Questions

- How would you set up local development to more closely mirror the function's actual production service account permissions, catching this class of gap before deployment?
- How would you manage environment variables and secrets consistently between local development and production deployment, without manually keeping them in sync?
- How would you test VPC connectivity locally before deploying, given your local machine's network path is fundamentally different from the deployed function's execution environment?

## References

- [Google Cloud: Functions Framework](https://cloud.google.com/functions/docs/functions-framework)
- [Google Cloud: Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
