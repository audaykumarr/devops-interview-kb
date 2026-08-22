---
id: gitops-repository-patterns-mono-vs-poly-repo-001
title: "For a GitOps setup managing 50 services, would you use one shared config repository or a separate repository per service? What actually drives that decision?"
category: gitops
subcategory: repository-patterns
technologies:
  - gitops
  - kubernetes
difficulty: intermediate
question_type:
  - comparison
tags:
  - gitops
  - repository-structure
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You're setting up GitOps-managed deployments for 50 services. Should the Kubernetes manifests/config live in one shared, central repository, or should each service have its own dedicated config repository? What actually drives this decision?

## Short Answer

A single, central config repository gives easier cross-service visibility and simpler org-wide policy enforcement, at the cost of a repository that many teams touch simultaneously (more merge contention, broader blast radius for a bad change, coarser access control). Per-service repositories give each team clean ownership and isolated blast radius, at the cost of losing easy cross-service visibility and needing more infrastructure (templating, shared policy enforcement) to keep consistency across 50 separate repos. Most organizations at meaningful scale land on a hybrid: per-service repos for application config (matching team ownership boundaries), with a smaller number of shared repos for genuinely cross-cutting infrastructure config.

## Detailed Explanation

The trade-off is fundamentally about where you want contention and blast radius to live, and how much you value centralized visibility versus per-team isolation — neither structure is objectively better, and the right answer depends on team structure and how tightly coupled the 50 services' actual ownership and release cadence are.

**A single central repository gives strong cross-service visibility and simpler org-wide enforcement**: with everything in one place, it's straightforward to see the state of all 50 services at once, apply org-wide policy checks uniformly (one CI pipeline enforcing standards across everything), and reason about the whole system's current desired state from a single source — genuinely valuable for smaller organizations or a platform team that wants tight, central control.

**But a single repository concentrates contention and blast radius**: many teams committing to the same repository increases merge conflict frequency, and a misconfiguration or bad automation in that one repository has a much larger blast radius (potentially affecting all 50 services at once) than a mistake scoped to a single service's own repository — this risk grows directly with the number of teams and services sharing the repo.

**Per-service repositories give clean ownership and isolated blast radius**: each team owns their own repository, changes don't contend with other teams' commits, and a mistake in one service's config repo can't directly affect another service's — this aligns naturally with team-based ownership boundaries and reduces the "one bad change breaks everything" risk.

**But per-service repositories lose easy cross-service visibility and require more infrastructure to stay consistent**: understanding the state of all 50 services now means checking 50 separate repositories rather than one; and keeping consistent standards (security policy, deployment strategy defaults) across 50 independently-owned repos requires either strong shared tooling/templates (see the related golden-path platform-engineering pattern) or accepts that consistency will drift without active investment.

**A hybrid model matches most real organizations' structure**: per-service repositories for application-specific config (aligning with team ownership, minimizing contention and blast radius for day-to-day changes), combined with a smaller number of shared repositories for genuinely cross-cutting infrastructure config (cluster-wide policies, shared networking configuration, platform-level tooling) that legitimately needs central visibility and coordinated changes — this captures much of each model's benefit while limiting each model's downside to the scope where it actually applies.

## Key Takeaways

- A single central repository gives strong cross-service visibility and simpler org-wide enforcement, at the cost of contention and a larger blast radius as more teams and services share it.
- Per-service repositories give clean team ownership and isolated blast radius, at the cost of losing easy cross-service visibility and needing more shared tooling to maintain consistency.
- The right choice depends on team structure and how tightly coupled the services' actual ownership and release cadence are, not on which structure is inherently more sophisticated.
- A hybrid — per-service repos for application config, shared repos for genuinely cross-cutting infrastructure — matches most real organizations' actual structure at meaningful scale.

## Interview Follow-Up Questions

- How would you maintain consistent deployment standards across 50 independently-owned repositories without a central repository enforcing them directly?
- How would you handle a cross-cutting change (a new required security policy) that needs to be applied across all 50 per-service repositories simultaneously?
- How would this decision change for a much smaller organization with 5 services instead of 50?

## References

- [Argo CD: Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Weaveworks: GitOps Guide](https://www.weave.works/technologies/gitops/)
