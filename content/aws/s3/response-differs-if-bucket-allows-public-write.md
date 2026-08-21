---
id: aws-s3-public-write-exposure-response-difference-001
title: "How would your incident response differ if an exposed S3 bucket allowed public write access, not just public read?"
category: aws
subcategory: s3
technologies:
  - aws
  - s3
difficulty: advanced
question_type:
  - scenario
  - security
tags:
  - aws
  - s3
  - incident-response
  - security
estimated_time_minutes: 8
companies: []
related_questions:
  - aws-s3-public-bucket-exposure-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An S3 bucket was found publicly accessible. If it only allowed public *read*, the incident is about data exposure. If it also allowed public *write*, how does the response actually differ — what additional risks and investigation steps does write access introduce?

## Short Answer

Public write access turns a data-exposure incident into a potential data-integrity and supply-chain incident: anyone could have uploaded, overwritten, or deleted objects, so containment must happen before assuming anything about what's actually in the bucket right now, and the investigation must specifically check for unauthorized writes (new objects, modified objects, deleted objects) in addition to what was exposed to reads — including the possibility that something malicious was uploaded and is now being served or referenced elsewhere as if it were legitimate content.

## Detailed Explanation

A public-read-only exposure is fundamentally about confidentiality: the risk is entirely about what was already in the bucket becoming visible to unauthorized parties. The response focuses on determining what was exposed and to whom, and closing the access.

Public write access adds integrity and availability risks on top of that, each requiring its own investigation:

**Unauthorized uploads**: anyone could have written arbitrary objects into the bucket — potentially malicious content (malware, phishing pages, if the bucket serves web content) uploaded specifically to be distributed *as if* it were the legitimate owner's content. If the bucket backs a public website or CDN origin, this can mean actively serving attacker-controlled content to real users, which is a materially more urgent problem than data merely being readable.

**Unauthorized modification**: existing objects could have been overwritten with different content, silently — meaning content currently being served or consumed elsewhere may not be what the legitimate owner actually put there. This is particularly dangerous for anything consumed programmatically (a config file, a software artifact, a dependency) without an integrity check, since a tampered file might not be visually or functionally obvious as compromised.

**Unauthorized deletion**: objects could have been deleted outright — a data-loss risk on top of the exposure, not present at all in a read-only scenario, unless S3 Versioning was enabled (in which case deleted/overwritten objects may be recoverable from prior versions, which becomes a critical part of the response).

Given these additional risks, the response has to add specific steps beyond the read-only case: enumerate what's actually in the bucket *right now* against what's expected (looking for unexpected new objects or modified timestamps), check S3 Versioning/object history for evidence of overwrites or deletions if versioning is enabled, and — critically — treat anything currently being served from that bucket as untrusted until verified, rather than assuming existing content is still legitimate. If the bucket serves any content programmatically consumed by other systems, those systems need to be checked for having ingested anything malicious during the exposure window, not just the bucket itself.

## Key Takeaways

- Public write access adds integrity and availability risk on top of read access's confidentiality risk — three additional questions to answer: what was uploaded, what was modified, what was deleted.
- Content currently in the bucket must be treated as untrustworthy until verified, since it may have been tampered with or replaced during the exposure window.
- S3 Versioning, if enabled, becomes critical for recovering from unauthorized overwrites or deletions during the incident.
- Any system that programmatically consumes content from the bucket needs to be checked for having ingested something malicious during the exposure, not just the bucket itself.

## Interview Follow-Up Questions

- How would you determine, after the fact, exactly which objects were added, modified, or deleted during an exposure window if versioning wasn't enabled?
- What preventive controls (bucket policies, S3 Object Lock) would you put in place specifically to make this class of incident less damaging in the future?
- How would you decide whether to treat this as a supply-chain security incident requiring broader notification, versus a contained data-exposure issue?

## References

- [AWS: Using S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [AWS: Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
- [AWS: Amazon S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
