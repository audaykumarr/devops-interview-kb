---
id: gcp-storage-signed-url-expiration-revocation-limits-001
title: "A signed URL was accidentally shared publicly — can you revoke it before it expires, and how would you design around this risk?"
category: gcp
subcategory: storage
technologies:
  - gcp
  - cloud-storage
difficulty: advanced
question_type:
  - security
  - scenario
tags:
  - gcp
  - cloud-storage
  - signed-urls
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A signed URL generated with a 7-day expiration was accidentally posted somewhere publicly visible, then removed within an hour — but the URL itself remains technically valid until its original expiration. Can you actually revoke that specific signed URL early, and how would you design your signed-URL usage to make this kind of incident less damaging in the future?

## Short Answer

There's no direct, per-URL revocation mechanism for a signed URL — it remains valid until its expiration timestamp, full stop, unless you take a broader action like rotating the signing key/service account credentials (which invalidates every signed URL ever generated with that key, not just the one you want to revoke) or deleting/moving the underlying object entirely. The actual mitigation is designing for this limitation upfront: use the shortest expiration that's actually practical for the use case, since a short-lived URL naturally bounds the damage of an accidental leak far more effectively than trying to react after the fact.

## Detailed Explanation

**Signed URLs are self-contained, cryptographically-verified grants, not references to a revocable server-side permission**: the URL itself encodes the authorization (a signature computed from the request parameters and an expiration, signed by a private key) — the storage service verifies this signature and expiration on each access attempt, but there's no server-side "list of currently valid signed URLs" to remove an entry from, since the validity is entirely self-contained in the URL's own cryptographic signature.

**Rotating the signing credential invalidates every signed URL generated with it, not just the one you want to revoke**: if the URL was signed using a service account's key, revoking or rotating that key does invalidate the leaked URL — but it also invalidates every *other* still-valid signed URL that was generated using that same key, which is a blunt, broad instrument with real collateral impact on legitimate, currently-active URLs, not a targeted fix.

**Deleting or moving the underlying object is a more targeted, if still blunt, option**: since a signed URL grants access to a specific object at a specific path, deleting that object (or moving it to a different path) makes the leaked URL non-functional, since there's nothing left at the path it points to — this works specifically when the object itself isn't still needed at that exact path for legitimate purposes, which limits when it's actually a viable option.

**The real mitigation is minimizing expiration duration as a matter of default practice, not reacting after a leak**: since there's no clean way to revoke an individual signed URL, the actual risk-reduction lever is generating URLs with the shortest expiration that's genuinely practical for the use case — a URL meant for immediate one-time download might reasonably expire in minutes, not days; a 7-day expiration should be reserved for cases that genuinely need that duration, not used as a default convenience.

**Consider whether signed URLs are even the right mechanism for the specific use case, versus IAM-based access with a short-lived token**: for internal/authenticated use cases (not genuinely needing to share access with an anonymous external party), authenticated access via IAM (potentially combined with short-lived credentials) avoids the signed-URL revocation limitation entirely, since IAM-based access can be revoked immediately by removing the binding — signed URLs are specifically valuable for the case of granting access to someone without a GCP identity at all, and shouldn't be reached for by default when that's not actually the requirement.

## Key Takeaways

- There's no direct per-URL revocation mechanism for a signed URL — it remains valid until its expiration, full stop.
- Rotating the signing credential invalidates every signed URL generated with it, not just the leaked one — a blunt instrument with real collateral impact.
- Deleting/moving the underlying object is a more targeted option, but only viable if the object isn't still needed at that path for legitimate access.
- The real mitigation is minimizing expiration duration by default, since a short-lived URL naturally bounds leak damage far more effectively than any after-the-fact reaction.

## Interview Follow-Up Questions

- How would you design an application's signed-URL generation to default to the shortest practical expiration for each specific use case, rather than one blanket long default everywhere?
- What monitoring would you put in place to detect unusually long-expiration signed URLs being generated, as an early warning before a leak happens?
- How would you decide between a signed URL and IAM-based access with a short-lived token, for a specific new feature needing to share Cloud Storage access?

## References

- [Google Cloud: Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
