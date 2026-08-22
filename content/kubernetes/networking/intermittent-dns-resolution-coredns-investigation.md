---
id: kubernetes-networking-intermittent-dns-coredns-investigation-001
title: "A pod resolves a Service's DNS name intermittently but not consistently — how do you investigate CoreDNS itself?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - kubernetes
  - dns
  - coredns
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An application intermittently fails to resolve an in-cluster Service's DNS name — most lookups succeed, but a meaningful percentage time out or fail, with no obvious pattern. Client-side retry configuration and application code haven't changed. How do you investigate CoreDNS itself as a potential cause, rather than assuming it's the application?

## Short Answer

Check CoreDNS's own resource usage and throttling first — CPU throttling on CoreDNS pods (from an under-provisioned CPU limit relative to actual query volume) is one of the most common causes of exactly this intermittent-not-total failure pattern, since a throttled CoreDNS pod drops or delays a fraction of queries rather than failing entirely. Beyond that, check CoreDNS pod count/distribution relative to query volume, and the upstream resolution path for external-name lookups specifically.

## Detailed Explanation

Intermittent (not total) failure is itself a specific signal — a completely broken CoreDNS would produce consistent failure, while a resource-constrained or overloaded one produces exactly the "usually works, sometimes doesn't" pattern being described, which is why checking CoreDNS's own health and capacity is the right first move rather than assuming the application changed something.

## Symptoms

- DNS lookups for in-cluster Service names succeed most of the time but intermittently time out or fail.
- No application-side change coincides with the onset of the issue.
- The failure rate may correlate with overall cluster traffic/load, though this isn't always obvious without specifically checking.

## Possible Causes

- CoreDNS pods are CPU-throttled due to an under-provisioned CPU limit relative to actual query volume, causing dropped or delayed responses under load.
- Too few CoreDNS replicas for the cluster's actual query volume, causing queuing/overload during peak periods.
- Node-level network issues specifically affecting the nodes CoreDNS pods happen to be running on.
- For external-name lookups specifically (not in-cluster Services), the upstream DNS server CoreDNS forwards to is itself intermittently slow or unreliable.

## Investigation Steps

**Check CoreDNS pods' actual resource usage against their configured limits**: `kubectl top pods -n kube-system -l k8s-app=kube-dns` compared against the CoreDNS Deployment's configured CPU/memory limits — a pod's usage consistently near its CPU limit is a strong signal for throttling; `kubectl describe pod` on a CoreDNS pod can also show throttling-related information if available, and checking `container_cpu_cfs_throttled_seconds_total` (if cAdvisor/Prometheus metrics are available) gives a direct throttling measurement.

**Check CoreDNS's own error/latency metrics if Prometheus monitoring is in place**: CoreDNS exposes Prometheus metrics including query counts, error counts, and response latency histograms — `coredns_dns_responses_total` broken down by response code, and `coredns_dns_request_duration_seconds` for latency, directly show whether CoreDNS itself is failing or slow to respond, rather than needing to infer this indirectly from application-side symptoms.

**Check CoreDNS replica count against cluster size and query volume**: a small, fixed number of CoreDNS replicas that hasn't scaled alongside cluster growth is a common, simple cause — comparing current replica count against the cluster's actual node/pod count and query rate reveals whether this is simply a capacity problem that's grown over time.

**For failures specific to external (non-cluster-local) names, check the upstream resolver path separately**: CoreDNS's `forward` plugin configuration determines where external DNS queries go — testing resolution of the same external name directly against the configured upstream (bypassing CoreDNS) helps distinguish an upstream DNS reliability issue from a CoreDNS-internal one.

**Correlate failure timing against overall cluster query volume or specific traffic spikes**: if intermittent failures cluster around known high-traffic periods, that's strong circumstantial evidence for a capacity/throttling explanation rather than something intrinsic to specific queries or specific client pods.

## Resolution

If CPU throttling is confirmed, raise CoreDNS's CPU request/limit to match actual measured usage (and consider whether `limits` should be removed or raised significantly, since throttling specifically results from hitting a CPU limit). If replica count is insufficient for query volume, scale CoreDNS horizontally (and consider enabling the cluster-proportional-autoscaler pattern, which scales CoreDNS replica count based on cluster size automatically). If the issue is upstream-resolver-specific, address that separately (a different upstream, or NodeLocal DNSCache to reduce reliance on centralized CoreDNS for cacheable queries). Confirm resolution by monitoring the CoreDNS metrics identified during investigation over a subsequent period that previously showed the intermittent pattern.

## Key Takeaways

- Intermittent (not total) DNS failure is itself informative — it points toward a resource/capacity constraint on CoreDNS rather than a total outage or misconfiguration.
- CPU throttling on under-provisioned CoreDNS pods is one of the most common causes of exactly this failure pattern.
- CoreDNS's own Prometheus metrics (response codes, latency) give direct evidence, rather than inferring CoreDNS health indirectly from application-side symptoms.
- Distinguish in-cluster Service name resolution issues from external-name resolution issues, since the latter depends on CoreDNS's upstream forwarding configuration, a separate potential failure point.

## Interview Follow-Up Questions

- How does NodeLocal DNSCache in Kubernetes actually reduce DNS-related failures, mechanically, and would it help in this specific scenario?
- How would you set up alerting on CoreDNS throttling or error rate proactively, before it manifests as an application-level intermittent failure?
- What's the difference between this investigation and diagnosing a client-side DNS resolution problem versus the authoritative/upstream server being unreliable, for a query that isn't cluster-internal at all?

## References

- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [CoreDNS: Metrics Plugin](https://coredns.io/plugins/metrics/)
