---
id: linux-disk-management-automating-df-du-divergence-alerting-001
title: "How would you build automated alerting specifically for the df/du divergence pattern, rather than relying on someone noticing it during an incident?"
category: linux
subcategory: disk-management
technologies:
  - linux
  - prometheus
difficulty: intermediate
question_type:
  - practical
tags:
  - linux
  - monitoring
  - disk-space
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The df/du divergence caused by deleted-but-open files is a specific, well-understood pattern. How would you build automated alerting that catches it proactively, rather than only being discovered manually during a disk-full incident?

## Short Answer

Run a scheduled check (a cron job or a Prometheus exporter's custom collector) that periodically runs `lsof +L1`, sums the size of deleted-but-open files it finds, and exposes that as a metric — then alert when that specific metric crosses a meaningful threshold, giving direct, unambiguous visibility into exactly this failure mode rather than relying on inferring it indirectly from a generic "disk usage high" alert.

## Detailed Explanation

A generic "disk usage above 90%" alert is useful but doesn't tell you *why* — by the time it fires, someone still has to manually run `lsof +L1` to check whether this specific pattern is the cause, exactly the manual step that makes the failure mode annoying to catch proactively. Building a dedicated check that directly measures this specific pattern closes that gap.

**Direct measurement approach**: a scheduled script (cron, or better, a custom Prometheus exporter collector run periodically) executes `lsof +L1` (or the equivalent programmatic check via `/proc/<pid>/fd` scanning, cross-referencing against deleted inodes), sums the total size of all deleted-but-open files found, and exposes that sum as a metric (e.g. `node_deleted_open_files_bytes`). This gives a direct, specific number — "there is currently X GB of disk space held by deleted-but-open files" — rather than an inferred, generic disk-usage percentage that could have many other causes.

**Alerting on the specific metric**: with that metric available, an alert can fire when it crosses a meaningful absolute or relative threshold (e.g. more than 5GB, or more than 10% of the filesystem's capacity) — a precise, high-confidence signal that this specific pattern is happening and growing, well before it necessarily contributes to an actual disk-full crisis, giving time to investigate and fix (restart the offending process) proactively rather than reactively during an outage.

**Combining with the general disk-usage alert, not replacing it**: this dedicated check complements, rather than replaces, the standard disk-usage-percentage alert — the general alert still catches disk pressure from any cause (genuinely growing legitimate data, a runaway log file that hasn't been deleted, etc.), while the dedicated deleted-but-open-files metric specifically narrows down *this* particular cause when it's the one responsible, saving investigation time during an actual incident and, ideally, catching the pattern early enough to act before it becomes an incident at all.

**Implementation note for the periodic check itself**: `lsof +L1` can be a moderately expensive operation to run frequently on a busy host with many open files — running it on a reasonable interval (every few minutes, not every few seconds) balances proactive detection against the overhead of the check itself.

## Key Takeaways

- A dedicated metric directly measuring deleted-but-open file disk usage (via periodic `lsof +L1`) gives a precise, high-confidence signal for this specific pattern.
- This complements, rather than replaces, a general disk-usage-percentage alert, which still catches disk pressure from any other cause.
- Alerting on the dedicated metric can catch the pattern early, before it contributes to an actual disk-full crisis, rather than only being discovered reactively.
- Running the check on a reasonable interval balances proactive detection against the overhead of `lsof +L1` itself on a busy host.

## Interview Follow-Up Questions

- How would you build the Prometheus exporter/collector for this metric concretely — what would the implementation actually look like?
- What threshold would you choose for the alert, and how would you justify that number rather than picking arbitrarily?
- How would you extend this same proactive-detection approach to the containerized version of this problem?

## References

- [Linux man-pages: lsof(8)](https://man7.org/linux/man-pages/man8/lsof.8.html)
- [Prometheus: Writing exporters](https://prometheus.io/docs/instrumenting/writing_exporters/)
