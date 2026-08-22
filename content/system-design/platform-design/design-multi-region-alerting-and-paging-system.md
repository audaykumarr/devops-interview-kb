---
id: system-design-observability-alerting-paging-001
title: "Design an alerting and on-call paging system for a company running services across 3 regions, where the paging system itself must not go down along with the region it's monitoring."
category: system-design
subcategory: platform-design
technologies:
  - observability
  - sre
difficulty: expert
question_type:
  - system-design
  - architecture
tags:
  - observability
  - alerting
  - system-design
  - high-availability
estimated_time_minutes: 14
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your company runs production services across 3 regions. You need to design the alerting and on-call paging system that watches all of them. The critical constraint: if one region has a genuine outage, the paging system itself must not also go down along with it — that would be exactly the scenario where reliable paging matters most, and it's the one your current design must specifically survive. Design this system.

## Short Answer

The alerting/paging pipeline must run independently of the regions it monitors — deployed in its own, separate failure domain (a dedicated region, or genuinely redundant across regions with no single-region dependency) so a regional outage that takes down monitored services doesn't also take down the thing responsible for telling humans about it. Alert evaluation should happen close to where metrics are collected (to survive a monitored region's network partition from the rest of the world), while the actual paging/notification delivery path routes through external, third-party channels (SMS, phone, a paging provider) that don't depend on your own infrastructure being up.

## Detailed Explanation

The core design constraint is a genuine "who watches the watchmen" problem: if your alerting system's own availability depends on the same infrastructure it's monitoring, a real outage in that infrastructure can silently disable your ability to be alerted about it — which is the worst possible failure mode, since it converts a visible, actionable incident into an invisible, unaddressed one.

## Requirements

- A regional outage must not prevent alerts about that region (or any other) from being evaluated and delivered.
- The paging/notification delivery path must not depend on the same infrastructure being monitored.
- Alert evaluation latency must remain low enough for genuinely time-sensitive pages, even during a partial outage affecting part of the monitoring pipeline.
- The system must avoid alert storms during a large-scale incident, where many services failing simultaneously could otherwise generate an overwhelming, unusable volume of individual pages.

## Assumptions

- Each of the 3 regions runs its own local metrics collection (Prometheus or equivalent) for its own services, rather than every region shipping raw metrics to one single central location for evaluation.
- A third-party paging provider (PagerDuty, Opsgenie, or similar) is used for actual notification delivery, rather than building custom SMS/phone infrastructure from scratch.
- On-call engineers carry a phone capable of receiving calls/SMS/push notifications independent of any single region's own infrastructure.

## Architecture

**Alert evaluation happens locally, close to the metrics being evaluated**: each region runs its own alerting rule evaluation against its own local metrics store, rather than shipping all raw metrics to one central location and evaluating everything there — this means a network partition isolating one region from the rest of the world doesn't prevent that region's own alerts from still being correctly evaluated locally, since evaluation doesn't depend on connectivity to anywhere else.

**A central alert aggregation layer, itself deployed outside any single monitored region**: each region's alert evaluator forwards firing alerts to a central alertmanager-equivalent responsible for deduplication, grouping, and routing to the paging provider — critically, this central layer runs in its own separate, dedicated environment (not itself one of the 3 monitored production regions), so it isn't taken down by the same failure that might affect a monitored region.

**Paging delivery routes through an external, third-party provider**: the actual notification to an on-call engineer's phone (SMS, phone call, push notification) is handled by a dedicated paging provider whose infrastructure and delivery network is entirely independent of your own — this is a deliberate choice to not depend on your own infrastructure for the final, most critical step of actually reaching a human, since your own infrastructure is exactly what might be experiencing the outage in question.

**Alert grouping and deduplication prevent storm conditions during a large incident**: if many services within one region fail simultaneously (a genuine regional outage), naive per-alert paging would flood on-call with dozens or hundreds of individual pages — the aggregation layer groups related alerts (same region, same root-cause window) into a single, consolidated page, giving on-call a clear signal ("region X is having a major incident") rather than an overwhelming flood that's actually harder to act on.

**Redundant paths for the aggregation layer itself**: since the central aggregation layer is now the most critical single point in the pipeline, it should itself be deployed with real redundancy (multiple instances, ideally in more than one location itself) — a single-instance aggregation layer would just relocate the original problem to a new, still-fragile choke point.

## Components

- Per-region local alert rule evaluation against local metrics.
- A centrally-deployed (outside any monitored region) alert aggregation and deduplication layer, itself redundant.
- Integration with an external, third-party paging provider for actual notification delivery.
- Alert grouping logic to prevent storm conditions during large-scale incidents.
- A documented, regularly tested failover/verification process confirming the paging path actually works end-to-end.

