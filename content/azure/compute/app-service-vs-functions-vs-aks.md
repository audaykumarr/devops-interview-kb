---
id: azure-compute-app-service-vs-functions-vs-aks-001
title: "How would you decide between App Service, Azure Functions, and AKS for a new event-driven workload, beyond just 'Functions is for small things'?"
category: azure
subcategory: compute
technologies:
  - azure
  - app-service
  - azure-functions
  - aks
difficulty: intermediate
question_type:
  - comparison
  - architecture
tags:
  - azure
  - app-service
  - functions
  - aks
  - architecture
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A team is building a new event-driven workload on Azure and is deciding between App Service, Azure Functions, and AKS. How would you actually reason through this decision, beyond the shallow "Functions is for small things, AKS is for big things"?

## Short Answer

App Service fits a long-running, always-on web application where you want PaaS convenience without managing servers, and where "Always On" removes the cold-start problem entirely. Azure Functions (Consumption) fits genuinely event-driven, spiky, or infrequent workloads where true scale-to-zero and per-execution billing matter, at the cost of cold starts unless you pay for Premium plan pre-warmed instances. AKS fits workloads needing real infrastructure-level control, complex multi-service orchestration, or Kubernetes-specific ecosystem tooling, at the cost of taking on cluster operations yourself. The sensible default is starting with the simplest platform that fits and moving up only when real complexity or scale demands it.

## Detailed Explanation

The three platforms sit on genuinely different points of the control-versus-convenience trade-off, and the "right" choice depends on which specific constraints the workload actually has — not on perceived workload size alone.

## Requirements

Before choosing, name the actual constraints driving the decision: does the workload need to run continuously or only in response to events; how latency-sensitive is a cold response after idle time; does it need infrastructure-level control (custom networking, sidecars, fine-grained scheduling); and who owns ongoing operational burden — an app team, or a platform team already running Kubernetes elsewhere.

## Architecture

**App Service** is the right default for a continuously-running web application or API where you want PaaS-managed scaling, deployment slots, and built-in features (custom domains, TLS, autoscale rules) without provisioning infrastructure. Enabling "Always On" keeps at least one instance warm continuously, which removes the cold-start problem that Functions and (to a lesser extent) AKS pod scheduling both have to actively manage around — this is a genuinely Azure-specific lever, since it trades a small continuous cost for eliminating an entire class of latency problem outright.

**Azure Functions** fits work that's naturally event-driven and doesn't need to run continuously — processing a queue message, responding to a Blob upload, running on a schedule. Consumption plan gives true scale-to-zero and per-execution billing, which is the right economic model when traffic is spiky or infrequent, but it reintroduces cold starts exactly where App Service's Always On avoids them. Premium plan closes that gap with pre-warmed instances and VNET integration, at a cost structure closer to always-on compute — meaning the "Functions is cheap" assumption only holds for genuinely intermittent workloads.

**AKS** is the right choice when the workload needs infrastructure-level control that neither PaaS option gives you — custom networking topologies, sidecar patterns, fine-grained resource scheduling across many interdependent services, or dependence on Kubernetes-specific ecosystem tooling (operators, service meshes, GitOps controllers). That control comes with real operational cost: you're now responsible for cluster upgrades, node pool management, and the platform team overhead that App Service and Functions abstract away entirely.

## Trade-offs

- **App Service**: predictable cost and no cold starts (with Always On), but you pay for capacity whether or not it's in use, and it's the wrong shape for genuinely event-driven, bursty work.
- **Azure Functions (Consumption)**: the cheapest option for spiky or infrequent workloads and the least operational overhead, but cold starts are a real, user-visible cost unless you pay for Premium.
- **AKS**: the most control and the best fit for complex multi-service systems, but the highest operational burden — you own cluster lifecycle, not just application code.

## Key Takeaways

- The decision isn't "small versus big," it's about which specific constraint dominates: continuous availability (App Service), genuine event-driven bursts with cost sensitivity (Functions), or infrastructure-level control (AKS).
- App Service's Always On setting is a direct, Azure-specific lever against cold starts that neither Consumption-plan Functions nor a freshly-scheduled AKS pod has by default.
- Functions Premium plan exists specifically to buy back the cold-start guarantee Consumption gives up — meaning the "Functions is cheap" assumption depends on genuinely intermittent traffic, not on the platform alone.
- Start with the simplest platform that satisfies the actual constraints, and move up only when a real, specific limitation forces it — not preemptively.

## Interview Follow-Up Questions

- How would you migrate a workload from App Service to AKS if it later needs sidecar-based traffic management that App Service can't provide?
- What's the cost/complexity crossover point where Functions Premium stops being cheaper than just running the workload on App Service?
- How would this decision change for a workload that's mostly steady-state but has a few predictable, large traffic spikes per year?

## References

- [Azure App Service: Overview](https://learn.microsoft.com/en-us/azure/app-service/overview)
- [Azure Functions: Choose the right hosting plan](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale)
