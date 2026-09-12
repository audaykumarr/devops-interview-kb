---
id: azure-storage-immutable-storage-legal-hold-vs-retention-001
title: "A compliance requirement says certain records must be provably unmodifiable for seven years. How would you design this with Blob Storage's immutability features, and what breaks if you choose the wrong policy type?"
category: azure
subcategory: storage
technologies:
  - azure
  - blob-storage
difficulty: advanced
question_type:
  - architecture
  - security
tags:
  - azure
  - blob-storage
  - immutability
  - compliance
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A compliance requirement states that certain records must be provably unmodifiable and undeletable — not even by an administrator — for seven years. How would you design this using Blob Storage's immutability features, and what goes wrong if the team picks the wrong policy type for how this data actually needs to be managed?

## Short Answer

Use a time-based retention immutability policy for data with a known, fixed retention period, which locks the policy so that not even the storage account owner can shorten it or delete the data before it expires — this is what satisfies "provably unmodifiable for seven years." Legal hold is a different tool for indefinite, event-driven retention (like active litigation) with no fixed expiration, and applying it instead of a time-based policy means the data stays locked until someone explicitly removes the hold — which is the wrong shape for a requirement that has a known, fixed end date.

## Detailed Explanation

Both mechanisms make data immutable, but they answer different questions: "until this specific date" versus "until someone says this specific condition is over" — picking the one that doesn't match the actual retention requirement causes real operational problems later, even though both look identical at the moment of applying them.

## Requirements

- Data must be genuinely unmodifiable and undeletable for the full required period, including being protected against an administrator's own actions.
- The retention behavior must match the actual shape of the requirement — a fixed, known duration versus an indefinite, condition-based hold.
- The policy needs to be provably locked in a way that satisfies an auditor, not just configured as a soft convention.

## Architecture

**Time-based retention policies** are configured with a specific retention period and, once locked, cannot be shortened or removed before that period elapses — including by the storage account owner. This is the correct mechanism for a requirement like "retain for seven years," since the retention period is known upfront and the policy's own locked state is exactly what makes it provable to an auditor.

**Legal hold policies** have no fixed expiration — they keep data immutable indefinitely until someone with the right permissions explicitly removes the hold, which is the correct shape for retention tied to an ongoing condition (active litigation, an open investigation) rather than a known duration. Applying a legal hold to data with a known seven-year requirement means the data doesn't automatically become deletable after seven years — it stays locked until a person remembers to remove the hold, which is an operational liability, not a compliance feature.

**Both can be applied at the container level (version-level immutability) or, in some configurations, more granularly**, and once a time-based policy is locked, it genuinely cannot be shortened — an organization that locks a policy for the wrong duration has created data it's now unable to delete on the schedule it actually wanted.

## Trade-offs

- Time-based retention is the right fit for known, fixed-duration compliance requirements, but locking it is a one-way door in the shortening direction — get the duration right before locking, since the whole point is that it can't be walked back.
- Legal hold is flexible for open-ended, condition-based retention, but that flexibility becomes a liability if used for a requirement that actually has a known end date — the data won't age out on its own.
- Neither mechanism protects against data simply never being retained correctly in the first place — the policy has to be applied at (or before) the point the data is written, not retrofitted after the fact for data that needs day-one protection.

## Key Takeaways

- Time-based retention fits a known, fixed duration and is what an auditor expects for "retained for exactly N years" requirements — its locked state is the actual proof.
- Legal hold fits indefinite, condition-based retention and has no built-in expiration — using it for a fixed-duration requirement leaves data locked indefinitely until someone remembers to intervene.
- A locked time-based policy cannot be shortened, including by the account owner — getting the duration right before locking matters because the mechanism's whole value is that it can't be walked back.
- The right mechanism depends on whether the retention requirement has a known end date or is tied to an ongoing condition — not on which one seems "more secure" in the abstract.

## Interview Follow-Up Questions

- How would you handle a situation where a locked time-based retention policy turns out to have been set for the wrong duration?
- How would you design a system that applies immutability policies automatically at write time, rather than depending on someone remembering to apply them?
- What would you do if a legal hold needs to be applied to data that's already under an active time-based retention policy?

## References

- [Azure Blob Storage: Immutable storage for blob data](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