## Trade-offs

- Running alert evaluation locally per region, rather than centrally, adds some operational complexity (more evaluation instances to maintain and monitor) in exchange for surviving a regional network partition — a necessary trade given the core requirement.
- Depending on an external, third-party paging provider introduces a new external dependency outside your own control — mitigated by that provider's own infrastructure being independently reliable and not sharing your specific failure domains, but worth being deliberate about (evaluating the provider's own reliability track record) rather than assuming any third party is automatically safer.
- Alert grouping reduces page volume during large incidents but risks obscuring a genuinely distinct second problem that happens to occur during the same time window — this needs careful grouping logic (grouping by likely shared root cause, not just by time proximity) to avoid masking a real, separate issue.

## Failure Scenarios

- The central aggregation layer itself goes down — mitigated by its own redundancy across multiple instances/locations, and by a fallback path (even a degraded one, like direct per-region-to-paging-provider integration) if the aggregation layer is fully unavailable.
- The third-party paging provider itself has an outage — mitigated by a documented secondary notification channel (a different provider, or a direct fallback like a phone tree) for this rare but real scenario, and by choosing a paging provider with a strong independent reliability track record.
- A genuine, simultaneous multi-region outage overwhelms the aggregation layer with alert volume from all 3 regions at once — mitigated by capacity-planning the aggregation layer for a worst-case simultaneous-multi-region scenario, not just single-region peak load.

## Security

Access to the alerting/paging configuration (who gets paged for what, escalation policies) should be tightly controlled, since a malicious or accidental misconfiguration here could silence genuine alerts or misroute pages — treating this configuration with the same change-control rigor as production infrastructure changes, not as a lightweight, unreviewed setting.

## Scalability

As the number of regions or services grows, the per-region local evaluation model scales naturally (each new region adds its own local evaluator, without increasing load on existing regions' evaluation), while the central aggregation layer's scaling need grows with total alert volume across all regions combined — this is the layer to specifically capacity-plan and monitor as the organization grows.

## Cost Considerations

The dedicated, separate deployment for the central aggregation layer, plus a third-party paging provider subscription, represent real, ongoing costs beyond just running the underlying monitored services — but this is a case where the cost of the alerting system's own reliability is directly justified by what's at stake: an alerting system that fails exactly when a real incident happens provides close to zero value despite whatever it cost to build.

## Real-World Approach

1. Start with per-region local alert evaluation for each region's own services, using whatever metrics backend each region already runs.
2. Stand up the central aggregation layer in its own dedicated, non-production-region environment, integrated with a chosen third-party paging provider.
3. Implement alert grouping/deduplication logic, tuned initially conservatively (favoring fewer, clearer pages) and refined based on real incident feedback.
4. Regularly test the full pipeline end-to-end, including deliberately simulating a regional outage to confirm paging still works — don't wait for a real incident to discover a gap.
5. Add redundancy to the aggregation layer itself once the core pipeline is proven, treating it as the new most-critical single point once the original per-region gap is closed.

## Common Mistakes

- Deploying the central alerting/paging infrastructure inside one of the same production regions it monitors, recreating the exact single-point-of-failure problem the design is meant to solve.
- Relying entirely on your own infrastructure for the final notification delivery step, rather than an independent third-party channel.
- Not testing the failover path until a real regional outage reveals a gap — this needs to be verified proactively, the same way a backup restore needs to be tested before it's actually relied upon.
- Ungrouped, per-alert paging during a large incident, overwhelming on-call with volume instead of a clear, actionable signal.

## Interview Follow-Up Questions

- How would you test this system's resilience to a regional outage without waiting for a real one to happen?
- How would you handle the central aggregation layer's own alerting — who pages the people responsible for the paging system itself?
- How would you design escalation if the primary on-call engineer doesn't acknowledge a page within a reasonable window?

## Key Takeaways

- The alerting/paging pipeline must be architecturally independent of the infrastructure it monitors — a regional outage must not also disable the system responsible for alerting about it.
- Evaluate alerts locally, close to the metrics, so a network partition isolating one region doesn't prevent that region's own alerts from firing correctly.
- Route final notification delivery through an external, third-party channel independent of your own infrastructure's availability.
- Alert grouping/deduplication is essential during large-scale incidents to produce a clear, actionable signal instead of an overwhelming flood of individual pages.

## References

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [PagerDuty: Incident Response Documentation](https://response.pagerduty.com/)
