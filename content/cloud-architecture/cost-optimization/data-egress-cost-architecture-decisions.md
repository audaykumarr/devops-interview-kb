---
id: cloud-architecture-cost-optimization-data-egress-001
title: "Your architecture serves a large volume of data out to end users and other services, and data transfer/egress costs have become one of your largest line items. What architectural decisions actually reduce this?"
category: cloud-architecture
subcategory: cost-optimization
technologies:
  - aws
difficulty: advanced
question_type:
  - architecture
tags:
  - cloud-architecture
  - cost-optimization
  - networking
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your architecture serves a large volume of data — to end users, and between services across regions or availability zones — and data transfer/egress costs have grown to be one of your largest cloud infrastructure line items. What architectural decisions actually reduce this, beyond just "use less data"?

## Short Answer

Reduce egress cost by changing where data actually crosses a billed boundary: serve static/cacheable content through a CDN (paying CDN egress rates rather than origin egress rates, and often avoiding origin egress entirely for cache hits), keep tightly-coupled services and their data within the same availability zone or region where possible (since cross-AZ and cross-region transfer both typically carry their own costs that same-AZ transfer doesn't), and compress data before transfer where the compute cost of compression is cheaper than the transfer cost saved.

## Detailed Explanation

Cloud providers price data transfer based on where it crosses specific boundaries — out to the public internet, across availability zones, across regions — and each of these has different (and sometimes surprisingly different) pricing, meaning the architectural question isn't just "how much data" but specifically "which boundaries does this data cross, and how often."

## Requirements

- Reduce total billed data transfer cost without degrading actual user-facing performance or reliability.
- Any caching or architectural change must maintain data correctness (not serve stale data where freshness genuinely matters).
- The approach should be sustainable as data volume grows, not just a one-time fix.

## Architecture

**Serve cacheable content through a CDN**: static assets, and often even semi-dynamic content with a reasonable cache lifetime, served through a CDN mean the CDN's edge locations absorb the majority of actual client-facing traffic, with your origin only serving cache misses — this both reduces origin egress costs directly (since CDN-to-client transfer is typically priced differently, and cache hits never touch your origin's egress billing at all) and improves actual user-facing latency as a secondary benefit.

**Keep tightly-coupled services co-located to avoid cross-AZ/cross-region transfer costs**: services that communicate frequently and are provisioned across multiple availability zones or regions for redundancy still pay cross-AZ or cross-region transfer costs for every request between them — for genuinely tightly-coupled, high-volume internal communication, deliberately co-locating those specific services (while still maintaining broader redundancy at a higher level) can meaningfully reduce this specific cost driver, though this needs to be balanced against the resilience benefits multi-AZ/region placement provides.

**Compress data before transfer where the trade-off favors it**: for data that's genuinely expensive to transfer uncompressed (large payloads, high volume), compressing before transfer trades some compute cost (and slight latency) for reduced transfer volume — worth evaluating explicitly (is the compute cost of compression, plus any added latency, actually less than the transfer cost saved) rather than assuming compression is always a net win.

**Reduce redundant or unnecessary cross-boundary transfer in application design**: sometimes egress cost reflects genuinely wasteful architecture — a service repeatedly re-fetching the same data across a billed boundary instead of caching it locally, or an overly chatty API design requiring many round-trips where fewer, larger ones would transfer less overhead — auditing actual traffic patterns for this kind of avoidable redundancy often reveals real savings independent of any pricing-model optimization.

**Consider data locality in your overall system design, not just as a cost afterthought**: designing services so that data naturally stays close to where it's consumed (processing data in the same region it's generated and primarily used, rather than routinely shipping it across regions) reduces the volume of expensive cross-boundary transfer structurally, rather than trying to optimize away cost from an architecture that wasn't designed with this in mind.

## Trade-offs

CDN caching requires careful cache invalidation strategy for anything that isn't purely static, and getting this wrong risks serving stale data — a real correctness risk that needs deliberate design, not just "cache everything." Co-locating services to reduce cross-AZ/region transfer cost trades away some of the resilience benefit multi-AZ/region placement provides, which needs to be a deliberate, informed trade-off (see the related multi-region decision-making question) rather than an unexamined cost optimization that quietly reduces your actual availability posture.

## Key Takeaways

- Egress cost reduction is fundamentally about reducing how much data crosses specific billed boundaries (to internet, cross-AZ, cross-region), not just reducing total data volume in the abstract.
- CDN caching absorbs client-facing traffic at the edge, reducing origin egress cost and improving latency as a secondary benefit — but requires deliberate cache invalidation design for non-static content.
- Co-locating tightly-coupled, high-volume internal services reduces cross-AZ/region transfer cost, but trades away some resilience benefit — a deliberate decision, not a free optimization.
- Audit for genuinely wasteful, redundant cross-boundary transfer in application design (repeated re-fetching, chatty APIs) as a source of real, structural savings.

## Interview Follow-Up Questions

- How would you design cache invalidation for content that's mostly static but occasionally needs to update quickly (e.g., pricing data)?
- How would you measure whether co-locating services to save on transfer costs is actually worth the resilience trade-off for your specific system?
- How would you quantify data egress cost per feature or per customer, to understand whether specific product decisions are driving disproportionate cost?

## References

- [AWS: Data transfer pricing](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
- [AWS: Amazon CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)
