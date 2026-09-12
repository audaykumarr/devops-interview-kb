---
id: azure-identity-networking-key-vault-rotation-design-001
title: "How would you design secret rotation for a live, high-traffic application backed by Key Vault, so rotating a credential never causes a production outage?"
category: azure
subcategory: identity-and-networking
technologies:
  - azure
  - key-vault
difficulty: expert
question_type:
  - architecture
  - security
tags:
  - azure
  - key-vault
  - secret-rotation
  - architecture
  - security
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A high-traffic production application depends on a database credential stored in Key Vault. Security policy requires regular rotation, but a previous rotation caused a brief outage because the app kept using its cached, now-invalid credential until it was manually restarted. How would you design rotation so this genuinely never happens again — not just "restart faster next time"?

## Short Answer

Design the application to actively refresh its credential from Key Vault on a schedule shorter than the rotation interval, rather than caching it indefinitely, and use Key Vault's event notifications (via Event Grid) to trigger an immediate refresh the moment a new secret version becomes current — combined with the target system (the database) briefly accepting both the old and new credential during a defined overlap window, so an app instance that hasn't refreshed yet doesn't fail mid-rotation.

## Detailed Explanation

The previous outage happened because the application treated the credential as effectively static after first reading it — the actual fix is architectural, not operational: nothing about restarting faster addresses the underlying assumption that caused the outage in the first place.

## Requirements

- Rotating a secret must never cause a request to fail due to the application using a stale, already-invalidated credential.
- The rotation process itself should require no manual, synchronous coordination step (like restarting every instance) to take effect.
- The design must account for multiple application instances that won't all refresh at exactly the same moment.
- Rotation should be auditable — clear evidence of when a rotation happened and that every instance successfully picked it up.

## Architecture

**The application actively pulls its credential on a refresh interval shorter than the rotation cadence**, rather than reading it once at startup and caching indefinitely — this alone bounds the maximum staleness window to something known and small, instead of "until the process happens to restart."

**Key Vault event notifications, delivered via Event Grid, push a signal the moment a new secret version becomes the current one**, letting the application refresh immediately rather than waiting for its next polling interval — this shrinks the staleness window further for the common case, while the polling refresh remains the fallback for any instance that misses the event.

**The target system accepts both the old and new credential simultaneously during a defined overlap window** — for a database, this typically means both the old and new credential/user remain valid until every application instance has confirmed it's using the new one, at which point the old credential is fully retired. This is the piece that actually eliminates the outage risk: even an instance that hasn't refreshed yet keeps working correctly during the overlap, rather than failing the instant rotation happens.

**Where the target service supports it, use Key Vault's built-in rotation policy** to automate generating the new secret version on schedule, rather than relying on a manual or externally-scripted rotation trigger — reducing the chance of rotation being skipped or done inconsistently.

## Trade-offs

- Active polling plus event-driven refresh is more application complexity than "read once at startup," but it's what actually removes the staleness risk rather than just narrowing it.
- An overlap window where two credentials are simultaneously valid is a deliberate, temporary widening of the credential surface — it needs to be genuinely temporary and monitored closed, not left open indefinitely.
- Event Grid adds an operational dependency (subscription health, delivery reliability) — the polling refresh must remain as a fallback specifically because event delivery isn't guaranteed to be instantaneous or lossless.

## Key Takeaways

- The root cause of the original outage was the application caching a credential indefinitely, not the rotation process itself — the fix has to be in the application's refresh behavior, not in how carefully rotation is scheduled.
- Combining scheduled polling (a bounded worst case) with event-driven refresh (a fast common case) covers both the reliable and the fast path without depending on either alone.
- An overlap window where the target system accepts both old and new credentials is what actually makes rotation safe for instances that haven't refreshed yet — without it, even a fast refresh design still has a race window.
- Key Vault's built-in rotation policy (where supported) reduces the chance of rotation itself being inconsistent or skipped, but doesn't replace the application-side refresh design.

## Interview Follow-Up Questions

- How would you monitor and alert on an application instance that's fallen behind on refreshing its credential, before the old credential is retired?
- How would this design change for a credential type that doesn't support an overlap window at the target system (e.g., a single API key with no old/new coexistence)?
- What would you do differently if the application couldn't be modified to support active refresh at all?

## References

- [Azure Key Vault: Configure key rotation](https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation)
- [Azure Key Vault: Event Grid integration](https://learn.microsoft.com/en-us/azure/key-vault/general/event-grid-overview)
