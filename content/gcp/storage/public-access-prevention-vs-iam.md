---
id: gcp-storage-public-access-prevention-vs-iam-001
title: "A bucket scan flags a bucket as publicly readable, but Public Access Prevention shows as enabled — how is that possible, and how do you investigate it?"
category: gcp
subcategory: storage
technologies:
  - gcp
  - cloud-storage
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - gcp
  - cloud-storage
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A third-party security scanner reports a Cloud Storage bucket as publicly readable. When you check the bucket's settings, Public Access Prevention shows as "enforced." These two facts seem contradictory. How is this possible, and how would you investigate the actual discrepancy?

## Short Answer

Public Access Prevention only became enforced at some point — it doesn't retroactively audit whether the scanner's finding predates that setting being enabled, and more importantly, Public Access Prevention specifically blocks *new* public IAM bindings from being effective, but if it was enabled at the *bucket* level rather than the *project/organization* level, and the scanner is actually checking a different bucket, or checking via a mechanism Public Access Prevention doesn't cover (a signed URL, which grants time-limited access independent of IAM bindings entirely), the two findings can both be true simultaneously without contradiction.

## Detailed Explanation

Public Access Prevention's actual guarantee is narrower than "this bucket can never be accessed by the public under any circumstance" — understanding its precise scope is what resolves the apparent contradiction, rather than assuming the setting means something broader than it actually does.

## Symptoms

- A security scan reports public read access to a specific bucket.
- The bucket's own settings show Public Access Prevention as enforced.
- The two findings appear to directly contradict each other.

## Possible Causes

- The scanner's finding is stale, reflecting a state from before Public Access Prevention was enabled on this bucket, and hasn't been re-verified since.
- The scanner and the bucket check are actually referring to different buckets (a naming confusion, or a bucket that was deleted and recreated with the same name but different settings).
- A signed URL is providing the actual public access the scanner detected — Public Access Prevention blocks public *IAM bindings* (`allUsers`/`allAuthenticatedUsers`), but has no effect on signed URLs, which grant time-limited access to a specific object independent of IAM entirely; a signed URL with a long expiration, shared or leaked, produces genuinely public access that Public Access Prevention structurally cannot prevent.
- Public Access Prevention was enabled at the bucket level, but the scanner detected access via a different path (a Cloud CDN configuration fronting the bucket, or a different access mechanism not directly gated by the bucket's own IAM/PAP settings).

## Investigation Steps

**Confirm the scanner's finding with a direct, fresh access attempt**: attempting to access the specific object/bucket URL the scanner flagged, right now, confirms whether the access genuinely still exists — this rules out a stale finding as the explanation before investigating further.

**Check for the possibility of a signed URL being the actual access path**: if genuine current public access is confirmed, checking whether the access is happening via a signed URL (which wouldn't be visible in the bucket's IAM policy at all, since it's not an IAM-based grant) explains a real access path that Public Access Prevention doesn't cover — this requires checking application code/logs for where a signed URL might have been generated and potentially leaked or shared beyond its intended recipient.

**Verify Public Access Prevention's actual enforcement level and when it was enabled**: `gcloud storage buckets describe gs://<bucket> --format="default(public_access_prevention)"` confirms current enforcement, and checking Cloud Audit Logs for when this setting was last changed reveals whether it's been enforced for the entire relevant period, or was only recently enabled (meaning the scanner's finding could predate it).

**Check whether the scanner and your own check are genuinely referencing the identical bucket**: confirming the exact bucket name and project match between the scanner's report and what you're checking rules out a simple identification mismatch.

## Resolution

If the access is via a signed URL, the fix is addressing that specific URL (understanding its expiration, and if it represents an unintended over-broad or long-lived grant, revoking the associated service account key or otherwise invalidating it, since signed URLs generally can't be individually revoked before their expiration without broader action) — and considering whether shorter-lived signed URLs or a different sharing mechanism would reduce this risk going forward. If it's a stale finding, confirm with the scanning tool that a re-scan reflects current state. If it's a genuine gap in Public Access Prevention's coverage for this specific access path, document that gap explicitly rather than assuming the setting provides a broader guarantee than it does.

## Key Takeaways

- Public Access Prevention specifically blocks public IAM bindings (`allUsers`/`allAuthenticatedUsers`) — it has no effect on signed URLs, which are a genuinely separate access mechanism.
- A stale scanner finding (predating when Public Access Prevention was enabled) can produce an apparent contradiction that a fresh, direct access check resolves.
- Understanding the precise scope of a security control (what it does and doesn't cover) is necessary to correctly interpret two seemingly-contradictory findings, rather than assuming one must be wrong.
- Signed URLs generally can't be individually revoked before their configured expiration — this is a real limitation worth designing around (short expirations, careful generation/sharing practices) since it's exactly the kind of access Public Access Prevention doesn't protect against.

## Interview Follow-Up Questions

- How would you design an alerting system specifically to catch signed URLs with unusually long expiration times being generated, as a proactive risk-reduction measure?
- How would you audit which application code paths in your organization generate signed URLs, to understand this access pattern's actual usage?
- What's the equivalent AWS S3 concept to a signed URL, and does it have the same early-revocation limitation?

## References

- [Google Cloud: Public access prevention](https://cloud.google.com/storage/docs/public-access-prevention)
- [Google Cloud: Signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls)
