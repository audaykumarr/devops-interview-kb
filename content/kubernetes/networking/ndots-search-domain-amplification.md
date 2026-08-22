---
id: kubernetes-networking-ndots-search-domain-amplification-001
title: "What does a pod's ndots DNS setting default to, and how can it cause unexpectedly slow external DNS lookups?"
category: kubernetes
subcategory: networking
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - conceptual
  - troubleshooting
tags:
  - kubernetes
  - dns
  - ndots
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An application making calls to an external (non-cluster) hostname like `api.example.com` experiences noticeably slower DNS resolution than expected, and generates a surprising number of DNS queries per lookup when traffic is captured. The hostname itself resolves fine when tested directly. What's causing the extra latency and query volume, and what's actually configured to cause it?

## Short Answer

Kubernetes sets every pod's `/etc/resolv.conf` to `ndots:5` by default, alongside a cluster-internal search domain list — any hostname with fewer than 5 dots (nearly every real-world external FQDN) gets several cluster-internal search-suffix lookups attempted first, each a real, failing DNS round-trip, before the correct external name is finally queried. Trailing-dotting the hostname (marking it explicitly fully-qualified) is the most direct fix where supported.

## Detailed Explanation

Kubernetes configures every pod's `/etc/resolv.conf` with `ndots:5` by default, alongside a search list of cluster-internal domain suffixes — this combination means any hostname with fewer than 5 dots (which includes almost every external FQDN, like `api.example.com` at 2 dots) gets several cluster-internal search-suffix lookup attempts tried *before* the actual external name is ever queried as-is, each one an additional real DNS round-trip that fails (since it isn't a real cluster-internal name) before finally trying the correct external name.

## Symptoms

- External hostname resolution is noticeably slower than resolving the same name outside the cluster.
- Packet capture or DNS query logs show multiple queries generated for what the application code treats as a single lookup, with several resulting in NXDOMAIN before one succeeds.
- The affected hostnames typically have fewer than 5 dots in total (most real-world external domains).

## Possible Causes

- The pod's `dnsConfig`/`dnsPolicy` inherits the cluster default `ndots:5` setting, and the hostname being resolved has fewer than 5 dots, triggering search-suffix expansion.
- The application or its HTTP client library doesn't cache DNS results effectively, so this expanded lookup sequence happens repeatedly rather than once.

## Investigation Steps

**Check the pod's actual `/etc/resolv.conf`**: `kubectl exec <pod> -- cat /etc/resolv.conf` shows the `ndots` value and the `search` domain list directly — confirming `ndots:5` (the typical Kubernetes default) and a search list including the cluster's internal domain suffixes (`namespace.svc.cluster.local`, `svc.cluster.local`, `cluster.local`) confirms this is the mechanism in play.

**Count the dots in the actual hostname being resolved**: `api.example.com` has 2 dots — since this is fewer than the configured `ndots:5` threshold, the resolver treats it as "possibly not fully qualified" and tries appending each search suffix *before* trying it as an absolute name, meaning up to 4 failed internal lookups (one per search domain) happen before the 5th, correct, external lookup finally succeeds.

**Capture actual DNS traffic to confirm the query sequence directly**: `tcpdump` inside the pod's network namespace, or CoreDNS's own query logs, showing `api.example.com.default.svc.cluster.local`, `api.example.com.svc.cluster.local`, `api.example.com.cluster.local`, and finally `api.example.com` itself (or a similar sequence depending on the search list) being queried in order, each of the first several failing, is the direct confirmation of this exact mechanism.

## Resolution

Trailing-dot the hostname in application code (`api.example.com.` with a final dot marks it as a fully-qualified domain name, which skips search-suffix expansion entirely, going straight to the absolute lookup) where the application/library supports specifying it that way. Alternatively, set `dnsConfig.options` with a higher `ndots` value scoped to just the pods that need it, or (more surgically) explicitly configure `ndots:1` for pods that primarily resolve external names and rarely need short cluster-internal names — though this requires understanding that pods relying on short in-cluster names (like just `my-service` instead of the fully-qualified form) would then need to use the fully-qualified in-cluster name instead. For applications making many repeated external lookups, ensuring DNS caching happens at the application or a local caching layer (like NodeLocal DNSCache) reduces how often this expanded sequence has to run at all, even if it can't eliminate it entirely without addressing `ndots` directly.

## Key Takeaways

- Kubernetes' default `ndots:5` combined with a hostname having fewer dots than that threshold triggers search-suffix expansion, trying several cluster-internal lookups before the actual external name.
- Each failed search-suffix attempt is a real DNS round-trip, directly adding latency and query volume for external-name resolution.
- Trailing-dotting a hostname (marking it explicitly fully-qualified) skips search-suffix expansion entirely, when the application/library supports it.
- This is a well-known, structural Kubernetes DNS behavior, not a misconfiguration — awareness of it is what allows working around it deliberately for latency-sensitive external calls.

## Interview Follow-Up Questions

- How does NodeLocal DNSCache reduce the impact of this pattern, given it doesn't eliminate the search-suffix expansion itself?
- What would you check to confirm whether a specific application's slow external API calls are actually caused by this mechanism, versus a genuinely slow external DNS provider?
- How would you safely test a reduced `ndots` value for a specific workload without breaking its existing short-form internal Service name lookups?

## References

- [Kubernetes: DNS for Services and Pods — Pod's DNS Policy](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#pod-s-dns-policy)
- [Kubernetes GitHub: ndots issue discussion](https://github.com/kubernetes/kubernetes/issues/33554)
