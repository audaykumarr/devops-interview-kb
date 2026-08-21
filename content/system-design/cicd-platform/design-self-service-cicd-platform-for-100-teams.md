---
id: system-design-self-service-cicd-platform-001
title: "Design a self-service CI/CD platform for an engineering org with roughly 100 teams, each owning multiple services, without a central platform team becoming a bottleneck."
category: system-design
subcategory: cicd-platform
technologies:
  - ci-cd
  - kubernetes
  - platform-engineering
difficulty: expert
question_type:
  - system-design
  - architecture
tags:
  - platform-engineering
  - ci-cd
  - self-service
  - system-design
estimated_time_minutes: 15
companies: []
related_questions:
  - cicd-deployment-strategies-blue-green-canary-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Design a self-service CI/CD platform for an engineering organization with roughly 100 teams, each owning multiple services. The platform team is small (5-6 engineers) and can't be a manual approval step or a bottleneck for every team's deploys. What would you build, and how would you keep it from becoming either an unmaintainable free-for-all or a central chokepoint?

## Short Answer

Build a "golden path" platform: a small set of well-designed, opinionated defaults (pipeline templates, deployment patterns, observability wiring) that cover the majority of use cases out of the box, exposed through self-service tooling (a CLI or internal developer portal) rather than tickets to the platform team — with the platform team's actual job being to build and maintain those paved paths and their guardrails, not to review or gate individual deploys. Teams that need something outside the golden path can go around it, but that's an explicit, visible exception, not the default experience.

## Detailed Explanation

The core tension in this design is that a platform team of 5-6 people cannot possibly be a manual gate for 100 teams' worth of deploys — that math doesn't work at any reasonable request volume, and trying to make it work either turns the platform team into a bottleneck (defeating the point of CI/CD) or forces them to rubber-stamp requests they don't actually have time to review (defeating the point of having a gate at all). The only way to reconcile "100 teams need to deploy independently and often" with "a small platform team needs to maintain guardrails" is to shift the platform team's role from *gatekeeper* to *paved-road builder*: they invest their limited time in building good defaults once, and those defaults do the enforcement work automatically, continuously, for every team, without a human needing to be in the loop per deploy.

This only works if the golden path is actually good enough that most teams *want* to use it rather than needing to be forced onto it — a self-service platform that's technically available but painful to use just pushes teams toward workarounds, which recreates exactly the fragmentation and inconsistency the platform was meant to solve. That's why the design below treats "the golden path is genuinely the easiest option" as a hard requirement, not a nice-to-have, and builds observability into the platform itself (so the platform team can see who's using the golden path, who's going around it, and why) rather than relying on teams to self-report friction.

## Requirements

- Teams can go from a new service to a working, deployed pipeline in minutes, without filing a request to the platform team.
- A small platform team (5-6 people) can support ~100 teams without becoming a per-deploy approval bottleneck.
- Consistent baseline guardrails across all teams: security scanning, required tests, deployment strategy, observability wiring — without every team reimplementing these themselves.
- Teams with genuinely unusual needs (a different language ecosystem, a legacy system with unusual constraints) can still deviate from the golden path without being blocked entirely.
- The platform team needs visibility into adoption and pain points across all 100 teams, without manually surveying each one.

## Assumptions

- Most of the 100 teams build reasonably similar things (web services, APIs, background workers) that a well-designed set of templates can cover; a smaller number have genuinely unusual needs.
- Kubernetes (or an equivalent common runtime) is the standard deployment target across the org, giving the platform a consistent base to build tooling against.
- Teams have engineers capable of using a CLI or self-service portal — this isn't designing for non-technical users.

## Architecture

At the center is a small set of **pipeline templates** (e.g. "standard web service," "background worker," "scheduled job") implemented as reusable CI/CD configuration (shareable GitHub Actions workflows, or equivalent) that bake in the org's standard steps: build, test, security/dependency scanning, image build and push, and a standard deployment strategy (see the related canary/blue-green deployment-strategy question) — all versioned centrally so the platform team can improve them for everyone at once, and all consumed by reference rather than copy-pasted per team.

Teams interact with the platform primarily through a **CLI or internal developer portal** (a thin layer, e.g. built on something like Backstage) that scaffolds a new service onto the appropriate golden-path template, wires up its CI/CD, provisions its baseline infrastructure (namespace, secrets access, standard dashboards) automatically, and registers it in a service catalog — all without a platform-team human touching the request. This is the "self-service" half of the design: the platform team's product is the tooling and templates, not manual provisioning.

For guardrails, policy is enforced **as code, automatically, at pipeline execution time** — required security scans, test coverage thresholds, deployment approval gates for production-tier services — rather than as a manual review step. A policy engine (e.g. OPA/Conftest, or a cloud-native equivalent) evaluates each pipeline run against org-wide policy, failing the run automatically if violated, which scales to 100 teams' worth of pipeline runs without requiring a human reviewer per run.

For teams that need to deviate from the golden path, an explicit **"break glass" or exception path** exists: a documented, lightweight process for opting out of specific golden-path defaults (with the deviation visible in the service catalog, not hidden), rather than either blocking them entirely or letting silent, invisible drift accumulate.

## Components

