---
id: system-design-observability-centralized-logging-001
title: "Design a centralized logging platform for an organization running roughly 500 microservices across multiple Kubernetes clusters, where engineers currently can't find logs during incidents."
category: system-design
subcategory: platform-design
technologies:
  - kubernetes
  - observability
difficulty: expert
question_type:
  - system-design
  - architecture
tags:
  - observability
  - logging
  - system-design
  - kubernetes
estimated_time_minutes: 14
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Your organization runs roughly 500 microservices across multiple Kubernetes clusters. Today, logs live wherever each pod happens to run, accessible only via `kubectl logs` against the specific cluster and pod — during incidents, engineers routinely can't find the logs they need in time, or the pod has already been evicted and its logs are gone entirely. Design a centralized logging platform that fixes this at your actual scale.

## Short Answer

Build a pipeline that ships every pod's logs off-node immediately (via a node-level agent, not application code), through a buffering/queuing layer that absorbs volume spikes without dropping data, into a searchable, retained store — with structured (not just plain-text) logging enforced as a platform convention so logs are actually queryable by field, not just full-text searched. The platform's job is making "find the logs for this specific request, in this specific service, during this specific time window" fast and reliable at 500 services' worth of volume, not just aggregating everything into one place.

## Detailed Explanation

The core problem with `kubectl logs` as your only logging story is that it ties log availability to the pod's own lifecycle — the moment a pod is evicted, rescheduled, or the node it ran on has an issue, its logs are gone, and even while a pod is alive, an engineer needs direct cluster access and needs to already know exactly which pod to look at. Centralizing logs is fundamentally about decoupling log durability and searchability from any individual pod's lifecycle, and doing that reliably at 500-service volume without either dropping data under load or becoming prohibitively expensive.

## Requirements

- Logs from every pod must be captured and durable beyond that specific pod's lifecycle, even across pod eviction or node failure.
- Engineers must be able to search logs by service, time window, and structured fields (request ID, user ID, error type) — not just full-text search across raw log lines.
- The pipeline must handle real volume spikes (an incident often causes a spike in log volume exactly when logs matter most) without dropping data.
- Access to logs must be controllable per team/service, not a single flat pool everyone can query everything in.

## Assumptions

- Most services are able to emit structured (JSON) logs, or can be migrated to do so as part of platform adoption; some legacy services may need a translation/parsing step.
- The organization has (or is willing to invest in) a log storage backend — self-hosted (Elasticsearch/OpenSearch, Loki) or a managed SaaS — sized for retaining a meaningful window of 500 services' log volume.
- Kubernetes is the common runtime across all 500 services, giving the platform a consistent place to deploy log-shipping agents.

## Architecture

**Node-level log shipping agent, not application-embedded shipping**: a DaemonSet (Fluent Bit or a similar lightweight log forwarder) runs on every node, tailing container log files directly from the container runtime and shipping them off-node — this decouples log durability from the pod's own process, since the agent captures logs regardless of what happens to the originating pod afterward, and avoids requiring every one of 500 services to individually implement its own log-shipping logic.

