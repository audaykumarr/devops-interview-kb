---
id: azure-storage-sas-vs-managed-identity-001
title: "An app authenticates to Blob Storage using a long-lived SAS token embedded in configuration. Why move it to Managed Identity, and what does a SAS actually give up that Managed Identity doesn't?"
category: azure
subcategory: storage
technologies:
  - azure
  - blob-storage
difficulty: intermediate
question_type:
  - security
  - comparison
tags:
  - azure
  - blob-storage
  - sas
  - managed-identity
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

An internal application authenticates to a Blob Storage container using a SAS token that's embedded in its configuration and rarely rotated. Why would you move it to Managed Identity instead, and — if SAS has to stay for some reason — what specifically makes a SAS token safer or less safe than people usually assume?

## Short Answer

Managed Identity removes the credential entirely — there's no token to leak, copy, or forget to rotate, since Azure AD issues short-lived tokens automatically tied to the resource's own identity. A SAS token is a long-lived, exportable credential that grants access to anyone who has it, and while most SAS tokens can't be individually revoked before they expire, an *account* or *service* SAS issued against a stored access policy can be — a distinction most teams don't realize matters until they actually need to revoke one.

## Detailed Explanation

The real trade-off isn't "SAS is insecure" — SAS is a legitimate, scoped credential mechanism — it's that a SAS token inherits all the operational risk of any long-lived secret (it can be copied into logs, committed to a repo, or simply outlive its intended purpose), while Managed Identity has no equivalent secret to mishandle in the first place.

**Managed Identity issues short-lived Azure AD tokens automatically**, tied to the identity of the resource itself (a Function App, a VM, an App Service) rather than to a credential someone has to generate, distribute, and rotate. There's structurally nothing to leak, because there's no long-lived secret in the flow at all.

**A SAS token is a self-contained credential**: anyone who has the URL has the access it grants, for as long as it's valid, regardless of who they are. Most SAS tokens are generated on the fly and simply expire — there's no way to revoke one early before its expiration.

**The exception most people miss**: a SAS tied to a stored access policy on the container can be revoked or have its permissions changed after the fact, by modifying or deleting the stored access policy — the SAS itself references the policy rather than encoding its permissions independently. A SAS generated without a stored access policy has no such escape hatch; rotating the storage account's own access keys is the only way to invalidate it, which also invalidates every other SAS issued from those keys.

## Key Takeaways

- Managed Identity has no long-lived secret to leak in the first place — Azure AD issues short-lived tokens automatically tied to the resource's own identity.
- A SAS token is a portable, self-contained credential — whoever has it has the access it grants, for as long as it's valid.
- A SAS tied to a stored access policy can be revoked or modified after issuance; a SAS generated independently of one cannot be individually revoked before it expires.
- Prefer Managed Identity for anything running on Azure compute; reserve SAS tokens for cases with no identity to attach to (an external partner, a client-side upload), and use a stored access policy specifically so revocation stays possible.

## Interview Follow-Up Questions

- How would you migrate an existing application from SAS-based access to Managed Identity with minimal downtime?
- What would you do if a SAS token without a stored access policy was accidentally leaked publicly?
- How would you design access for a genuinely external, non-Azure client that can't use Managed Identity at all?

## References

- [Azure Storage: Grant limited access with SAS](https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview)
- [Azure Storage: Authorize access with Managed Identity](https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-managed-identity)
