---
id: helm-releases-why-kubernetes-secrets-storage-backend-001
title: "Why does Helm use Kubernetes Secrets as its storage backend by default instead of an external database, and what does that trade off?"
category: helm
subcategory: releases
technologies:
  - helm
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - helm
  - kubernetes
  - architecture
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Helm stores release history and state as Kubernetes Secrets within the cluster itself, rather than in an external database. Why was that design chosen, and what does it trade off compared to an external storage backend?

## Short Answer

Storing release state as Kubernetes Secrets means Helm's entire operational state lives inside the same cluster it's managing, with no external dependency to provision, operate, or lose connectivity to — a Helm client just needs `kubectl`-equivalent cluster access to function fully, nothing else. The trade-off is that release state's availability and durability are now tied entirely to the cluster's own etcd/API server health, and querying or reasoning about release history at scale (across many clusters, or with rich ad hoc queries) is more limited than a purpose-built external database would offer.

## Detailed Explanation

Helm 3 stores each release revision as a Kubernetes Secret (type `helm.sh/release.v1`), labeled with the release name and revision number, containing the release's manifest and metadata. This design choice — storing state as ordinary Kubernetes objects inside the cluster, rather than in an external system — was a deliberate simplification, and it pays off in a few concrete ways: zero additional infrastructure to provision or operate (no separate database to stand up, secure, back up, or maintain uptime for, specifically for Helm's own bookkeeping); the Helm client's only dependency is cluster API access, meaning anyone who can already `kubectl` into the cluster can run Helm with no additional credentials or network paths to configure; and release state naturally travels with the cluster — cloning, backing up, or migrating the cluster's own etcd naturally carries Helm's release history along with it, with no separate backup/restore process needed specifically for Helm's data.

The trade-offs are the direct inverse of those benefits. **Availability coupling**: if the cluster's API server or etcd is degraded, Helm's own state becomes inaccessible at exactly the same time — there's no way to check release history or roll back via an external, independently-available system if the cluster itself is having problems, which is arguably when you'd most want that capability. **Limited cross-cluster visibility**: since each cluster's Helm state lives only in that cluster, answering a question like "which clusters are running version X of this chart" requires querying every cluster individually — an external database backend could, in principle, centralize this for easier fleet-wide querying, which Helm's default design doesn't provide. **Query limitations**: Kubernetes Secrets aren't a rich queryable data store — Helm's own CLI commands (`helm history`, `helm list`) work fine for typical operational needs, but ad hoc analytical queries across release history (trends over time, cross-release comparisons at scale) aren't naturally supported the way a purpose-built database's query capabilities would be.

The overall design reflects Helm's general philosophy of minimizing operational dependencies for a tool meant to be broadly usable without requiring additional infrastructure — a reasonable default trade-off for the vast majority of use cases, with the coupling and query limitations being the accepted cost.

## Key Takeaways

- Storing release state as Kubernetes Secrets means zero external infrastructure dependency — Helm needs only cluster API access to function fully.
- The trade-off is availability coupling: Helm's state is only as available as the cluster's own API server/etcd.
- Cross-cluster visibility and rich ad hoc querying of release history are more limited than a purpose-built external database would offer.
- This reflects a deliberate design philosophy prioritizing minimal operational dependencies over centralized, richly-queryable release data.

## Interview Follow-Up Questions

- How would you build fleet-wide visibility into release versions across many clusters, given this per-cluster storage design?
- What backup/restore considerations does this design introduce for disaster recovery specifically around Helm release history?
- How did Helm 2's Tiller-based architecture differ in this respect, and why was it removed in Helm 3?

## References

- [Helm: Release Metadata / Storage backends](https://helm.sh/docs/topics/advanced/#storage-backends)
- [Helm CLI: helm history](https://helm.sh/docs/helm/helm_history/)
