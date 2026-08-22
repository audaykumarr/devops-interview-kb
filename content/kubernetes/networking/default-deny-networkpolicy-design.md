---
id: kubernetes-networking-default-deny-networkpolicy-design-001
title: "How would you design NetworkPolicies for a namespace using default-deny-all while still allowing necessary traffic?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - architecture
tags:
  - kubernetes
  - networkpolicy
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A namespace currently has no NetworkPolicies at all, meaning every pod can reach every other pod freely. The security goal is default-deny: nothing should be reachable unless explicitly allowed. How would you design this without breaking the legitimate traffic the namespace's applications actually need?

## Short Answer

Start with a baseline policy that selects all pods and denies all ingress and egress by default, then layer additional, narrowly-scoped policies that explicitly allow exactly the traffic patterns the namespace's applications actually need (specific pod-to-pod paths, DNS resolution, any required external egress) — building up from zero-trust rather than trying to retrofit restrictions onto an already-open namespace.

## Detailed Explanation

Default-deny is a posture, not a single policy object — it's achieved by combining a blanket deny-everything baseline with a deliberately curated set of narrow allow-rules layered on top, and the design work is entirely in getting that layering right without breaking legitimate traffic.

## Requirements

- No traffic should be allowed by default; every allowed path must be the result of an explicit policy.
- DNS resolution must continue working, since it's easy to accidentally block and causes widespread, confusing failures.
- Legitimate application traffic (both within the namespace and to necessary external/cross-namespace destinations) must continue working without disruption.
- The policy set should be maintainable as the namespace's applications evolve, not a one-time snapshot that goes stale.

## Architecture

**The default-deny baseline uses an empty `podSelector` with both policy types specified**: a NetworkPolicy with `spec.podSelector: {}` (matching every pod in the namespace) and `spec.policyTypes: [Ingress, Egress]`, but no `ingress`/`egress` rules at all, denies all traffic by default for every pod it selects — this is the foundational policy everything else builds on top of.

**DNS egress must be explicitly allowed immediately, or nearly everything breaks confusingly**: a default-deny-egress policy blocks DNS resolution (since it's just another network flow) unless explicitly permitted — an egress rule allowing UDP/TCP port 53 to the cluster's DNS service (typically in `kube-system`) needs to be one of the very first additional policies, since without it, applications fail in ways that don't obviously point to "this is a NetworkPolicy problem" (timeouts, resolution failures that look like a DNS outage).

**Additional policies each express one specific, intentional allowed path**: rather than one large, complex policy, separate NetworkPolicies (or separate rules within a small number of them) for each distinct legitimate traffic pattern — "frontend can reach backend on port 8080," "backend can reach the database on port 5432" — keeps each rule's intent legible and independently reviewable, rather than one sprawling policy that's hard to reason about or safely modify later.

**Use `namespaceSelector` and `podSelector` together for cross-namespace traffic**: if the namespace's applications need to talk to something in a different namespace (a shared platform service, for instance), the ingress/egress rule needs to specify both which namespace and which pods within it — omitting the `podSelector` within a matched namespace allows all pods in that namespace, which may be broader than intended.

**Roll out incrementally, validating each addition against real traffic**: applying default-deny in one step to an already-running namespace risks an outage from missing an allowed path nobody remembered to account for — starting in a non-production environment, or using each CNI plugin's available "audit"/log mode (where supported) to observe what traffic *would* be blocked before actually enforcing it, catches gaps before they cause a real incident.

## Trade-offs

A fully explicit default-deny policy set requires ongoing maintenance as the namespace's applications add new traffic patterns — a new microservice-to-microservice call that isn't yet covered by a policy will simply fail, requiring someone to add the corresponding allow-rule, which is friction compared to an open namespace where nothing needs updating. This friction is the intended trade-off for the security benefit, but it does mean the policy set needs a clear owner and a reasonably fast process for adding new legitimate rules, or it becomes an obstacle developers route around rather than a control that's actually respected.

## Key Takeaways

- The default-deny baseline uses an empty `podSelector` matching all pods, with both `Ingress` and `Egress` in `policyTypes`, and no rules — denying everything by default.
- DNS egress needs to be explicitly allowed immediately, since blocking it produces widespread, confusing failures that don't obviously point to NetworkPolicy.
- Express each legitimate traffic pattern as its own clear, narrowly-scoped policy rather than one large complex one, for reviewability and safer future changes.
- Roll out incrementally with an audit/observe step before full enforcement, to catch missing allow-rules before they cause a production outage.

## Interview Follow-Up Questions

- How would you audit an existing, already-open namespace to discover exactly what traffic patterns actually exist, before designing the allow-rules?
- How would you handle a namespace where different teams own different microservices, in terms of who's responsible for adding new allow-rules as services evolve?
- What's the difference in how you'd approach this for egress to the public internet versus egress to other in-cluster namespaces?

## References

- [Kubernetes: Network Policies — Default Deny All Traffic](https://kubernetes.io/docs/concepts/services-networking/network-policies/#default-deny-all-ingress-traffic)
