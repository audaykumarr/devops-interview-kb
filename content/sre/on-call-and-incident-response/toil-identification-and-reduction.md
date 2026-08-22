---
id: sre-on-call-incident-response-toil-reduction-001
title: "Your SRE team spends most of its time on manual, repetitive operational work and has no time left for the reliability engineering they were hired to do. How would you identify and reduce this 'toil' systematically?"
category: sre
subcategory: on-call-and-incident-response
technologies:
  - sre
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - sre
  - toil
  - automation
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your SRE team was hired to do reliability engineering — improving systems, building better tooling, preventing incidents — but in practice, most of their time goes to manual, repetitive operational work: restarting stuck jobs, manually provisioning access, running the same maintenance script every week. How would you identify and systematically reduce this "toil"?

## Short Answer

Toil, in SRE terms, is specifically manual, repetitive, automatable operational work that scales linearly with service growth and doesn't durably improve the service — the fix starts with actually measuring how much time goes to toil versus engineering work (most teams underestimate this until they track it), then prioritizing automation investment on the highest-volume, most mechanical toil first, since that's where automation effort pays back fastest.

## Detailed Explanation

Google's SRE model treats toil as a specific, well-defined category, not just "work that feels tedious" — toil is manual, repetitive, automatable, tactical (reactive rather than strategic), and scales with the service rather than staying fixed as the service grows. That precision matters because it tells you what to actually target: not all operational work is toil (some manual work is genuinely one-off or requires human judgment), and conflating "annoying work" with "toil" leads to trying to automate things that don't actually deserve the investment.

**Measure toil before trying to reduce it**: most teams significantly underestimate how much time actually goes to toil until they track it explicitly — a simple time-tracking exercise (categorizing work as toil versus engineering versus other) over a few weeks typically reveals the actual proportion, which is often the first genuinely surprising and motivating data point for getting buy-in to invest in reduction.

**Prioritize by volume and mechanical repeatability, not by how annoying a task feels**: a task that's manual and repetitive but happens rarely is a lower priority than one that's slightly less annoying but happens daily — the actual payback of automating something scales with how often it recurs, so ranking toil by frequency × time-per-occurrence gives a much more accurate priority order than intuition.

**Set an explicit toil budget, similar in spirit to an error budget**: Google's SRE practice caps the proportion of time a team should spend on toil (a commonly cited target is under 50%) — an explicit target creates organizational pressure to actually invest in reduction, rather than toil quietly consuming more and more time as the service scales, since without an explicit cap there's no natural forcing function pushing back against it.

**Distinguish toil reduction from just building more tooling for its own sake**: the goal is durably reducing recurring manual work, which means tooling investment should be evaluated by "how much toil does this actually eliminate going forward," not just "is this a nice tool to have" — a sophisticated tool that doesn't actually reduce a real, measured category of recurring manual work isn't toil reduction, even if it's technically impressive.

## Key Takeaways

- Toil is a specific category (manual, repetitive, automatable, scales with service growth) — not all tedious work qualifies, and conflating the two misdirects automation effort.
- Measure toil explicitly before trying to reduce it — most teams significantly underestimate the actual proportion until they track it.
- Prioritize automation investment by frequency × time-per-occurrence, not by which task feels most annoying.
- An explicit toil budget (a capped proportion of team time) creates real organizational pressure to invest in reduction, rather than letting toil silently grow with the service.

## Interview Follow-Up Questions

- How would you get leadership buy-in to invest engineering time in toil reduction instead of new features, given toil reduction doesn't produce visible user-facing results?
- How would you handle a piece of "toil" that turns out to require genuine human judgment and isn't actually safely automatable?
- How would you measure whether a toil-reduction investment actually paid off after implementation?

## References

- [Google SRE Book: Eliminating Toil](https://sre.google/sre-book/eliminating-toil/)
