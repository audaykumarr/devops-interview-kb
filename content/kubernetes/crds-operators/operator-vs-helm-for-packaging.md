---
id: kubernetes-crds-operator-vs-helm-for-packaging-001
title: "For distributing a complex application, when would you package it as a Helm chart versus building a dedicated operator for it?"
category: kubernetes
subcategory: crds-operators
technologies:
  - kubernetes
  - helm
difficulty: advanced
question_type:
  - comparison
tags:
  - kubernetes
  - operators
  - helm
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A vendor distributing a complex stateful application (a database, a message queue) to Kubernetes users could ship it either as a Helm chart or as a dedicated operator with a CRD. Both let a user "install the application" with one command. What's actually different about what each approach provides after installation, and which is the right choice for a genuinely complex, stateful application?

## Short Answer

A Helm chart installs a fixed set of resources and stops — there's no ongoing process managing the application's lifecycle after install; any operational task (a version upgrade, handling a node failure, scaling with proper coordination) is either manual or requires re-running `helm upgrade` with new values. An operator provides continuous, ongoing management — it keeps watching and reconciling the application's state indefinitely, handling operational tasks (failover, backup coordination, safe rolling upgrades with application-specific logic) automatically, which is exactly what a genuinely complex stateful application benefits from, since "installed correctly once" and "operating correctly on an ongoing basis" are different problems for something with real operational complexity.

## Detailed Explanation

**Helm's job ends at install/upgrade time — there's no ongoing process after that**: `helm install` renders and applies a set of manifests; once that's done, Helm itself is no longer involved at all until the next explicit `helm upgrade`/`helm rollback` command — nothing is continuously watching the application's actual runtime state or taking corrective action on its own.

**An operator's reconciliation loop runs continuously, for the application's entire lifetime**: once deployed, an operator keeps watching its custom resources (and the real resources they represent) indefinitely, reacting not just to explicit user-initiated changes but to the application's own runtime state changing (a database replica failing, needing automatic failover; a backup schedule needing to be maintained; a rolling upgrade needing to be sequenced with awareness of which node is currently the primary) — this ongoing, autonomous operational awareness is what Helm fundamentally doesn't provide.

**Complex stateful applications benefit most from operator-level operational knowledge encoded in software**: a database cluster's safe upgrade sequence (which node to upgrade first, how to verify replication caught up before proceeding, how to handle a failed node during the upgrade) is genuine domain expertise that a human operator would otherwise need to apply manually every time — encoding that expertise into an operator's reconciliation logic means it happens correctly and consistently every time, without requiring a human to remember and correctly execute a complex runbook.

**Simpler, genuinely stateless applications rarely need this ongoing operational sophistication**: a stateless web application doesn't have failover coordination, replication state, or complex upgrade sequencing to manage — Helm's "install a fixed set of resources" model is entirely sufficient, and building an operator for it would be solving a problem (ongoing operational complexity) that doesn't actually exist for that kind of workload.

**The two aren't strictly exclusive — an operator is often installed via Helm**: it's common for an operator itself (the operator's own Deployment, RBAC, CRDs) to be packaged and installed as a Helm chart — Helm handles "get the operator's own components installed," while the operator itself then handles the ongoing operational management of whatever it's designed to manage; this combination captures Helm's installation convenience for the operator's own bootstrap, plus the operator's ongoing reconciliation value for the actual managed application.

## Key Takeaways

- Helm's involvement ends after install/upgrade — nothing continuously watches or manages the application's runtime state afterward.
- An operator's reconciliation loop runs continuously for the application's entire lifetime, handling ongoing operational tasks (failover, backup coordination, safe upgrades) autonomously.
- Genuinely complex stateful applications benefit most from operator-encoded operational expertise, since manual runbook execution is error-prone and inconsistent compared to software handling it every time.
- A simple, stateless application rarely needs an operator's ongoing sophistication — Helm's install-and-done model is sufficient, and the two approaches are often combined (operator packaged and installed via Helm).

## Interview Follow-Up Questions

- How would you evaluate whether a specific vendor's operator for a stateful application is actually mature and trustworthy enough to run in production, versus managing that application more manually?
- What operational tasks would you specifically want a database operator to handle automatically, versus tasks you'd still want a human to explicitly approve?
- How would you design the transition path for an application currently managed via a plain Helm chart, if its operational complexity has grown enough to justify building a dedicated operator?

## References

- [Kubernetes: Operator pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/)
- [Helm: Documentation](https://helm.sh/docs/)
