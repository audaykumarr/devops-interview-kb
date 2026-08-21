---
id: platform-engineering-golden-paths-what-belongs-001
title: "How do you decide what belongs on a golden path / internal developer platform versus what teams should just be free to do themselves?"
category: platform-engineering
subcategory: golden-paths
technologies:
  - platform-engineering
difficulty: advanced
question_type:
  - conceptual
  - scenario
tags:
  - platform-engineering
  - golden-paths
  - internal-developer-platform
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

You're building an internal developer platform. How do you decide what should become a paved "golden path" — a supported, opinionated, self-service way of doing something — versus what teams should just be left free to do themselves however they want?

## Short Answer

Put something on the golden path when it's high-frequency (many teams need it), low-differentiation (doing it well isn't a competitive advantage for any individual team), and error-prone or costly to get wrong (security, compliance, reliability risk if done inconsistently) — CI/CD pipelines, service scaffolding, secrets management, and standard observability instrumentation are classic examples. Leave things flexible when they're genuinely team-specific, low-frequency, or where the "best" answer legitimately varies by team's actual problem — forcing a golden path there just adds friction without reducing real risk or duplicated effort.

## Detailed Explanation

The temptation in platform engineering is to over-standardize — build a golden path for everything, because consistency feels like it's always good. This backfires because a golden path isn't free: it's a maintenance commitment for the platform team, it constrains what product teams can do without an exception process, and if it's wrong for a given team's actual use case, it becomes an obstacle people route around rather than a help — undermining trust in the platform generally, not just for that one path.

A useful framework is asking three questions per candidate capability:

**Frequency**: is this something most or all teams need to do? A golden path for something only one team ever does isn't a platform investment, it's just that team's tooling wearing a platform label.

**Differentiation**: does doing this well give any individual team a real competitive or technical advantage specific to their problem? If every team's CI/CD pipeline is functionally the same job (build, test, deploy safely), there's no advantage to each team reinventing it — that's pure paved-road territory. If a team's actual product logic or domain-specific tooling is the thing being considered, forcing a shared abstraction there usually fights the team's real requirements instead of helping.

**Risk of getting it wrong**: some things are dangerous enough to be inconsistent about that centralizing them is worth the constraint even before frequency/differentiation is considered — secrets management, production access controls, compliance-relevant logging. A team doing these slightly differently isn't "diversity of approach," it's inconsistent risk exposure across the organization, which is exactly the kind of thing a platform should absorb.

Capabilities that score high on frequency and risk, low on differentiation, are the clearest golden-path candidates: CI/CD pipeline templates, standardized service scaffolding (new-service bootstrapping with sane defaults for observability/logging/health checks baked in), centralized secrets management, standard base container images with security patching handled centrally. Capabilities that are genuinely team-specific — the actual business logic, a team's internal data model, algorithm choices specific to their domain — should stay flexible; a platform trying to standardize those isn't reducing risk, it's just getting in the way of the work that's actually differentiated and valuable.

The other practical signal worth using: build the golden path as the *easiest* path, not the *only* path, at least initially — a platform capability that's genuinely better and lower-friction than doing it yourself gets adopted voluntarily; one that's mandated but worse gets worked around, which tells you it wasn't ready to be mandatory yet.

## Key Takeaways

- Golden-path candidates score high on frequency (many teams need it) and risk-of-inconsistency (security/compliance/reliability), and low on differentiation (doing it uniquely isn't a competitive advantage).
- Forcing standardization on genuinely team-specific, differentiated work adds friction without reducing real risk.
- Making the golden path the easiest option (not the only option) initially reveals whether it's actually good enough to later be mandated.
- A golden path that people route around is a signal the platform team should treat as feedback, not just a compliance problem to enforce harder.

## Interview Follow-Up Questions

- How would you measure whether a golden path is actually succeeding, versus just being nominally adopted?
- How do you handle a team that has a legitimate reason to deviate from the golden path — what's the exception process?
- How would you sunset or retire a golden path that's no longer the right default as the organization's needs evolve?

## References

- [Team Topologies: Platform Teams](https://teamtopologies.com/key-concepts)
- [Spotify Engineering: Golden Paths](https://engineering.atspotify.com/2020/08/how-we-use-golden-paths-to-solve-fragmentation-in-our-software-ecosystem/)
- [platformengineering.org: What is an Internal Developer Platform?](https://platformengineering.org/blog/what-is-an-internal-developer-platform)
