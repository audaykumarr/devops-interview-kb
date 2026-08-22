---
id: sre-on-call-incident-response-rotation-fairness-001
title: "One engineer on your team has quietly been covering far more on-call shifts than everyone else because they're 'just better at it' and others avoid volunteering. How do you fix this before it causes burnout?"
category: sre
subcategory: on-call-and-incident-response
technologies:
  - sre
difficulty: intermediate
question_type:
  - scenario
tags:
  - sre
  - on-call
  - burnout
  - team-health
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You notice one engineer on your team has been quietly covering significantly more on-call shifts than everyone else over the past several months — informally, because they're seen as "just better at handling incidents" and other team members have gravitated toward not volunteering as often. Nobody planned this deliberately, but it's happened. How do you fix it before it causes burnout, given the informal arrangement is genuinely working better in the moment?

## Short Answer

Move to an explicit, enforced rotation schedule rather than relying on informal volunteering, even though it feels less efficient in the short term — the informal arrangement optimizes for "who's best at handling incidents right now" at the direct cost of that person's sustainability and the rest of the team's skill development, and both of those costs compound silently until they surface as a real problem (burnout, a single point of failure, an underdeveloped team).

## Detailed Explanation

The informal arrangement is a classic case of a locally-optimal, globally-harmful pattern: in any single incident, having the most capable person respond does produce the best immediate outcome, which is exactly why the pattern persists — nobody's making an obviously bad individual decision, but the aggregate effect over months is one person absorbing disproportionate operational burden while the rest of the team's incident-response skills atrophy from disuse.

**Recognize this as both a burnout risk and a skill-development gap simultaneously**: the engineer taking on more shifts is at real risk of burnout regardless of how capable or willing they currently seem, and the rest of the team is falling further behind on the actual experience needed to competently handle incidents themselves — both problems get worse the longer the informal pattern continues, since the skill gap makes the imbalance feel even more justified over time ("they really are the only one who can handle this well").

**Move to an explicit, structured rotation rather than volunteer-based coverage**: a defined schedule (whether simple round-robin or a fairness-weighted algorithm accounting for shift difficulty/time-of-day) removes the informal social dynamic that led to this imbalance — this needs genuine team buy-in, since a mandated schedule imposed without discussion can feel punitive rather than protective, especially to the engineer being pulled back from a role they may have taken some pride in.

**Pair less-experienced on-call engineers with support during the transition**: shadowing shifts, a documented escalation path to the more experienced engineer (not as their job to always answer, but as a genuine safety net during the ramp-up period), and accessible runbooks/documentation reduce the risk that the transition itself causes worse incident outcomes while the rest of the team builds real experience.

**Address the underlying skill gap directly, not just the schedule**: if the imbalance persisted partly because other team members genuinely feel underprepared, invest in incident response training, tabletop exercises, or reviewing past incidents together — fixing just the schedule without addressing the actual skill gap risks worse incident outcomes during the transition, and reinforces the original justification for the imbalance.

## Key Takeaways

- An informal "most capable person handles it" pattern optimizes for the immediate incident at the cost of sustainable team-wide capability — both costs compound silently over time.
- Move to an explicit, structured on-call rotation, with genuine team buy-in, rather than relying on volunteer-based informal coverage.
- Support less-experienced on-call engineers during the transition (shadowing, escalation paths, documentation) rather than just handing them the schedule and hoping.
- Address the underlying skill gap directly (training, exercises, incident reviews) — fixing the schedule alone without building real team-wide capability risks worse outcomes during the transition.

## Interview Follow-Up Questions

- How would you handle pushback from the overburdened engineer if they actually enjoy the role and resist being pulled back from it?
- How would you measure whether the rotation change actually improved team-wide incident response capability, not just redistributed the schedule?
- How would you structure a fairness-weighted rotation, given not all on-call shifts carry equal burden (weekday daytime versus weekend overnight)?

## References

- [Google SRE Book: Being On-Call](https://sre.google/sre-book/being-on-call/)
- [PagerDuty: On-Call Health](https://www.pagerduty.com/resources/learn/what-is-on-call/)
