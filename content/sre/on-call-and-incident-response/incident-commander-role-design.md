---
id: sre-on-call-incident-response-incident-commander-001
title: "How would you design an incident commander role/process for a company that currently has no formal structure — incidents are just 'whoever notices it first tries to fix it'?"
category: sre
subcategory: on-call-and-incident-response
technologies:
  - sre
difficulty: intermediate
question_type:
  - architecture
tags:
  - sre
  - incident-response
  - incident-commander
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your company currently has no formal incident response structure — when something breaks, whoever notices first tries to fix it, sometimes joined ad hoc by others who happen to see the alerts too. This works okay for small incidents but has caused real confusion during bigger ones (duplicate fixes, nobody communicating status, unclear who's actually in charge). How would you design an incident commander role and process to fix this?

## Short Answer

Separate the "who's fixing the technical problem" role from the "who's coordinating the response" role — an incident commander doesn't need to be the technical expert on the specific system that's broken; their job is coordinating communication, tracking status, making prioritization calls, and keeping responders focused, which is a genuinely different skill set from debugging the actual issue, and trying to do both simultaneously during a big incident is what causes the confusion you're describing.

## Detailed Explanation

The core insight behind the incident commander pattern is that a serious incident has two distinct kinds of work happening simultaneously — the technical work of diagnosing and fixing the problem, and the coordination work of tracking what's been tried, communicating status to stakeholders, and deciding what to prioritize next — and having the same person try to do both is what produces exactly the symptoms you're describing: duplicate effort (nobody's tracking who's doing what), unclear status (nobody's dedicated to communicating it), and unclear authority (nobody's explicitly empowered to make prioritization calls).

## Requirements

- There must be a clear, unambiguous answer to "who is coordinating this incident" at all times during a significant incident.
- Technical responders should be able to focus on debugging without also being responsible for communication and coordination.
- The process needs to scale down gracefully for small incidents that don't need this much structure, not force heavyweight process onto every minor issue.

## Architecture

**Define the incident commander (IC) role as coordination, not technical authority**: the IC's job is tracking the incident's timeline, ensuring someone is actively working every open thread, deciding what to prioritize when there are competing needs, and — critically — owning communication (status updates to stakeholders, coordinating with support/customer-facing teams) so technical responders don't have to context-switch out of debugging to answer "what's the status" repeatedly.

**A clear trigger for when the IC role activates**: define a threshold (a specific severity level, or a time-based rule like "if an incident isn't resolved in 15 minutes, declare an IC") so the process kicks in reliably for genuinely significant incidents without requiring heavyweight process for every minor blip — small incidents can still be handled informally by whoever's on-call, exactly as today.

**A rotation of trained ICs, separate from the technical on-call rotation**: since the IC role doesn't require being the technical expert on every system, a smaller group of people trained specifically in incident coordination (which can include engineers, but the skill being trained is coordination, not any specific system's internals) can serve as IC across a wide range of incidents, rather than needing a different "expert IC" for every possible system.

**A lightweight, explicit incident channel/process for status tracking**: a dedicated communication channel per incident (not mixed into general team chat) where the IC posts periodic status updates and tracks open action items — this is what actually prevents the "nobody knows what's already been tried" confusion, by giving the coordination work a visible home.

## Trade-offs

Introducing an IC role adds a real coordination overhead for incidents that cross the activation threshold — someone has to be trained and available to fill that role, and a company with limited engineering headcount may find maintaining a separate IC rotation genuinely costly relative to team size. It's also possible to over-formalize this for a small team, where the coordination benefit doesn't yet outweigh the process overhead — this pattern earns its value specifically once incidents are frequent or complex enough that the current ad hoc approach is causing real, recurring confusion, which is the situation described here.

## Key Takeaways

- The IC role separates coordination (communication, prioritization, tracking) from technical debugging — trying to do both simultaneously during a big incident is what causes duplicate effort and unclear status.
- The IC doesn't need to be the technical expert on the broken system; coordination is a distinct, trainable skill.
- Define a clear activation threshold so the process scales down gracefully for small incidents, rather than forcing heavyweight structure onto everything.
- A dedicated per-incident communication channel, owned by the IC, is what actually prevents the "nobody knows what's been tried" confusion.

## Interview Follow-Up Questions

- How would you train someone to be an effective incident commander, given it's a different skill from technical debugging?
- How would you handle a disagreement between the IC's prioritization call and a technical responder who thinks a different approach is more urgent?
- How would you measure whether introducing this IC process actually improved incident outcomes, versus just adding overhead?

## References

- [Google SRE Book: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [PagerDuty: Incident Response Documentation](https://response.pagerduty.com/)
