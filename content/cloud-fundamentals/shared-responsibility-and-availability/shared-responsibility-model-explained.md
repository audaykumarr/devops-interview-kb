---
id: cloud-fundamentals-shared-responsibility-model-001
title: "A company got breached because an S3 bucket was publicly accessible, and leadership initially blamed AWS. Why is that framing wrong, and how does the shared responsibility model actually draw the line?"
category: cloud-fundamentals
subcategory: shared-responsibility-and-availability
technologies:
  - aws
difficulty: beginner
question_type:
  - conceptual
tags:
  - cloud-fundamentals
  - shared-responsibility
  - security
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A company suffers a data breach because an S3 bucket containing sensitive data was left publicly accessible. Leadership's initial reaction is to blame AWS for the security failure. Why is that framing wrong, and how does the cloud shared responsibility model actually draw the line between what the provider secures and what the customer secures?

## Short Answer

The shared responsibility model splits security obligations along a specific, consistent line: the cloud provider is responsible for security *of* the cloud (the physical infrastructure, host virtualization, network infrastructure, and the managed service's own underlying platform), while the customer is responsible for security *in* the cloud (how they configure and use the services — access controls, data classification, and specifically, whether a bucket is public or private). A publicly accessible S3 bucket is a configuration choice the customer made (or failed to make correctly) — AWS provides the mechanism to make a bucket private, secure by default in current defaults, and it's the customer's responsibility to configure and maintain that correctly.

## Detailed Explanation

The "of the cloud" versus "in the cloud" framing is the actual, precise way to reason about where responsibility sits, and it holds consistently across most cloud provider security incidents, not just this specific S3 example.

**"Of the cloud" — the provider's responsibility**: physical data center security, hardware, the host operating system and virtualization layer, network infrastructure — for AWS specifically, this includes ensuring the underlying S3 service itself is secure, patched, and available, and that the infrastructure hosting your data is properly isolated from other customers. If the actual S3 service infrastructure had a vulnerability that let unauthorized parties bypass access controls entirely, that would be AWS's responsibility.

**"In the cloud" — the customer's responsibility**: how you configure and use the services you've provisioned — access policies, bucket permissions, data encryption choices, identity and access management, network configuration — this is squarely where "is this specific bucket public or private" lives, since that's a configuration decision the customer makes (whether deliberately or by mistake) using the tools AWS provides.

**The dividing line shifts depending on the service model**: for IaaS (raw compute/storage), the customer's responsibility extends further down the stack (they manage the guest OS, patching, network configuration); for PaaS, the provider manages more (runtime, OS); for SaaS, the provider manages nearly everything except how the customer configures and uses the application — but even at the SaaS end, "who has access to what" configuration choices generally remain customer responsibility. S3 sits closer to the PaaS/managed-service end for this purpose — AWS manages the storage infrastructure and service itself, but bucket-level access configuration is squarely a customer decision.

**AWS specifically has invested in defaults and tooling addressing exactly this common mistake class**: S3 buckets are private by default on creation, and AWS provides "Block Public Access" settings, IAM policies, and dashboards/tools (AWS Config, Trusted Advisor, Security Hub) specifically to help customers detect and prevent accidental public exposure — but providing these tools is different from the provider being responsible for a customer choosing not to use them correctly, or for actively misconfiguring a bucket to be public.

**This matters practically for incident response and prevention, not just blame allocation**: correctly understanding the shared responsibility model changes what an organization actually does after an incident like this — instead of waiting for or expecting a fix from the cloud provider (who has no incident to fix on their end, since their infrastructure behaved exactly as configured), the org needs to fix its own configuration practices, add automated detection for public resources, and build the internal process/tooling gap that let this happen in the first place.

## Key Takeaways

- The shared responsibility model splits along "of the cloud" (provider: physical infrastructure, host virtualization, the managed service's own platform) versus "in the cloud" (customer: configuration, access control, how services are used).
- A publicly accessible S3 bucket is a customer configuration choice — AWS provides secure-by-default settings and tooling to prevent it, but doesn't configure individual customer buckets.
- The dividing line shifts by service model (IaaS customers manage more; SaaS customers manage less), but "how you configure and use what you provisioned" is consistently customer responsibility across the spectrum.
- Correctly understanding this model changes incident response — the fix for this class of incident is internal configuration/detection practices, not waiting on the cloud provider.

## Interview Follow-Up Questions

- How would you design automated detection to catch a misconfigured public bucket before it becomes an actual incident, rather than discovering it after a breach?
- How does the shared responsibility model change for a managed Kubernetes service (like EKS) compared to raw EC2 instances?
- What's an example of a genuine "of the cloud" security failure that would actually be the provider's responsibility?

## References

- [AWS: Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [AWS: Amazon S3 Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
