---
id: gcp-interview-guide
title: "GCP Interview Guide"
description: "A focused path through GCP interview prep — IAM, Cloud Storage, and Cloud Functions, the areas this question bank actually covers in depth."
guide_type: interview
category: gcp
categories:
  - gcp
technologies:
  - gcp
  - cloud-functions
  - cloud-storage
  - cloud-run
  - gke
  - pubsub
interview_levels:
  - junior-devops
  - devops-engineer
  - senior-devops
  - cloud-engineer
  - devsecops
  - staff-principal
estimated_reading_minutes: 9
featured_questions:
  - gcp-iam-least-privilege-cloud-function-service-account-001
  - gcp-iam-auditing-owner-editor-grants-001
  - gcp-iam-leaked-service-account-key-response-001
  - gcp-storage-cors-misconfiguration-browser-upload-failure-001
  - gcp-storage-lifecycle-rules-cost-optimization-001
  - gcp-storage-signed-url-expiration-revocation-limits-001
  - gcp-cloud-functions-mitigating-cold-starts-min-instances-001
  - gcp-cloud-functions-gen2-concurrency-shared-state-bug-001
related_guides:
  - kubernetes-interview-guide
related_technologies:
  - cloud-architecture
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Introduction

This guide covers exactly what this bank's 27 GCP questions actually go deep on: IAM (identity and access, the layer everything else sits on), Cloud Storage (access control, lifecycle management, and the exposure incidents that follow from getting it wrong), and Cloud Functions (serverless compute reliability — cold starts, concurrency, and the specific ways a "transparent" Gen 1-to-Gen 2 migration isn't actually transparent). That's a deliberately narrow, deep set of three areas rather than a tour of every GCP service, matched to the same scenario-driven depth as this site's AWS coverage.

If your interview also needs BigQuery, VPC networking, GKE workload design beyond IAM, or Cloud SQL, this guide will say so plainly rather than quietly pretending that content exists here. What it does cover, it covers the way a real GCP interview actually probes: not "what is a service account," but "a service account key just leaked to a public repo — walk me through what you do."

## Who This Guide Is For

This guide assumes you already operate GCP day to day — it leans intermediate and advanced, though unlike this site's AWS bank it does have a small amount of genuine beginner-difficulty content (2 of 27 questions), so it isn't quite as unforgiving a floor as pure "no fundamentals at all."

