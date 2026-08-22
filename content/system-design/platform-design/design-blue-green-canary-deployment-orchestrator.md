---
id: system-design-platform-deployment-orchestrator-001
title: "Design a deployment orchestration system that lets any of your organization's 200 services safely adopt canary or blue-green deployments, without every team building their own rollout automation from scratch."
category: system-design
subcategory: platform-design
technologies:
  - kubernetes
  - platform-engineering
difficulty: expert
question_type:
  - system-design
  - architecture
tags:
  - platform-engineering
  - deployment
  - system-design
  - kubernetes
estimated_time_minutes: 14
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your organization runs roughly 200 services on Kubernetes. Today, most teams deploy via a simple rolling update, and a few teams have built their own bespoke canary or blue-green automation, each slightly different and each maintained by that individual team. Leadership wants safer deployments organization-wide. Design a deployment orchestration system that lets any team adopt canary or blue-green deployment safely, without requiring every team to build and maintain their own rollout automation.

## Short Answer

Build a shared deployment orchestration layer (using a tool like Argo Rollouts or Flagger, which extend Kubernetes' native deployment primitives with progressive-delivery capabilities) that any service can opt into via configuration, automatically handling traffic shifting, health-check-gated progression, and automated rollback — with the platform team owning the shared orchestration logic and health-check integration, while individual teams just declare their desired strategy and success criteria for their own service.

## Detailed Explanation

The core insight is the same "golden path" pattern as the earlier self-service CI/CD platform question: progressive delivery (canary, blue-green) is genuinely complex to implement correctly — traffic shifting, automated health evaluation, safe rollback — and having 200 teams each build their own version means 200 different implementations of similar logic, most of them less robust than a well-built shared one, and none of them benefiting from improvements made to any other team's version.

## Requirements

- Any team should be able to adopt canary or blue-green deployment for their service via configuration, without building custom automation.
- The system must automatically evaluate deployment health during rollout and automatically roll back on detected failure, not rely on a human watching a dashboard.
- Different services should be able to use different progressive-delivery strategies (canary vs. blue-green) and different specific success criteria, since a single rigid strategy doesn't fit every service's traffic pattern and risk profile.
- The system should integrate with existing observability (metrics) rather than requiring teams to build separate health-check logic.

## Assumptions

- Kubernetes is the common deployment target across all 200 services, and services are exposed through a common service mesh or ingress layer capable of the fine-grained traffic splitting progressive delivery requires.
- A metrics backend (Prometheus or equivalent) already exists and exposes per-service latency/error-rate metrics that can be used as automated health-check signals during rollout.
- Teams are willing to adopt a shared, opinionated tool rather than each maintaining fully custom deployment logic, given the golden-path pattern's demonstrated value elsewhere in the organization.

## Architecture

**A progressive-delivery controller (Argo Rollouts or Flagger) as the shared orchestration engine**: rather than each team building custom logic for traffic shifting and rollback, a shared Kubernetes controller handles the actual mechanics of a canary or blue-green rollout — gradually shifting traffic, running the configured health checks at each step, and either continuing, pausing, or automatically rolling back based on the results — driven by a declarative configuration each team writes for their own service, not custom code.

**Declarative, per-service rollout configuration**: each team declares their desired strategy (canary with specific traffic-shift steps, or blue-green with a specific validation window) and their service's specific success criteria (acceptable error rate threshold, latency threshold) as configuration alongside their existing deployment manifests — this is the self-service interface, letting teams customize what matters for their service without needing to understand or modify the underlying orchestration mechanics.

**Automated health evaluation wired to existing observability**: the orchestration controller queries the organization's existing metrics backend during each rollout step, comparing the new version's error rate and latency against the configured thresholds (and often against the currently-stable version's own metrics, for a relative comparison) — this reuses observability infrastructure that already exists rather than requiring each team to build separate health-check logic specifically for deployments.

**Traffic shifting via the service mesh/ingress layer**: actually splitting live traffic between the old and new versions (e.g., 5%, then 25%, then 50%, then 100% for canary) is handled by the underlying service mesh or ingress controller's traffic-splitting capability, which the progressive-delivery controller drives programmatically — this requires the organization's networking layer to support fine-grained traffic splitting, which is a real infrastructure prerequisite, not just an application-layer concern.

**Automatic rollback on failed health checks**: if metrics breach the configured threshold at any step, the controller automatically halts progression and rolls back to the previous stable version without requiring a human to notice and intervene — this is the core safety property the whole system exists to provide, converting "a human needs to be watching a dashboard during every deploy" into "the system watches automatically, every time."

## Components

- A progressive-delivery controller (Argo Rollouts or Flagger) deployed as shared platform infrastructure.
- Per-service declarative rollout configuration (strategy, steps, success criteria).
- Integration with the existing metrics backend for automated health evaluation.
- A service mesh or ingress layer capable of fine-grained traffic splitting.
- Dashboards/visibility into in-progress rollouts across all 200 services, for both individual teams and the platform team.

## Trade-offs

- Adopting a shared orchestration tool means all 200 teams' progressive-delivery needs must fit within what that tool supports — teams with genuinely unusual requirements may need an exception path (echoing the golden-path exception pattern from the earlier CI/CD platform design), rather than the shared tool trying to support every conceivable edge case.
- Automated rollback based on metric thresholds requires those thresholds to be well-chosen per service — poorly-tuned thresholds risk either false-positive rollbacks (too sensitive) or missing real problems (too lenient), meaning teams need to invest real thought into their own service's specific criteria, not just accept a generic default blindly.
- Fine-grained traffic splitting requires service mesh or advanced ingress capability, which is real infrastructure investment if not already in place — a genuine prerequisite cost for organizations not already running this kind of networking layer.

## Failure Scenarios

- A service's configured health-check thresholds are too lenient, letting a genuinely broken new version continue rolling out to 100% traffic despite real user impact — mitigated by providing sensible, conservative default thresholds and platform-level guidance on setting them well, plus a fast manual abort capability as a backstop.
- The metrics backend itself is degraded during a rollout, meaning the controller can't get reliable health signal — mitigated by defining safe-default behavior when health signal is unavailable (pause and require manual confirmation, rather than either blindly continuing or blindly rolling back based on missing data).
- The shared orchestration controller itself has a bug or outage, affecting rollouts across many of the 200 services simultaneously — mitigated by careful, staged rollout of updates to the platform's own orchestration tooling, and by ensuring a stuck rollout can still be manually completed or rolled back even if the controller is degraded.

## Security

Rollback automation itself needs appropriate access control — the orchestration controller needs sufficient permissions to modify traffic routing and deployment state across many services, making it a high-value target worth securing carefully (scoped service account permissions per namespace/team, rather than one broadly-privileged controller identity with blanket access).

## Scalability

Since each team's rollout configuration and health checks are scoped to their own service, the system scales naturally as more of the 200 (or more) services adopt it — the platform team's effort scales with maintaining the shared controller and providing guidance, not with the number of individual rollouts happening, which is the same golden-path scaling property as the earlier self-service CI/CD platform design.

## Cost Considerations

The main cost is the platform team's investment in standing up and maintaining the shared orchestration controller and service mesh/ingress capability if not already present — a real upfront and ongoing cost, weighed against the alternative of 200 teams each building and maintaining their own less-robust rollout automation, which is both more total engineering effort organization-wide and produces meaningfully less consistent safety guarantees.

## Real-World Approach

1. Evaluate and select a progressive-delivery controller (Argo Rollouts or Flagger) based on the organization's existing Kubernetes and service mesh/ingress setup.
2. Pilot with a small number of willing teams, refining the declarative configuration pattern and default health-check thresholds based on real usage.
3. Document clear guidance on choosing and tuning success criteria, since this is the part most likely to be misconfigured by teams new to progressive delivery.
4. Roll out organization-wide, prioritizing migration of the teams currently running bespoke custom rollout automation first, since they have the most to gain from consolidating onto the shared, better-maintained system.
5. Build cross-service visibility into in-progress rollouts, giving both the platform team and individual teams a consistent view.

## Common Mistakes

- Rolling out progressive delivery capability without also investing in the service mesh/ingress traffic-splitting prerequisite, leaving teams unable to actually adopt it despite the tooling being available.
- Providing no guidance on setting health-check thresholds, leading teams to either copy an inappropriate default or configure something too lenient to catch real problems.
- Building the shared controller without a fast manual-abort/override path, leaving teams stuck if the automated logic gets into a bad state during a real incident.
- Treating this as purely a tooling rollout without accounting for the real migration effort teams with existing bespoke automation need to actually adopt the shared system.

## Interview Follow-Up Questions

- How would you handle a service whose traffic pattern makes automated canary health evaluation genuinely difficult (very low traffic, highly variable load)?
- How would you design the exception path for a team with deployment requirements the shared tool genuinely doesn't support well?
- How would you measure whether this system has actually improved deployment safety organization-wide, beyond just adoption rate?

## Key Takeaways

- Progressive delivery is complex enough that a shared, well-built orchestration layer meaningfully outperforms 200 teams each building bespoke automation — the same golden-path reasoning as other platform-engineering investments.
- Declarative, per-service configuration lets teams customize strategy and success criteria without needing to understand or modify the underlying orchestration mechanics.
- Automated health evaluation tied to existing observability infrastructure converts "a human must watch every deploy" into a consistent, always-on safety net.
- Fine-grained traffic splitting via a service mesh or advanced ingress layer is a real infrastructure prerequisite, not just an application-layer concern, worth accounting for in the rollout plan.

## References

- [Argo Rollouts: Documentation](https://argo-rollouts.readthedocs.io/en/stable/)
- [Flagger: Progressive Delivery Operator](https://docs.flagger.app/)
