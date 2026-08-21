---
id: troubleshooting-methodology-paged-app-is-slow-no-context-001
title: "You get paged with just \"the app is slow\" and no other context. Walk through your actual troubleshooting methodology before you touch anything."
category: troubleshooting
subcategory: methodology
technologies:
  - observability
difficulty: intermediate
question_type:
  - scenario
  - troubleshooting
tags:
  - troubleshooting
  - incident-response
  - methodology
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You get paged at 2am with an alert that just says "the app is slow" — no specific error, no specific endpoint, no other context. Walk through your actual troubleshooting methodology, in order, before you start changing anything.

## Short Answer

Establish scope and severity first (who's affected, how badly, is it getting worse), then work top-down from the outside in — check high-level system health (error rates, latency dashboards, recent deploys/changes) before diving into any single component — because acting on a guess before confirming scope risks fixing the wrong thing while the real problem continues, and "recent change" is disproportionately often the actual cause.

## Detailed Explanation

The instinct under a 2am page is to start immediately investigating whatever seems most likely, but a vague alert like "the app is slow" is exactly the situation where jumping straight to a hypothesis wastes the most time — there's no evidence yet pointing anywhere specific. A disciplined methodology front-loads cheap, broad checks before expensive, narrow ones:

**1. Establish scope and severity.** Is this affecting all users or a subset? All endpoints or specific ones? Is it degrading further or stable? This alone often narrows the search space enormously — "slow for everyone, everywhere" points toward infrastructure/database/network; "slow for one specific flow" points toward that flow's own dependencies.

**2. Check what changed recently.** Deploys, config changes, infrastructure changes, and scaling events in the last few hours are disproportionately the actual cause of a sudden new problem — a system that was fine yesterday and isn't now usually changed *somehow*, even if the change looks unrelated on the surface. This is often the highest-value single check and costs almost nothing to do first.

**3. Check aggregate health signals before diving into logs.** Dashboards for error rate, latency percentiles (p50/p95/p99 specifically — an average can hide a bad tail), CPU/memory/disk on the relevant hosts, and database/queue health give a fast top-level read on where the problem actually lives, without committing to a specific theory yet.

**4. Follow the signal to the specific component, then go deep.** Once aggregate signals point somewhere — a specific service's latency spiking, a database's connection pool exhausted, a downstream dependency timing out — that's when it's time to dig into that component's logs, traces, or specific metrics in detail, rather than starting there.

**5. Mitigate before fully root-causing, if impact is ongoing and severe.** If users are actively affected and a mitigation is available (rollback a recent deploy, scale up a resource-starved component, fail over a degraded dependency), applying it to stop the bleeding is usually the right call even before the root cause is fully understood — full root-cause analysis can happen afterward, especially post-incident, without leaving users impacted in the meantime.

The overall shape is deliberately top-down and cheap-before-expensive: broad scope/severity, then recent changes, then aggregate dashboards, then targeted deep-dive, with mitigation prioritized over full diagnosis whenever user impact is ongoing.

## Symptoms

- A vague alert or report ("app is slow," "users complaining") with no specific error signature or affected component named.
- Ambiguity about whether the issue is isolated or widespread at the moment the page fires.

## Possible Causes

- A recent deploy or configuration change introduced a performance regression.
- A downstream dependency (database, external API, queue) is degraded or saturated.
- Resource exhaustion on the affected hosts (CPU, memory, disk I/O, connection pool limits).
- A traffic spike exceeding normal capacity, unrelated to any code or config change.

## Investigation Steps

1. Check scope: is this all users/endpoints, or a subset? Check the alerting/monitoring dashboard's segmentation, not just the top-line alert.
2. Check the deploy/change log for the last few hours across code, config, and infrastructure.
3. Check aggregate dashboards: error rate, latency percentiles (not just average), resource utilization on relevant hosts and dependencies.
4. Once a signal points somewhere specific, drill into that component's logs/traces for the actual failure detail.
5. If impact is ongoing and a safe mitigation exists (rollback, scale up, failover), apply it before completing full root-cause analysis.

## Commands

```bash
kubectl rollout history deployment/<name>
kubectl top pods -n <namespace>

# Recent deploys/changes across CI
gh run list --limit 10

# Aggregate latency/error signals (example: Prometheus-style query via curl)
curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))'
```

## Resolution

Once scope and a likely cause are identified, apply the smallest safe mitigation that stops user impact — a rollback if a recent deploy correlates with the onset, scaling if resource exhaustion is confirmed, or failing over if a specific dependency is degraded — rather than waiting for a fully confirmed root cause before acting, given the priority of stopping ongoing user impact. Full root-cause confirmation and a permanent fix can follow once the immediate impact is contained.

## Prevention

- Ensure alerts carry enough context by default (which service, which metric crossed which threshold, a link to the relevant dashboard) so the "no other context" scenario is rarer to begin with.
- Maintain an easily accessible, up-to-date deploy/change log so "what changed recently" is a fast lookup, not an investigation of its own.
- Build and maintain dashboards for the key aggregate health signals (latency percentiles, error rate, resource utilization) so the top-down triage steps are fast in practice, not something built from scratch during the incident.
- Practice this methodology via game days or incident drills so it's muscle memory at 2am, not something reasoned out from first principles under pressure.

## Interview Follow-Up Questions

- How would you balance "mitigate first" against the risk that a rollback or failover masks the real problem and it recurs later?
- What would you do differently if the vague alert turned out to correlate with nothing in the last 24 hours of changes?
- How do you decide when to escalate or pull in another team versus continuing to investigate solo?

## Key Takeaways

- Establish scope and severity before forming a hypothesis — a vague alert with no scope check risks investigating the wrong thing.
- Recent changes (deploys, config, infra) are a disproportionately likely cause and are cheap to check first.
- Work top-down from aggregate dashboards to targeted deep-dives, not the reverse.
- Prioritize stopping ongoing user impact via mitigation over completing full root-cause analysis first.

## References

- [Google SRE Workbook: Effective Troubleshooting](https://sre.google/workbook/incident-response/)
- [PagerDuty: Incident Response documentation](https://response.pagerduty.com/)
- [Google SRE Book: Emergency Response](https://sre.google/sre-book/emergency-response/)
