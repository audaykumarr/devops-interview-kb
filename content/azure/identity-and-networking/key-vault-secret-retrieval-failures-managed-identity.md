---
id: azure-identity-networking-key-vault-secret-retrieval-failure-001
title: "A Function App using Managed Identity to read a Key Vault secret works most of the time, but intermittently fails on startup with an authorization error. How do you actually diagnose this?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
  - key-vault
difficulty: advanced
question_type:
  - troubleshooting
  - security
tags:
  - azure
  - key-vault
  - managed-identity
  - troubleshooting
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A Function App is configured to read a secret from Key Vault using its system-assigned Managed Identity. It works correctly most of the time, but intermittently — especially right after a fresh deployment or a scale-out event — it fails on startup with an authorization error retrieving the secret. How do you diagnose this?

## Short Answer

The most common cause is a timing gap: the Managed Identity's role assignment (or access-policy grant) can take a short but non-zero amount of time to propagate after being created or after a new instance is provisioned, and if the app tries to read the secret before that propagation completes, the request is genuinely unauthorized at that exact moment — not misconfigured, just not-yet-effective. This shows up as intermittent because it depends on exact timing, not on anything different about the request itself.

## Detailed Explanation

This is a race condition between "identity and permission exist" and "the app's first attempt to use them," not a persistent configuration error — which is exactly why it's intermittent and why simply re-trying often appears to "fix" it without anyone understanding why.

## Symptoms

- Secret retrieval fails specifically on startup, with an authorization/forbidden-style error, not a not-found or network error.
- The failure is intermittent, correlating with fresh deployments, new instances from scale-out, or recent changes to the Managed Identity's role assignment — not with steady-state running instances.
- Retrying the same operation shortly after often succeeds without any configuration change in between.

## Possible Causes

- **Role assignment or access-policy propagation delay**: after granting a Managed Identity access to the Key Vault, that grant takes a short time to become effective across Azure AD; an app that attempts its first secret read immediately on cold start can race ahead of that propagation.
- **The Managed Identity itself not being fully provisioned yet** on a brand-new instance — system-assigned identities are created per-instance, and an app that reads secrets very early in its own startup sequence can attempt to acquire a token before the identity is fully ready.
- **A genuinely revoked or incorrect role assignment** — less likely given the intermittent, deployment-correlated pattern, but worth ruling out directly rather than assuming timing every time.

## Investigation Steps

**Check whether failures cluster specifically around deployment and scale-out events**, using Application Insights or the Function App's own logs correlated with deployment/scale timestamps — a tight correlation strongly supports the propagation-delay explanation over a persistent misconfiguration.

**Confirm the actual role assignment or access policy is correct and currently present**, via `az role assignment list` (for RBAC) or the vault's access policy list — this rules out "it's just wrong" before spending more time chasing a timing theory.

**Check the specific error detail returned by Key Vault**, not just the HTTP status — Key Vault's error responses distinguish between a genuinely missing permission and other authorization failure modes, which confirms whether this really is an authorization state issue rather than something else entirely (e.g., network/firewall rules blocking the request, which produces a different error shape).

## Resolution

Add retry logic with backoff around the Key Vault secret-retrieval call specifically at startup — most SDKs and the Key Vault client libraries support this directly — so a transient propagation-timing failure doesn't fail the entire app startup. This isn't papering over a bug; it's the correct response to a documented, expected propagation delay rather than a persistent error condition.

## Prevention

Treat "identity and permissions were just granted or a new instance was just provisioned" as a condition that needs retry resilience by default for any startup-time dependency on Key Vault (or any other Azure AD-authorized resource), rather than assuming the grant is immediately effective everywhere the moment it's created.

## Key Takeaways

- Role assignment and access-policy grants aren't instantaneous — there's a real propagation delay, and an app that reads secrets immediately on cold start can race ahead of it.
- This produces a distinctly intermittent pattern correlated with deployments and scale-out, not a persistent misconfiguration — which is the key diagnostic signal distinguishing it from a genuinely wrong permission.
- Retry-with-backoff around startup-time Key Vault calls is the correct, standard mitigation, not a workaround for a bug.
- Checking Key Vault's specific error detail (not just the status code) is what separates this diagnosis from other authorization-adjacent failures like network/firewall blocking.

## Interview Follow-Up Questions

- How would you design your app's startup sequence so a Key Vault dependency failure doesn't take down the entire application?
- What would change about this diagnosis if the identity were user-assigned rather than system-assigned?
- How would you distinguish this propagation-delay failure from a Key Vault firewall rule blocking the request, given both can produce an authorization-style error?

## References

- [Azure Key Vault: Managed identity authentication](https://learn.microsoft.com/en-us/azure/key-vault/general/authentication)