It's most directly useful for **DevOps Engineers**, **Senior DevOps Engineers**, and **Cloud Engineers** working with GCP as a real, daily responsibility — this bank's `cloud-engineer` interview level is populated by every single question here, since GCP work is cloud-engineering work by definition. **DevSecOps** engineers will find real value in the IAM and Storage security content specifically (leaked-key incident response, org policy vs. IAM, signed-URL exposure design). **Staff/Principal** candidates get genuine depth from the two expert-tier questions — a fast, event-driven public-exposure alerting design (using Cloud Asset Inventory's real-time feed) and a subtle Gen 2 concurrency bug — both of which are about designing a mechanism or diagnosing a genuinely non-obvious failure, not reciting a service description. This is not a strong fit for a from-zero GCP interview; if you've never used the console or `gcloud`, build that hands-on familiarity first.

## Prerequisites

Before working through this guide, you should already be comfortable with:

- Core GCP concepts: what a project, a service account, and IAM role binding each are, and basic familiarity with the `gcloud` CLI or console.
- The general shape of least-privilege access (even if you haven't designed one from scratch).
- Basic serverless/event-driven concepts — what a cold start is, roughly how a managed compute service differs from a server you provision and keep running yourself.
- General incident-response instincts (contain, investigate, remediate, prevent) — this bank's leaked-key and exposure questions assume you can follow that structure, not that you already know GCP's specific tools for it.

If any of these are shaky, get hands-on GCP experience first — this guide sharpens interview reasoning on top of operational familiarity, it doesn't build that familiarity from zero.

## Learning / Interview Path

Three stages, ordered fundamentals → practical usage → production troubleshooting, each building on the reasoning from the one before it.

1. **IAM (9 questions).** Start here for the same reason the AWS guide starts with IAM: everything else in GCP sits on top of identity and access. This subcategory's questions are almost entirely about the *mechanics and judgment calls* of GCP-specific IAM — basic roles vs. predefined vs. custom, cross-project service account access, IAM Conditions for time-bound grants, Workload Identity vs. mounted key files, and the GCP-specific steps in a leaked-key incident. It's also where GCP's identity model diverges most from AWS's, which is exactly what an interviewer probing "do you actually know GCP, or are you translating from AWS in your head" will test.

2. **Cloud Storage (9 questions).** With identity settled, move to a concrete resource you configure and secure directly. This subcategory has the bank's only beginner-difficulty content (resumable uploads) alongside its most practical, comparison-heavy material: dual-region vs. multi-region buckets, uniform vs. fine-grained access, CORS troubleshooting, lifecycle rules for cost. It also carries real production-incident weight — signed URLs that can't be individually revoked, and a versioning-plus-lifecycle interaction that quietly defeats the protection versioning was supposed to provide.

3. **Cloud Functions (9 questions).** Doing serverless compute last is deliberate: this subcategory is the most troubleshooting-heavy in the bank (7 of 9 questions carry a `troubleshooting` type) and carries the highest concentration of advanced/expert difficulty, including the one genuinely hard bug in this guide — a Gen 1-to-Gen 2 migration that silently breaks under concurrent load because of Cloud Run's different execution model underneath. That's a production-diagnosis problem in the fullest sense, and it's the right place to end: applying the identity and resource-configuration judgment from stages 1 and 2 to an actual incident under load.

## Key Concepts

A handful of ideas recur across all three areas — if you can explain each precisely, you're well prepared for most of what follows:

- **IAM answers "who can do what"; Organization Policy answers "what's allowed to happen at all, regardless of who."** A principal with full `compute.instanceAdmin` permissions can still be blocked from assigning a public IP by an Organization Policy constraint. Conflating the two systems is a common, specific GCP misconception.
- **A service account is an identity that can be granted access to resources in any project, not just its own.** Cross-project access is a normal IAM role binding on the target resource, naming the source project's service account — no special mechanism, no recreation needed.
- **Workload Identity (and Workload Identity Federation for CI/CD) eliminates long-lived, exportable service account keys entirely**, issuing short-lived credentials tied to a verified caller identity (a GKE pod, a CI platform's own OIDC token) instead of a static file that can be copied or leaked.
- **Gen 2 Cloud Functions run on Cloud Run underneath, and that changes real behavior** — concurrent requests per instance by default, longer max execution timeouts — not just version numbers. Code that was safe under Gen 1's strict one-request-per-instance model isn't automatically safe under Gen 2.
- **A signed URL has no per-URL revocation mechanism** — it's valid until it expires, full stop, unless you rotate the signing credentials (invalidating every URL ever signed with them) or remove the object. The only real mitigation is choosing the shortest practical expiration upfront.

## Interview Focus

What GCP interviewers are actually evaluating shifts with seniority, even when the surface topic looks the same:

- **DevOps Engineer:** Do you understand the service correctly and can you operate it day to day — configure an IAM role binding, recognize why a CORS-misconfigured bucket rejects browser uploads, set `--min-instances` to reduce cold starts?
- **Senior DevOps / Cloud Engineer:** Can you reason about trade-offs under real constraints? "Add a min-instances floor" needs to become "here's the cost/latency trade-off, and why I'd size it to burst volume rather than peak," and "use Workload Identity" needs to become "here's specifically what class of risk a mounted key file carries that Workload Identity removes."
- **DevSecOps:** Expect more weight on the security mechanics specifically — Cloud Asset Inventory for org-wide IAM audits, Cloud Audit Logs for confirming whether a leaked key was actually used, Organization Policy constraints as a layer independent of IAM.
- **Staff/Principal:** The two expert-tier questions in this bank (a fast, org-scale public-exposure alerting design, and diagnosing the Gen 2 concurrency bug) are both about designing a mechanism or root-causing a genuinely subtle failure at scale, not fixing one instance of a problem — that's the altitude staff-level GCP questions operate at.

Across every level, the strongest answers name the actual GCP mechanism — "Workload Identity Federation," "Public Access Prevention," "Cloud Asset Inventory," `--concurrency` — rather than describing the idea in the abstract or translating loosely from another cloud provider.

## Practice Questions

The list below is generated live from the current GCP question bank — nothing here is a fixed list that goes stale as new questions are added. Start with **Must Practice** for a fast cross-section of all three areas, then use the subcategory, difficulty, and interview-level groupings to focus your remaining time.

## Scenario & Troubleshooting Focus

GCP troubleshooting questions in this bank cluster around a small number of recurring incident patterns, and knowing the pattern is most of the battle:

- **"It changed behavior after a routine migration or config change, under load."** The Gen 1-to-Gen 2 concurrency bug is the sharpest example: no code changed, but Gen 2's concurrent-requests-per-instance model exposed a global-state bug that Gen 1's strict isolation had been silently hiding. The signal to check is whether the function's code holds any per-request data in a module-level or global variable, and `gcloud functions describe <name> --gen2` to confirm the actual configured concurrency. The reasoning approach: reproduce under genuine concurrent load (not sequential requests), since this class of bug is invisible under low-concurrency testing.
- **"It's silently failing and nobody noticed."** A Cloud Function can log every error correctly and still page no one, because logging and alerting are separate concerns — the fix is a Cloud Monitoring alerting policy on the function's error-rate/execution-count metrics, not more logging.
- **"It works locally, fails in production."** Check, in order: authentication (local `gcloud` user credentials vs. the deployed function's actual service account), configuration (local env vars vs. what's actually deployed), and networking (local reachability vs. the deployed environment's, especially relevant behind a VPC connector).
- **"Two things that should both be true about access control are both true, and that's not a contradiction."** A bucket can be flagged as publicly readable by a scanner while Public Access Prevention shows enabled, because PAP blocks *new* public bindings and may be scoped to a different level (bucket vs. project/org) than the scanner is checking — and a signed URL grants access independent of IAM bindings entirely, so PAP doesn't touch it. The reasoning approach here is checking scope and mechanism before assuming one of the two signals is simply wrong.
- **Production trade-off to name explicitly, every time:** a fix that eliminates a failure mode almost always costs something else — `--min-instances` trades ongoing cost for eliminated cold starts up to that reserved capacity; `--concurrency=1` trades away Gen 2's efficiency for Gen 1-style isolation as a stopgap. Naming the trade-off, not just the fix, is what separates a mid-level answer from a senior one.

The full set of GCP troubleshooting questions is at [GCP Troubleshooting Questions](/type/troubleshooting?category=gcp), and the scenario questions are at [GCP Scenario Questions](/type/scenario?category=gcp). When practicing these, write down what you'd check first and why — specifically, which `gcloud` command, which log, which metric — before reading the question's own investigation steps.

## Common Mistakes

- **Translating from AWS instead of learning GCP's actual model.** GCP's IAM, Organization Policy, and Workload Identity don't map one-to-one onto AWS's IAM policies and roles — several questions in this bank exist specifically to test whether a candidate actually knows the GCP-specific mechanism or is guessing by analogy.
- **Treating "logged" and "alerted" as the same thing.** A Cloud Function's errors can be faithfully logged for weeks with nobody notified, because no alerting policy was ever attached to the relevant metric.
- **Assuming a "transparent" migration is actually transparent.** Gen 1 to Gen 2 changes real execution semantics (concurrency, timeouts); code that was correct under one model can become intermittently, hard-to-reproduce broken under the other.
- **Reaching for a broad basic role (Editor/Owner) instead of a scoped predefined or custom role.** This bank's IAM questions repeatedly test whether a candidate defaults to least privilege or to "just grant enough access that it works."
- **Believing a signed URL can be individually revoked.** It can't — the only real control is choosing a short expiration upfront, not planning to react after a leak.
- **Confusing a bucket-level control with a project/organization-level one.** Public Access Prevention, Organization Policy, and IAM roles can all be scoped differently, and a candidate who checks only one level can walk away with a confidently wrong answer.

## Recommended Preparation Path

This bank is small enough (27 questions) that an artificial multi-week schedule would be filler. A more honest plan:

1. **First session:** The eight Must Practice questions below — a genuine cross-section of all three areas, doable in under two hours.
2. **Second session:** Pick whichever of IAM, Cloud Storage, or Cloud Functions felt weakest during Must Practice, and work through that subcategory's remaining questions in full.
3. **Third session:** The other two subcategories, in the Learning Path order above.
4. **Before the interview:** Revisit the Common Mistakes list and the Scenario & Troubleshooting Focus section above — these are the highest-density signal for how GCP interviewers actually probe, independent of which specific questions come up.

## Related Guides

If your interview also covers Kubernetes, the Kubernetes Interview Guide is a natural companion — this bank's Workload Identity question is specifically about a GKE workload, and the Cloud Functions-vs-Cloud-Run-vs-GKE question reasons directly about when GKE is the right call, so the overlap is concrete, not incidental.

## References

- [Google Cloud IAM: Understanding roles](https://cloud.google.com/iam/docs/understanding-roles)
- [Google Cloud Functions: Versions comparison](https://cloud.google.com/functions/docs/concepts/version-comparison)
- [Google Cloud Storage: Access control overview](https://cloud.google.com/storage/docs/access-control)
