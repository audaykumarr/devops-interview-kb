---
id: devops-fundamentals-core-concepts-mttr-vs-mtbf-001
title: "A team is proud that their service hasn't had a major incident in 8 months, but when something does break, it takes hours to recover. Which reliability metric should they actually be optimizing for?"
category: devops-fundamentals
subcategory: core-concepts
technologies:
  - devops
difficulty: intermediate
question_type:
  - conceptual
tags:
  - devops-fundamentals
  - mttr
  - mtbf
  - reliability
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team proudly reports 8 months since their last major incident — a strong mean time between failures (MTBF). But when an incident does happen, recovery consistently takes several hours — a poor mean time to recovery (MTTR). Which of these two reliability metrics should the team actually prioritize improving, and why does the answer usually favor one over the other?

## Short Answer

MTTR (mean time to recovery) is generally the more actionable and more consequential metric to optimize for most modern systems, because failures are ultimately inevitable at some frequency regardless of how much prevention effort you invest, while recovery speed directly and predictably determines actual user-facing impact duration for whatever failures do occur. A long MTBF with a poor MTTR means the team is investing effort into preventing an event that will still eventually happen, without preparing for how bad it will be when it does — investing in MTTR reduces the impact of every future incident, known or unknown, while MTBF improvements only help against the specific failure modes you've already anticipated and prevented.

## Detailed Explanation

The comparison isn't "one metric is inherently more important" in the abstract — it's about where additional investment produces more reliable, compounding value, and for most systems past a certain baseline reliability, that answer favors recovery speed over prevention.

**MTBF reflects how well you've prevented known and anticipated failure modes**: improving MTBF (redundancy, better testing, hardening against known failure classes) genuinely helps, but it can only address failure modes you've thought of or experienced before — a system's actual failure surface, especially a complex, evolving one, always includes failure modes nobody has anticipated yet, which MTBF-focused prevention work structurally can't address in advance.

**MTTR reflects how well you respond regardless of what actually failed**: improving MTTR (better monitoring/alerting, clearer runbooks, practiced incident response, faster rollback mechanisms) helps for *any* failure, including the ones nobody anticipated — this is what makes MTTR investment compound in value in a way MTBF investment structurally can't, since it doesn't depend on having predicted the specific failure mode in advance.

**A long MTBF can also create a dangerous false confidence**: 8 months without an incident can lead a team to under-invest in incident response readiness precisely because incidents feel rare and abstract — when the inevitable incident does happen, the team's actual muscle memory for responding quickly may be weaker than a team that handles incidents more frequently and has correspondingly well-practiced, fast response processes.

**The actual user-facing impact of an incident is a function of both frequency and duration, but duration is often the more controllable lever**: total user-facing downtime over a period is roughly (frequency of incidents) × (average recovery time) — for a system that's already reasonably reliable, further reducing an already-low incident frequency has diminishing returns, while cutting recovery time from hours to minutes can produce a much larger proportional improvement in total actual impact.

**This doesn't mean MTBF/prevention work is worthless** — genuinely reducing the frequency of known, understood failure modes is still valuable, especially for failure modes with severe or irreversible consequences where fast recovery doesn't fully mitigate the damage (data loss, for instance, isn't well addressed by fast recovery alone) — but for the general case of "which should we prioritize as the primary investment," MTTR usually offers a better return, especially for a team that already has reasonably infrequent incidents.

**Practical MTTR investments**: good observability/alerting (detecting the problem fast is the first component of recovery time), clear, practiced runbooks and incident response processes (as covered in the related SRE incident-commander and runbook discussions), fast and reliable rollback mechanisms, and a genuinely blameless postmortem culture that lets the team actually learn and improve response speed after each incident rather than just moving on.

## Key Takeaways

- MTTR is generally the more actionable, more consequential metric to prioritize for most systems, since failures are ultimately inevitable and recovery speed determines actual impact duration for whatever does happen.
- MTBF improvements only help against failure modes you've anticipated; MTTR improvements help against any failure, including ones nobody predicted, making MTTR investment compound in value in a way MTBF investment can't.
- A long MTBF can create dangerous false confidence, with a team's incident response readiness atrophying precisely because incidents feel rare.
- Total user-facing impact is roughly frequency × recovery time — for an already-reasonably-reliable system, cutting recovery time often has more available improvement headroom than further reducing an already-low failure frequency.

## Interview Follow-Up Questions

- What's an example of a failure mode where fast MTTR doesn't fully mitigate the impact, meaning MTBF/prevention investment matters more for that specific case?
- How would you build a business case for investing in MTTR improvements to a leadership team that's currently proud of a long MTBF track record?
- How would you measure and track MTTR accurately, given "time to recovery" can be ambiguous about exactly when an incident starts and ends?

## References

- [Google SRE Book: Embracing Risk](https://sre.google/sre-book/embracing-risk/)
- [Google SRE Book: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
