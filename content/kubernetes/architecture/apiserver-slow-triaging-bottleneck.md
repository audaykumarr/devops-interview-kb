---
id: kubernetes-architecture-apiserver-slow-triaging-bottleneck-001
title: "The API server responds slowly to all requests — how do you determine whether etcd, the API server, or something else is the bottleneck?"
category: kubernetes
subcategory: architecture
technologies:
  - kubernetes
difficulty: expert
question_type:
  - troubleshooting
tags:
  - kubernetes
  - control-plane
  - performance
estimated_time_minutes: 9
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

`kubectl` commands and other API interactions have become noticeably slow across the board — not failing, just slow. This could be etcd struggling, the API server itself being under-resourced, admission webhooks adding latency, or something else entirely. How do you systematically narrow down where the actual bottleneck is?

## Short Answer

Start with the API server's own built-in metrics, since it directly measures and exposes request latency broken down by which stage of processing it's spending time in (including a specific etcd-latency measurement) — this single data source usually points directly at whether the slowness originates in etcd, admission control, or the API server's own request handling, without needing to guess.

## Detailed Explanation

The API server's request-processing pipeline has several distinct stages (authentication, authorization, admission control including webhooks, and the actual etcd read/write) — each is independently instrumented, which means the investigation doesn't have to be a guessing game; the API server itself already knows and reports where time is being spent per request.

## Symptoms

- API requests (`kubectl` commands, other clients) take noticeably longer than normal to complete, across a broad range of request types.
- No requests are outright failing — this is a latency problem, not an availability problem.
- The slowness appears consistent or worsening over time, rather than being a one-off spike.

## Possible Causes

- etcd itself is under resource pressure (disk I/O latency, especially — etcd is very sensitive to disk write latency for its consensus log) or approaching its storage size limits.
- The API server pods are under-resourced (CPU throttling, memory pressure) for the current request volume.
- A slow admission webhook (a validating or mutating webhook making an external call, or simply poorly optimized) is adding latency to every request that triggers it.
- A high volume of `LIST`/`WATCH` requests (from many clients, or an inefficient controller pattern) is placing unusual load on both the API server and etcd.

## Investigation Steps

**Check the API server's own request latency metrics, broken down by verb and resource**: `apiserver_request_duration_seconds` (a Prometheus metric the API server exposes) broken down by `verb`/`resource`/`group` reveals which specific request types are slow — if it's broadly all request types, that points toward a systemic cause (etcd or API server resourcing); if it's specific to certain resources or operations, that narrows toward something specific to those (like a webhook that only fires for certain resource types).

**Check etcd's own latency metrics specifically**: etcd exposes `etcd_disk_wal_fsync_duration_seconds` and `etcd_disk_backend_commit_duration_seconds` — these directly measure etcd's disk write latency, which is etcd's most common real bottleneck (etcd's consensus protocol requires durably persisting each write before acknowledging it, making it unusually sensitive to underlying disk performance) — elevated values here point conclusively at etcd/disk as the root cause rather than the API server itself.

**Check API server pod resource usage against configured limits**: `kubectl top pods -n kube-system` (or wherever the API server runs) for CPU/memory usage relative to configured requests/limits — CPU throttling on an under-provisioned API server directly produces exactly this kind of broad, consistent latency increase.

**Check for slow admission webhooks specifically**: the API server logs (or, in newer versions, dedicated webhook latency metrics) can reveal which admission webhooks are being invoked and how long they take — a webhook making a slow external call, or one without a properly configured timeout, adds its own latency directly to every matching request's total time, independent of etcd or API server health.

**Check `LIST`/`WATCH` request volume and patterns**: an unusually high number of `LIST` requests (rather than `WATCH`, which is far more efficient for staying current on changing state) from misbehaving clients or controllers not using informers/caching correctly can place real, avoidable load on both etcd and the API server — `apiserver_request_total` broken down by verb reveals this pattern if present.

## Resolution

Fix follows directly from the identified bottleneck: for etcd disk latency, move etcd to faster storage (a common real fix, since etcd is disproportionately sensitive to disk performance) or address whatever else is competing for that disk's I/O; for API server resourcing, raise its CPU/memory allocation to match actual demand; for a slow webhook, optimize or fix the webhook itself, or adjust its `timeoutSeconds` and failure policy to bound its worst-case impact; for excessive `LIST` traffic, fix the offending client/controller to use `WATCH`-based informers properly instead. Confirm the fix by re-checking the same specific metric that identified the bottleneck, not just observing that things "feel faster."

## Key Takeaways

- The API server's own request-duration metrics, broken down by verb/resource, are the direct, authoritative starting point rather than guessing between possible causes.
- etcd's disk write latency metrics specifically (`fsync`/`backend_commit` duration) are the most direct signal for etcd being the bottleneck, since etcd is unusually sensitive to disk performance.
- A slow admission webhook adds its own latency to every matching request, independent of etcd or API server resourcing — check webhook-specific timing separately.
- Excessive `LIST` request volume from misbehaving clients not using `WATCH`-based informers correctly can be an avoidable, self-inflicted load source worth ruling out.

## Interview Follow-Up Questions

- How would you set up proactive alerting on etcd disk latency, before it degrades into a broadly-felt API server slowdown?
- What's the difference in impact between a slow *mutating* admission webhook and a slow *validating* one, given they're invoked at different points in the request pipeline?
- How would you identify which specific client or controller is responsible for an unusually high `LIST` request volume against the API server?

## References

- [Kubernetes: API Server Metrics](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [etcd: Performance](https://etcd.io/docs/latest/op-guide/performance/)
