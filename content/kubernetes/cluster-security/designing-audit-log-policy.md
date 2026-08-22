---
id: kubernetes-cluster-security-designing-audit-log-policy-001
title: "How would you design a Kubernetes audit logging policy that's actually useful for a security investigation, without drowning in log volume?"
category: kubernetes
subcategory: cluster-security
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - architecture
tags:
  - kubernetes
  - audit-logging
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Kubernetes' audit logging can record every single API request in exhaustive detail, which produces an enormous volume of log data — most of it routine and uninteresting. A security investigation after an incident needs the audit log to actually contain the relevant detail, without the whole system being unusable due to log volume and cost. How would you design an audit policy that balances these?

## Short Answer

Design a tiered audit policy: log high-value, security-sensitive operations (Secret access, RBAC changes, exec into pods) at full `RequestResponse` detail, log routine but still-worth-recording operations (most writes) at `Metadata` level (who/what/when, without full request/response bodies), and explicitly exclude high-volume, low-value noise (health checks, routine reads by known system components) entirely — rather than either logging everything at maximum detail (unaffordable) or logging too little to be useful during an actual investigation.

## Requirements

- Security-sensitive operations must be logged with enough detail to actually support an investigation (who did what, with what specific data, when).
- Routine, high-volume, low-security-value requests should not overwhelm log storage and cost.
- The policy needs to be maintainable as new resource types and sensitivity considerations emerge over time.

## Detailed Explanation

Kubernetes' `AuditPolicy` supports per-rule audit levels precisely because a single blanket policy (log everything at maximum detail, or log everything minimally) fails one side or the other of this trade-off — the design work is building the tiered rule set that gets each category of request the right level of detail.

## Architecture

**`None`, `Metadata`, `Request`, and `RequestResponse` are the four audit levels, each rule choosing one**: `None` skips logging entirely for matching requests; `Metadata` logs who made the request, what resource, when, and the response code, but not the request/response bodies; `Request` adds the request body; `RequestResponse` logs everything, including the full response body — choosing the right level per category of request is the core of the policy design.

**Secret and ConfigMap access, RBAC changes, and exec/attach operations deserve `RequestResponse` or at least `Request` level**: these are exactly the operations a real security investigation needs full detail on — who read which specific Secret, what RBAC change was made and by whom, who exec'd into which pod — logging these at only `Metadata` level would tell you *that* something happened but not the specific detail an investigation actually needs.

**Routine write operations across most resources are reasonably logged at `Metadata` level**: for the large majority of create/update/delete operations that aren't specifically security-sensitive, `Metadata` level (who, what, when) gives a useful audit trail for general accountability without the storage cost of full request/response bodies for every routine Deployment update.

**High-volume, low-value requests should be explicitly excluded, not just logged minimally**: read-only health-check-style requests from known system components (kubelet's routine `get`/`list` calls, metrics-server's polling) contribute enormous volume with essentially no security value — explicitly setting these to `None` (via rules matching the specific user/resource combination) is what keeps the overall log volume manageable enough to actually store and search cost-effectively.

**Rule order matters — the first matching rule in the policy applies**: `AuditPolicy` rules are evaluated top-to-bottom, and the first one matching a given request determines its audit level — this means more-specific, higher-priority rules (like the Secret-access `RequestResponse` rule) need to be listed before more general catch-all rules, or a broad early rule could inadvertently downgrade a request that should have been logged in full detail.

## Trade-offs

A more granular, tiered policy is more complex to design and maintain than a single blanket level, and requires periodic review as new resource types or new security-sensitivity considerations emerge (a new CRD that itself holds sensitive data should probably get the same `RequestResponse` treatment as Secrets, for instance, but won't automatically unless someone adds that rule). This complexity is worth it specifically because the alternative extremes (log everything, or log too little) each fail a real requirement — unaffordable cost on one side, an unusable log during an actual investigation on the other.

## Key Takeaways

- Kubernetes' audit policy supports four levels (`None`, `Metadata`, `Request`, `RequestResponse`) per rule, which is the mechanism for balancing detail against volume.
- Security-sensitive operations (Secret access, RBAC changes, exec/attach) deserve full detail; routine writes are reasonably logged at `Metadata` level; high-volume low-value requests should be explicitly excluded.
- Rule order matters — the first matching rule applies, so specific high-priority rules need to precede general catch-all ones.
- The policy needs periodic review as new resource types (especially CRDs holding sensitive data) emerge, since they don't automatically inherit appropriate audit treatment.

## Interview Follow-Up Questions

- How would you extend this audit policy to cover a custom resource that itself holds sensitive data, similar to how Secrets are treated?
- How would you set up alerting directly on specific audit log patterns (like an unusual `exec` into a production pod) rather than just retaining the logs for after-the-fact investigation?
- How would you estimate the storage cost impact of a proposed audit policy before actually deploying it to a large production cluster?

## References

- [Kubernetes: Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
