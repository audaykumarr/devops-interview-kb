---
id: azure-storage-soft-delete-versioning-recovery-confusion-001
title: "A blob was accidentally overwritten with bad data, not deleted. Both soft delete and versioning are enabled on the account. Why doesn't 'undelete' bring back the good version, and what actually will?"
category: azure
subcategory: storage
technologies:
  - azure
  - blob-storage
difficulty: intermediate
question_type:
  - troubleshooting
  - practical
tags:
  - azure
  - blob-storage
  - soft-delete
  - versioning
  - data-recovery
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A blob was accidentally overwritten with bad data — not deleted, overwritten. The storage account has both soft delete and blob versioning enabled, and someone tries to "undelete" the blob to recover the good data, but there's nothing to undelete because the blob still exists; it just has the wrong content now. How do you actually recover the good version, and why did the team's first instinct (undelete) not apply here?

## Short Answer

Soft delete and versioning protect against two different mistakes: soft delete recovers a blob that was *deleted*, while versioning preserves every prior *version* of a blob's content each time it's overwritten. An overwrite isn't a delete, so there's nothing for soft delete to undelete — the fix is retrieving the previous version of the blob (which versioning automatically preserved as a distinct, addressable version at the moment it was overwritten) and either promoting it or copying its content back.

## Detailed Explanation

The confusion comes from treating "soft delete and versioning" as one generic safety net, when they're actually two independent mechanisms that respond to two different kinds of mistakes — and only one of them applies to an overwrite.

## Symptoms

- The blob is present and accessible, just with incorrect content — there's no "deleted" state to recover from.
- Attempting to list or restore soft-deleted blobs in the container shows nothing relevant to this blob, since it was never deleted.
- The team's initial recovery attempt (looking for an undelete option) finds nothing applicable, causing confusion about whether the good data is recoverable at all.

## Possible Causes

- **The mental model conflates soft delete and versioning as one feature**, when soft delete specifically responds to deletion (the blob or a version of it being removed) and versioning specifically responds to overwrites (each write creating a new, retained version) — an overwrite triggers versioning's protection, not soft delete's.
- **Versioning is enabled but nobody previously verified it was actually capturing versions correctly** — worth confirming, though if versioning has been on since before the overwrite, the previous version should exist regardless.

## Investigation Steps

**List the blob's version history directly**, via the Portal's version list for that blob or `az storage blob list` with the `--include versions` flag — this shows every previous version, each independently addressable, including the one that existed immediately before the bad overwrite.

**Identify the correct version by its last-modified timestamp**, comparing against when the bad overwrite is known to have happened — the version immediately prior to that timestamp is the one to recover.

## Resolution

Restore the correct prior version by promoting it to be the current version (or by copying its content over the current blob, depending on the tooling used) — this is a version-restore operation, not an undelete operation, and it directly recovers the pre-overwrite content without needing soft delete to be involved at all.

## Prevention

Make sure the team's operational runbooks distinguish these two mechanisms explicitly — "accidentally deleted" points to soft delete recovery, "accidentally overwritten" points to version recovery — rather than treating "we have soft delete and versioning on, we're covered" as one undifferentiated safety net that gets reached for the wrong way during an actual incident.

## Key Takeaways

- Soft delete recovers from deletion; versioning recovers from overwrite — they respond to different mistakes and aren't interchangeable safety nets.
- An overwrite doesn't create anything for soft delete to act on, because the blob was never deleted — this is the source of the "nothing to undelete" confusion.
- Versioning automatically retains the prior version at the moment of an overwrite, addressable independently of the current version, which is exactly what makes recovery from an overwrite possible.
- Recovery runbooks should explicitly distinguish "deleted" versus "overwritten" scenarios, since reaching for the wrong recovery mechanism costs time during an actual incident.

## Interview Follow-Up Questions

- How would you design a lifecycle policy that manages the growth of retained old versions without risking deleting a version you might still need?
- What would you do if versioning had only been enabled *after* the bad overwrite happened?
- How would you build alerting that catches an unexpected overwrite quickly, rather than relying on someone noticing bad data later?

## References

- [Azure Blob Storage: Blob versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview)
- [Azure Blob Storage: Soft delete for blobs](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview)