**A buffering/queue layer absorbs volume spikes**: log volume during an incident is often many times higher than baseline, exactly when reliable log capture matters most — routing shipped logs through a durable queue (Kafka, or the log backend's own ingestion buffer) before they're indexed gives the pipeline room to absorb a spike without dropping data, decoupling the rate logs are produced from the rate the indexing backend can currently process.

**Structured logging as an enforced platform convention, not an optional best practice**: the platform should provide (and effectively require, via linting or a shared logging library) a standard structured log format — consistent fields for timestamp, service name, log level, and a request/trace ID for correlation — since full-text search across unstructured logs at 500-service scale is both slow and imprecise compared to querying specific structured fields.

**Correlation via a shared request/trace ID threaded through the request path**: every log line related to a single user-facing request, across however many of the 500 services that request touches, should carry the same trace ID — this is what actually lets an engineer go from "here's the failing request" to "here's every relevant log line across every service it touched," which is the single most valuable capability for incident debugging at microservice scale.

**Tiered retention matching actual need**: full-detail, fast-searchable logs for a relatively short recent window (days to a couple weeks, where active debugging happens), with older logs moved to cheaper, slower-to-query cold storage (or dropped entirely, depending on compliance needs) — mirroring the same resolution-versus-cost trade-off as metrics retention, since keeping every log line fully indexed forever at this volume is prohibitively expensive.

## Components

- A node-level log-shipping DaemonSet running across every Kubernetes cluster.
- A durable buffering/queue layer between shipping and indexing.
- A structured logging convention and shared library, enforced across the 500 services.
- A trace/request ID propagation mechanism threading through inter-service calls.
- A searchable indexed store with tiered retention (hot recent data, cold older data).
- Per-team/service access control on top of the log store.

## Trade-offs

- Enforcing structured logging as a platform convention requires real migration effort across 500 existing services, some of which may resist the change — this is a genuine adoption cost, not a purely technical decision.
- The buffering/queue layer adds infrastructure and operational complexity (the queue itself needs to be reliable and monitored) in exchange for absorbing volume spikes without data loss — a load-tested requirement given that incident-time spikes are exactly when this pipeline matters most.
- Tiered retention trades searchability of old logs for cost control — teams need realistic expectations about what's actually queryable beyond the hot-tier window.

## Failure Scenarios

- The log-shipping agent itself falls behind or crashes on a node, silently losing logs from every pod on that node during the gap — mitigated by monitoring the shipping agents' own health and lag as a first-class platform metric, not assuming they're working.
- The indexing backend becomes overwhelmed during an incident-driven volume spike, causing search latency or failures exactly when engineers need logs fastest — mitigated by the buffering layer absorbing the spike and by capacity-planning the indexing backend for realistic peak, not just average, volume.
- A service migrates to structured logging incorrectly (malformed JSON, missing required fields), silently breaking correlation for that service's logs — mitigated by validating log format as part of the shared logging library/CI, catching format issues before they reach production.

## Security

Per-team/service access control on the log store matters because logs frequently contain sensitive information (user data, internal system details) that shouldn't be broadly queryable by every engineer across the organization — access should default to a team's own services' logs, with a documented, auditable process for broader cross-service access during genuine incident investigation.

## Scalability

The platform's cost and operational load scale with total log volume across 500 services, which will keep growing as the organization grows — the tiered retention design and the buffering layer are both specifically what let this scale without either unbounded cost growth (retention tiering) or data loss under peak load (buffering), rather than the platform's viability depending on volume staying roughly where it is today.

## Cost Considerations

Log storage and indexing at this scale is a genuinely significant, ongoing cost, dominated by retention window length and indexing granularity — the tiered retention design is the primary cost lever, and should be set deliberately based on actual debugging and compliance needs (see the related metric retention/downsampling question for the same underlying trade-off applied to logs instead of metrics) rather than defaulting to "keep everything forever" out of caution.

## Real-World Approach

1. Start with the shipping and buffering infrastructure (DaemonSet, queue) rolled out across clusters, even before structured logging adoption is complete, since this alone already fixes the "logs disappear when the pod does" problem.
2. Define and publish the structured logging convention and shared library, migrating the highest-traffic or most-incident-prone services first for the fastest return on investment.
3. Add trace ID propagation incrementally, prioritizing the request paths most commonly involved in cross-service incident investigation.
4. Set retention tiers based on actual data about how far back engineers realistically need to search during real incident investigations.
5. Instrument the pipeline's own health (shipping lag, queue depth, indexing latency) as a first-class platform concern from day one.

## Common Mistakes

- Treating log centralization as "just point everything at one Elasticsearch cluster" without addressing structured logging, correlation, or retention strategy — this centralizes the data but doesn't actually make it fast or precise to search at scale.
- Not load-testing the pipeline against realistic incident-time volume spikes, only against steady-state baseline volume.
- Applying uniform, indefinite retention regardless of actual need, leading to unsustainable cost growth as log volume increases with the organization.
- Skipping trace ID propagation, leaving engineers to manually correlate logs across services by timestamp guesswork instead of a reliable shared identifier.

## Interview Follow-Up Questions

- How would you migrate the highest-traffic legacy services to structured logging with minimal disruption?
- How would you handle a service that emits an enormous volume of low-value debug logs, disproportionately consuming the pipeline's capacity?
- How would this design change if some of the 500 services ran outside Kubernetes entirely?

## Key Takeaways

- Centralizing logs is fundamentally about decoupling log durability and searchability from any individual pod's lifecycle, not just aggregating data into one place.
- Structured logging and trace ID correlation are what make logs fast and precise to search at microservice scale — full-text search across unstructured logs doesn't hold up at 500-service volume.
- A buffering/queue layer between shipping and indexing is what lets the pipeline survive incident-time volume spikes without dropping exactly the data that matters most.
- Tiered retention is the primary cost lever, and should be set based on actual debugging need rather than defaulting to indefinite retention.

## References

- [Fluent Bit Documentation](https://docs.fluentbit.io/manual)
- [Grafana Loki: Log aggregation system](https://grafana.com/oss/loki/)
- [OpenTelemetry: Logs](https://opentelemetry.io/docs/concepts/signals/logs/)
