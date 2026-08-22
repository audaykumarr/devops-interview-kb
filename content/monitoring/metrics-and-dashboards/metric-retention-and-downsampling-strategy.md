---
id: monitoring-metrics-dashboards-retention-downsampling-001
title: "Your Prometheus storage costs are growing unsustainably from keeping raw-resolution metrics for a year. How would you design a retention and downsampling strategy to control costs?"
category: monitoring
subcategory: metrics-and-dashboards
technologies:
  - prometheus
difficulty: advanced
question_type:
  - architecture
tags:
  - monitoring
  - prometheus
  - retention
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your organization currently retains raw, full-resolution Prometheus metrics for a full year, and storage costs have grown to an unsustainable point. But you also don't want to lose the ability to investigate incidents from months ago. How would you design a retention and downsampling strategy that controls cost without meaningfully losing that investigative capability?

## Short Answer

Match resolution to actual need by time horizon: keep raw, full-resolution data for a relatively short recent window (where you need precise, second-by-second detail for active debugging), then progressively downsample older data into coarser resolutions (5-minute, then hourly aggregates) for longer-term retention — this is how tools like Thanos and Cortex are specifically designed to work, since the vast majority of the value of old data is in trend visibility (was there a spike, roughly when, roughly how severe), not perfect original-resolution precision.

## Detailed Explanation

The key insight is that the actual value of historical metrics data changes shape over time — recent data needs to support precise, detailed active debugging, while old data is mostly used for trend analysis, capacity planning, and confirming roughly what happened during a past incident, none of which require full original resolution.

## Requirements

- Recent data (the window where active debugging typically happens) must retain full resolution for precise investigation.
- Older data should still be queryable for trend analysis and rough incident reconstruction, without requiring full-resolution storage cost indefinitely.
- The transition between resolution tiers should be automatic, not require manual intervention as data ages.

## Architecture

**Tiered retention with progressive downsampling**: raw, full-resolution data is retained for a relatively short window (commonly a few weeks, tuned to how far back active debugging realistically needs precise detail), after which it's downsampled into a coarser resolution (e.g., 5-minute rollups) for a medium-term window (several months), and further downsampled again (e.g., hourly rollups) for long-term retention (a year or more) — each tier trades resolution for dramatically reduced storage volume, since a downsampled data point represents an aggregate of many raw points rather than storing each one.

**Tools like Thanos or Cortex/Mimir implement this pattern natively**: rather than building custom downsampling logic, these Prometheus-compatible long-term storage systems handle the tiered storage and automatic downsampling as a built-in feature, with query routing that automatically selects the appropriate resolution tier based on the time range being queried — a query spanning the last hour hits raw data; a query spanning the last year automatically hits the downsampled tier, transparently to whoever's running the query.

**Downsampling preserves min/max/avg, not just average, to retain spike visibility**: naive downsampling that only keeps an average would smooth out and hide brief spikes entirely — retaining min/max alongside the average in downsampled data means you can still see "there was a spike to this severity at roughly this time" even in heavily downsampled historical data, which is exactly the information needed for rough incident reconstruction months later.

**Set retention/downsampling windows based on actual organizational need, not an arbitrary default**: how long you need full resolution depends on how far back active debugging realistically happens (often days to a few weeks); how long you need any historical data at all depends on your actual compliance, capacity-planning, or trend-analysis requirements — these should be deliberately decided, not just inherited from whatever a tool's default happens to be.

## Trade-offs

Downsampled historical data genuinely loses precision — a specific request's exact latency six months ago isn't recoverable from an hourly aggregate, only its rough contribution to the aggregate is visible. This is an accepted, deliberate trade-off for the storage cost reduction, but it means teams need realistic expectations about what old data can and can't answer — "was there a problem around this time, roughly how bad" is answerable; "what was the exact value of this specific metric at this exact second, six months ago" generally isn't, once that window has been downsampled.

## Key Takeaways

- Match data resolution to actual need by time horizon — recent data needs full resolution for active debugging; older data mostly needs trend visibility, not perfect precision.
- Tools like Thanos or Cortex/Mimir implement tiered retention and downsampling natively, with automatic query routing to the appropriate resolution tier.
- Preserve min/max alongside average when downsampling, so spike visibility (which matters for incident reconstruction) survives even in heavily downsampled historical data.
- Set retention and downsampling windows based on your organization's actual debugging and compliance needs, not an arbitrary or inherited default.

## Interview Follow-Up Questions

- How would you decide the exact cutoff for how long to retain full-resolution data, given the trade-off between debugging capability and storage cost?
- How would you communicate to engineering teams what they can and can't expect to find in heavily downsampled historical data?
- How would you validate that your downsampling strategy still preserves enough detail to reconstruct a real past incident, before fully committing to it?

## References

- [Thanos: Downsampling](https://thanos.io/tip/components/compact.md/#downsampling-resolution-and-retention)
- [Grafana Mimir: Compactor and long-term storage](https://grafana.com/docs/mimir/latest/references/architecture/components/compactor/)
