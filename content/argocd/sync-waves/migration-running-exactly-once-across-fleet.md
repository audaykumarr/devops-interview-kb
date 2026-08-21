---
id: argocd-sync-waves-migration-exactly-once-fleet-001
title: "How would you handle a migration that needs to run exactly once across an entire fleet of clusters, not just once per cluster?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - kubernetes
difficulty: expert
question_type:
  - architecture
tags:
  - argocd
  - gitops
  - multi-cluster
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The content-hash-naming pattern ensures a migration Job runs once per cluster. But some migrations (a shared database migration, a global resource change) genuinely need to run exactly once across an entire fleet of clusters, not once independently in each. How would you handle that?

## Short Answer

Don't run the migration as a per-cluster Argo CD-managed Job at all — run it as a separate, single, centrally-coordinated operation (a one-time job triggered outside any individual cluster's GitOps sync, targeting the shared resource directly) with its own idempotency/locking mechanism to guarantee exactly-once execution, and treat each cluster's Argo CD-managed deployment as depending on that migration having already completed, rather than each cluster attempting to run it independently.

## Detailed Explanation

The mismatch is structural: per-cluster GitOps mechanisms have no visibility into what other clusters are doing, so exactly-once-across-a-fleet has to be solved by a mechanism that sits above any individual cluster's sync cycle, not by trying to coordinate clusters with each other.

## Requirements

- The migration must execute exactly once across the fleet, not once per cluster.
- Each cluster's normal GitOps deployment shouldn't need to coordinate directly with other clusters to achieve this.
- The mechanism must handle the case where multiple clusters' syncs could otherwise race to run the migration simultaneously.

## Architecture

**Recognize the mismatch**: per-cluster, content-hash-named Jobs are inherently a per-cluster mechanism — each cluster's Argo CD instance independently manages its own Application and its own Jobs, with no built-in cross-cluster coordination at all. A migration needing fleet-wide exactly-once semantics is a fundamentally different problem than what Argo CD's per-cluster sync-wave/hook mechanisms are designed to solve, and trying to force it into that model (hoping only one cluster happens to "win" a race) is fragile and not a genuine solution.

**Run the migration as a separate, centrally-coordinated operation**: rather than embedding the migration as a per-cluster Argo CD Job, run it as its own standalone operation — a one-time script or Job executed from a central CI/CD pipeline or a dedicated operational tool, targeting the shared resource (a shared database, a global API) directly, entirely outside any individual cluster's GitOps sync cycle. This sidesteps the coordination problem structurally, since there's only ever one execution triggered from one place, rather than N independent cluster syncs each potentially attempting it.

**Build genuine idempotency/locking into the migration itself, as defense in depth**: even with centralized triggering, the migration script itself should still be idempotent or use an explicit locking mechanism (a database-level advisory lock, or a marker record checked before executing) — protecting against the operational mistake of someone accidentally triggering it twice, rather than relying purely on "we only trigger it from one place" as the sole safety mechanism.

**Sequence cluster deployments to depend on the migration's completion**: each cluster's actual GitOps-managed deployment (the application code depending on the migrated schema/resource) should be sequenced to only deploy after the centralized migration is confirmed complete — this could be a manual gate (deploy the migration, confirm success, then trigger the fleet-wide application deployment) or an automated check (each cluster's deployment pipeline verifies the migration's completion marker before proceeding).

**Document this as a deliberately different operational pattern from per-cluster migrations**: making it explicit, in team documentation and in the migration's own tooling, that fleet-wide migrations are handled through this separate, centralized mechanism — not the per-cluster Argo CD Job pattern — avoids someone reflexively reaching for the per-cluster pattern for a migration that actually needs fleet-wide semantics.

## Trade-offs

Centralizing fleet-wide migrations outside GitOps trades away some of GitOps' "everything is declared and synced automatically" simplicity for a mechanism that actually provides the correct exactly-once guarantee — a reasonable trade for the genuinely different problem this represents, but worth being clear that it's a deliberate exception to the normal per-cluster GitOps pattern, not a variation of it. Building genuine locking into the migration script itself is extra engineering effort beyond just "trigger it once," but is the necessary defense-in-depth against operational mistakes that pure process discipline alone won't fully prevent.

## Key Takeaways

- Per-cluster Argo CD Job mechanisms (content-hash naming, hook-delete-policy) are inherently scoped per-cluster and don't provide cross-cluster exactly-once guarantees.
- A fleet-wide migration should run as a separate, centrally-triggered operation outside any individual cluster's GitOps sync, not as a per-cluster Job.
- Build genuine idempotency or locking into the migration itself as defense in depth, not relying solely on "we only trigger it from one place."
- Sequence each cluster's dependent deployment to verify the centralized migration's completion before proceeding.

## Interview Follow-Up Questions

- How would you design the completion-marker check each cluster's deployment pipeline uses to verify the migration finished before proceeding?
- What would you do if the centralized migration partially fails, having already affected some but not all of what it needed to?
- How would you handle a migration that needs to be fleet-wide for some clusters but per-cluster for others (a hybrid deployment topology)?

## References

- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
- [PostgreSQL: Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
