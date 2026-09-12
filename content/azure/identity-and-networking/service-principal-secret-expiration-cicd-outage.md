---
id: azure-identity-networking-service-principal-secret-expiration-001
title: "A CI/CD pipeline that's deployed successfully for two years suddenly fails every run overnight, with no recent pipeline or code changes. How do you diagnose it, and prevent it happening silently again?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
difficulty: intermediate
question_type:
  - troubleshooting
  - scenario
  - security
tags:
  - azure
  - service-principal
  - cicd
  - authentication
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A CI/CD pipeline authenticating to Azure with a service principal's client secret has worked reliably for two years. Overnight, every run starts failing at the authentication step — no pipeline configuration changed, no code changed, nobody touched the service principal recently as far as anyone can tell. How do you diagnose this, and how do you make sure it can't take everyone by surprise like this again?

## Short Answer

The most likely cause is simply that the service principal's client secret expired — secrets are created with a fixed expiration (commonly one or two years), and unlike a password someone forgets to rotate, an expired secret doesn't give any advance warning inside the pipeline itself, it just starts failing the moment the expiration timestamp passes. The durable fix isn't only generating a new secret — it's moving off long-lived secrets entirely where possible (Workload Identity Federation, or Managed Identity if the workload can use one) or, at minimum, adding proactive expiration monitoring so this is never discovered by a failed pipeline again.

## Detailed Explanation

This is a scheduled, predictable event dressed up as a surprise — the secret's expiration date was set the moment it was created, but with nothing watching for it, the first anyone learns about it is the pipeline failing in production.

## Symptoms

- Every pipeline run fails specifically at the Azure authentication step, with an error indicating invalid or expired credentials.
- No configuration, code, or permissions were recently changed as far as the team can determine.
- The failure is total and sudden — not intermittent or partial — consistent with a hard expiration boundary rather than a gradual degradation.

## Possible Causes

- **The service principal's client secret reached its expiration date.** Secrets are created with an explicit expiration (often defaulting to one or two years out), and there's no built-in in-pipeline warning as that date approaches — the credential simply stops being valid.
- **A certificate-based credential expired**, if the service principal uses certificate authentication instead of a secret — same underlying issue, different credential type.
- **Less likely given the "worked for two years, suddenly total failure" pattern, but worth ruling out**: a Conditional Access policy change or a Azure AD tenant-level security change — these tend to produce a different, more immediate correlation with a known change, which the team has already said didn't happen.

## Investigation Steps

**Check the service principal's credential expiration date directly** — via the Azure Portal's App registrations blade or `az ad app credential list` — this is the fastest, most direct confirmation and should be checked first given how well it matches the symptom pattern.

**Confirm the failure timestamp aligns with the credential's expiration timestamp** — an exact or near-exact match is strong confirmation; a mismatch would point investigation elsewhere (Conditional Access, a tenant policy change, or something else entirely).

**Check whether any monitoring or alerting existed for this credential's expiration at all** — the honest answer here is usually no, which is itself the actual finding worth fixing, independent of resolving today's immediate outage.

## Resolution

Generate a new client secret (or certificate) for the service principal, update the pipeline's stored credential, and verify a run succeeds. This restores service immediately but doesn't address why nobody saw it coming.

## Prevention

Move the pipeline's authentication to Workload Identity Federation if the CI/CD platform supports it (GitHub Actions, GitLab, and similar platforms can issue an OIDC token per run, which Azure AD exchanges for short-lived credentials) — this removes the long-lived secret from the equation entirely, closing off this exact failure mode for good rather than just extending the expiration date further out. Where Workload Identity Federation isn't an option, set an explicit expiration-monitoring alert well ahead of the credential's actual expiration date, so rotation happens on a planned schedule instead of being discovered via a failed production pipeline.

## Key Takeaways

- A service principal's client secret (or certificate) has a hard expiration date, and there's no in-pipeline warning as it approaches — it simply stops working the moment it expires.
- The sudden, total, "nothing changed" failure pattern is a strong, specific signal pointing at expiration rather than a configuration or policy change.
- Workload Identity Federation removes the long-lived secret from CI/CD authentication entirely, which is a more durable fix than rotating to a new secret with the same expiration problem waiting further down the road.
- Where a long-lived secret can't be avoided, proactive expiration monitoring is the actual fix for "we didn't see it coming" — not just resolving today's specific outage.

## Interview Follow-Up Questions

- How would you migrate an existing secret-based CI/CD pipeline to Workload Identity Federation without a coordinated cutover outage?
- What would you monitor to catch a service principal credential approaching expiration weeks in advance, across an organization with many pipelines?
- How would this diagnosis differ if the pipeline had been failing intermittently for a week beforehand instead of failing suddenly and totally?

## References

- [Microsoft Entra ID: Workload identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
