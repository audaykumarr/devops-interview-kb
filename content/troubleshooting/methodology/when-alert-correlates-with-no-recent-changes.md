---
id: troubleshooting-methodology-no-correlation-with-changes-001
title: "What would you do differently if a vague 'app is slow' alert turned out to correlate with nothing in the last 24 hours of changes?"
category: troubleshooting
subcategory: methodology
technologies:
  - observability
difficulty: intermediate
question_type:
  - scenario
tags:
  - troubleshooting
  - incident-response
  - methodology
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Checking recent changes is usually the highest-value first step for a vague performance alert. But sometimes it comes up empty — no deploy, no config change, nothing in the last 24 hours correlates. What would you do differently once that step doesn't pan out?

## Short Answer

Widen the search past "changes to our own systems" — look at external/upstream dependencies (a third-party API, a cloud provider service degrading), traffic pattern changes (organic growth, a new client hammering the API, a bot/scraper), and time-based/cyclical factors (a scheduled batch job, a cron task, a periodic external event) — since "nothing changed in our own deploys" doesn't mean nothing changed at all, it just means the search needs to expand beyond the narrowest, highest-value-first check.

## Detailed Explanation

The "check recent changes first" step is high-value specifically because it's usually right — most sudden problems trace back to *something* that changed, and a deploy or config change is the most common, easiest-to-check category. When that specific category comes up empty, the right response isn't to abandon "something changed" as a hypothesis — it's to recognize the search was scoped too narrowly and widen it systematically, rather than jumping straight to open-ended, unstructured investigation.

**Widen to external/upstream dependencies**: a change on the *other* side of an integration — a third-party API's behavior or performance changing, a cloud provider service (a managed database, a CDN, a queue service) having a degraded period — produces the exact same "nothing changed in our own systems" result while still being a genuine, external "something changed." Checking the status pages and monitoring of every meaningful upstream dependency is the natural next widening step.

**Widen to traffic pattern changes**: a sudden change in traffic — organic growth crossing some capacity threshold, a new client integration sending unexpectedly high volume, a bot or scraper hitting the system harder than normal — can produce performance symptoms with no code or config change at all, since the system's own configuration didn't change, its *load* did. Checking traffic volume and pattern metrics over the same window (not just deploy history) surfaces this category.

**Widen to time-based/cyclical factors**: a scheduled batch job, a cron task, an external event that happens to recur on a schedule (end-of-month processing, a third-party's own scheduled maintenance window) can produce a performance impact that correlates with *time* rather than any discrete "change" at all — checking whether the incident's timing lines up with any known recurring schedule (internal or external) is a different kind of correlation check than "what got deployed."

**If all of these come up empty too**: at that point, the investigation genuinely shifts from "what changed" to direct diagnosis of the currently-slow system's actual behavior — profiling, tracing a slow request live, checking resource utilization trends that might have been gradually building rather than suddenly triggered by any single discrete event (a slow memory leak crossing a threshold, for instance, rather than a sudden change).

## Key Takeaways

- "Nothing changed" at the narrow, first-checked scope (own deploys/config) doesn't mean nothing changed at all — it means the search needs to widen systematically.
- Upstream/external dependencies, traffic pattern shifts, and time-based/cyclical factors are the natural next places to widen the "what changed" search.
- Each of these produces the same "nothing in our deploy history" result while still being a genuine, findable "something changed," just outside the narrowest first-checked category.
- If widening the change-search still comes up empty, the investigation shifts to direct live diagnosis of the system's current behavior rather than continuing to search for a discrete triggering change.

## Interview Follow-Up Questions

- How would you build dashboards that make checking upstream dependency status and traffic patterns as fast and easy as checking your own deploy history?
- How would you distinguish a gradually-building problem (like a slow memory leak) from a suddenly-triggered one during this widened investigation?
- What would make you decide to escalate to another team versus continuing to widen the search yourself?

## References

- [Google SRE Workbook: Effective Troubleshooting](https://sre.google/workbook/incident-response/)
- [Google SRE Book: Emergency Response](https://sre.google/sre-book/emergency-response/)
