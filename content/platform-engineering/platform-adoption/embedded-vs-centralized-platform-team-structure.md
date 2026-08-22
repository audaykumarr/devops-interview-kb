---
id: platform-engineering-platform-adoption-embedded-vs-centralized-001
title: "Should platform engineers be organized as one centralized team, or embedded within product teams? What actually determines the right structure?"
category: platform-engineering
subcategory: platform-adoption
technologies:
  - platform-engineering
difficulty: intermediate
question_type:
  - comparison
tags:
  - platform-engineering
  - organizational-design
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Should an organization's platform engineers be structured as one centralized platform team, or embedded within individual product/feature teams? What actually determines the right answer, rather than picking whichever structure is more common?

## Short Answer

Centralized platform teams are the right default for building genuinely shared, reusable capabilities (CI/CD infrastructure, the golden-path templates, core observability tooling) since consistency and avoiding duplicated effort across many teams is exactly the value a platform provides — embedded platform engineers make more sense specifically when a product team has needs so specific to their domain that shared, generic tooling doesn't fit well, and that team needs dedicated infrastructure expertise close to their own context. Most mature organizations use both: a centralized core platform team, plus a smaller number of embedded platform/infrastructure specialists in teams with genuinely unusual needs.

## Detailed Explanation

The right structure follows directly from what kind of work is actually being done — centralization and embedding aren't competing philosophies so much as different structures suited to different kinds of platform work, and conflating them (picking one structure uniformly for all platform-adjacent work) tends to produce a worse outcome than matching structure to work type.

**Centralized structure fits building shared, reusable capabilities well**: when the work is building something many teams will use in the same or similar way (CI/CD pipeline templates, a shared secrets management integration, core observability tooling), a centralized team avoids duplicated effort across teams and produces more consistent, better-maintained shared infrastructure than each team independently building a slightly different version — this is the same underlying reasoning as the golden-path pattern, applied to organizational structure rather than technical architecture.

**Embedded structure fits domain-specific infrastructure needs**: a team with genuinely unusual requirements (specialized hardware, an unusual data processing pipeline, domain-specific compliance needs) benefits from having infrastructure expertise embedded within the team, with deep context on that team's specific domain — a centralized platform team, by design, optimizes for the common case across many teams, and may not have (or want to build) the depth of context a genuinely unusual team's needs require.

**A hybrid model is common and often the most realistic fit**: most mature platform engineering organizations run a centralized core platform team responsible for the shared golden paths and common infrastructure, supplemented by a smaller number of embedded platform/infrastructure specialists within teams whose needs genuinely don't fit the common case — this isn't a compromise so much as matching each kind of work to the structure suited for it.

**The risk of getting this wrong runs in both directions**: over-centralizing (forcing every team's infrastructure need through one central team regardless of fit) recreates the platform-team-as-bottleneck problem for teams with genuinely unusual needs; over-embedding (every team building and maintaining its own infrastructure independently) recreates the original duplicated-effort, inconsistent-tooling problem platform engineering exists to solve in the first place.

**The deciding question for any specific piece of platform-adjacent work**: is this genuinely reusable across many teams in roughly the same form (favoring centralization), or does it require deep, ongoing context specific to one team's unusual domain (favoring embedding)? Applying this question per capability, rather than choosing one structural philosophy for the whole organization, produces a more accurate fit than a uniform default either way.

## Key Takeaways

- Centralized platform teams fit building genuinely shared, reusable capabilities well — the same "golden path" reasoning applied to organizational structure.
- Embedded platform engineers fit teams with domain-specific needs that don't fit the common case well, requiring deep, ongoing context a centralized team wouldn't have.
- A hybrid model — centralized core team plus a smaller number of embedded specialists — is common and often the most realistic fit for a mature organization.
- Apply the "is this genuinely reusable, or does it need deep domain-specific context" question per capability, rather than choosing one structural philosophy uniformly across the whole organization.

## Interview Follow-Up Questions

- How would you decide when a team's needs have become unusual enough to justify an embedded platform engineer, rather than working within the centralized golden path?
- How would you maintain consistency and knowledge-sharing between a centralized platform team and embedded specialists across different teams?
- How would this structural decision change as an organization grows from 20 engineers to 500?

## References

- [Team Topologies: Platform Teams](https://teamtopologies.com/key-concepts)
- [platformengineering.org: What is an Internal Developer Platform?](https://platformengineering.org/blog/what-is-an-internal-developer-platform)