- Versioned, centrally-maintained CI/CD pipeline templates for the org's common service archetypes.
- A self-service CLI/developer portal for scaffolding new services onto a golden-path template and provisioning baseline infrastructure.
- A service catalog tracking every team's service, which template/version it's on, and any recorded deviations from the golden path.
- A policy-as-code engine enforcing security/quality/deployment guardrails automatically at pipeline execution time.
- Platform-wide observability (adoption metrics, pipeline failure rates, time-to-deploy) so the platform team can see usage and friction across all 100 teams without manual surveys.
- A documented exception process for teams that need to deviate from the golden path.

## Trade-offs

- Investing heavily in a small number of golden-path templates means less flexibility out of the box than "every team configures their own pipeline from scratch" — that's the intended trade: less per-team flexibility in exchange for a platform team that can actually scale to 100 teams.
- Policy-as-code enforcement is more upfront engineering investment than manual review, but manual review structurally cannot scale to this team count — this isn't really an optional trade-off, it's a requirement given the constraint.
- The exception path is necessary for legitimate edge cases, but it's also the mechanism by which the golden path could quietly erode if used too liberally — this needs active monitoring (via the service catalog) rather than being a "set it and forget it" escape hatch.
- A centrally-versioned template that improves for everyone at once also means a bad change to the template has a large blast radius — this argues for careful rollout practices (canary the template change across a subset of teams first) applied to the platform's own tooling, not just to the services it deploys.

## Failure Scenarios

- A golden-path template update introduces a breaking change and simultaneously breaks pipelines for a large fraction of the 100 teams — mitigated by versioning templates explicitly (teams pin a version, opt into upgrades) rather than every team automatically tracking the latest version unconditionally, plus canary-rolling template changes.
- Teams route around the golden path so often that the platform's actual guardrail coverage is much lower than assumed — mitigated by the service catalog's visibility into deviations, reviewed regularly by the platform team as a leading indicator, not discovered during an incident.
- The self-service tooling itself becomes a single point of failure (if the portal/CLI backend is down, no team can deploy) — mitigated by designing the underlying pipelines to function via the standard CI/CD system directly even if the higher-level self-service layer is degraded.

## Security

Baking security scanning and policy enforcement into the golden-path templates, applied automatically to every pipeline run, gives far more consistent security coverage across 100 teams than relying on each team to independently implement and maintain their own scanning — this is one of the strongest arguments for the golden-path approach specifically in a security context: a manual, team-by-team security review process could never keep pace with 100 teams' deploy frequency, but automated, policy-as-code enforcement scales with it.

## Scalability

The self-service, template-based design is what makes this scale to 100 teams with a 5-6 person platform team in the first place — the platform team's effort scales with the number of *templates and policies* they maintain, not with the number of *teams or deploys*, which is the entire point of the architecture. Adding team #101 costs the platform team nothing extra if that team fits an existing golden path.

## Cost Considerations

The upfront cost is concentrated in the platform team's time building good templates, the developer portal, and the policy engine — a real investment, not free. The ongoing payoff is avoiding the alternative cost structure, where either the platform team scales linearly with team count (impossible at this ratio) or guardrails get skipped entirely to avoid the bottleneck (a much larger, harder-to-quantify cost via incidents and security gaps).

## Real-World Approach

1. Start with the platform team's own usage data (or interviews) to identify the 2-3 most common service archetypes across the 100 teams, and build golden-path templates for those first rather than trying to cover everything.
2. Build the self-service scaffolding tooling (CLI or portal) for those initial templates, and pilot with a handful of willing teams before org-wide rollout.
3. Add policy-as-code enforcement incrementally, starting with the highest-value guardrails (security scanning, required tests) rather than trying to encode every possible policy on day one.
4. Roll out org-wide with the documented exception path available from the start, so teams with genuine edge cases aren't blocked while the golden path is still maturing.
5. Instrument adoption and deviation metrics from day one, and use them to prioritize what the platform team builds next.

## Common Mistakes

- Building the golden path around what the platform team assumes teams need, rather than validating against actual usage patterns across the 100 teams.
- Making the self-service path technically available but slower or more painful than the old manual process, so teams route around it anyway.
- Encoding policy enforcement as documentation and expectation instead of automated, as-code enforcement — this doesn't scale past a handful of teams.
- Treating the platform as "done" after initial rollout instead of continuing to invest based on adoption/friction data.

## Interview Follow-Up Questions

- How would you handle a team that's on a fundamentally different tech stack the golden path doesn't cover well?
- How would you measure whether this platform is actually succeeding, beyond just "teams are using it"?
- How would this design change if the org had 1,000 teams instead of 100?

## Key Takeaways

- A small platform team can't scale as a manual gate for many teams — the only way to reconcile that is shifting from gatekeeping to building automated, self-service paved paths.
- Policy-as-code enforcement at pipeline execution time is what lets guardrails scale with deploy volume instead of platform-team headcount.
- The golden path only works if it's genuinely the easiest option — technically-available-but-painful self-service just gets routed around.
- Visibility into adoption and deviation (via a service catalog) is what lets a small platform team stay ahead of drift across 100 teams without manually checking each one.

## References

- [Google Cloud: What is platform engineering?](https://cloud.google.com/learn/what-is-platform-engineering)
- [Open Policy Agent: Policy-based control for cloud native environments](https://www.openpolicyagent.org/docs)
- [Backstage: An open platform for building developer portals](https://backstage.io/docs/overview/what-is-backstage)
