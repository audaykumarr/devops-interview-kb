---
id: networking-dns-intermittent-resolution-failure-001
title: "An application intermittently fails to resolve a hostname — most requests succeed, but a small percentage fail with a DNS error. How would you track this down?"
category: networking
subcategory: dns
technologies:
  - dns
  - linux
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - dns
  - networking
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An application intermittently fails to resolve a hostname it calls constantly — the large majority of requests succeed, but a small, consistent percentage fail with a DNS resolution error. How would you track this down?

## Short Answer

Capture the actual failing resolutions rather than reasoning about it abstractly — `tcpdump` or `dig` in a tight loop against the same resolver the application uses will usually surface either UDP packet loss/timeout to the resolver, a resolver returning `SERVFAIL`/`NXDOMAIN` intermittently, or (very commonly in containerized environments) the classic Linux `glibc` resolver behavior of racing parallel A/AAAA queries and mishandling one of them under specific timing. The failure pattern (does it correlate with load, with a specific resolver, with IPv6) narrows it fast once you're looking at real packets instead of guessing.

## Detailed Explanation

Intermittent DNS failures are frustrating precisely because DNS resolution is usually invisible — applications call a name resolution library function and get an IP back, with no logging of the resolver interaction unless you specifically capture it. The investigation has to start by making that interaction visible: either packet capture between the application host and its configured resolver, or a scripted loop calling `dig`/`getent hosts` repeatedly against the exact same resolver configuration the application uses, watching for the failures to reproduce.

A few specific, well-known causes are worth checking first because they're common and have a recognizable signature. UDP-based DNS queries can be silently dropped under network congestion or by a stateful firewall/NAT with an aggressive UDP conntrack timeout, especially under load — this shows as occasional timeouts correlating with traffic spikes. In containerized environments (Docker, Kubernetes), a well-documented `glibc` behavior sends A and AAAA queries in parallel over the same UDP socket for IPv6-enabled systems, and a race in how the responses are matched up (particularly with `musl` libc, or specific `glibc`/kernel/conntrack combinations) can cause one of the two queries to silently fail, surfacing as intermittent resolution errors that are hard to reproduce outside the exact environment. It's also worth checking whether the failures correlate with a specific one of multiple configured resolvers (in `/etc/resolv.conf`) — if there are two resolvers listed and one of them is subtly broken or overloaded, glibc's fallback behavior between them isn't always as clean as expected.

## Symptoms

- A small, roughly consistent percentage of DNS lookups fail; the majority succeed.
- The application-level error is generic ("could not resolve host," a connection timeout, or similar) without further DNS-specific detail.
- The failure doesn't correlate obviously with a specific hostname, time of day, or an obvious external event.

## Possible Causes

- UDP DNS query packet loss between the application host and its resolver, often correlating with network load or an aggressive NAT/firewall conntrack timeout for UDP.
- The `glibc` parallel A/AAAA query race condition, common in containerized/Kubernetes environments where IPv6 is enabled at the resolver layer but not fully used.
- One of multiple configured resolvers (in `/etc/resolv.conf` or the container's DNS config) being intermittently slow or unreliable, with imperfect fallback behavior to the working one.
- The resolver itself (e.g. a cluster's internal DNS service like CoreDNS) being under-provisioned and occasionally timing out or dropping queries under load.
- A caching resolver returning a stale or incorrect negative-cache entry for a hostname that recently changed.

## Investigation Steps

1. Identify exactly which resolver(s) the application is configured to use (`/etc/resolv.conf`, or the container/pod's DNS config).
2. Run a tight loop of `dig`/`getent hosts` against that exact hostname and resolver, logging failures, to reproduce the issue outside the application.
3. If reproducible, run `tcpdump -i any port 53` (or `-i any port 53 or port 5353` if applicable) during the loop to capture the actual query/response traffic and see whether queries are being sent with no response, or a response is coming back with an error code.
4. Check whether failures correlate with load (CPU/network) on the application host, or with load on the resolver itself (e.g. CoreDNS metrics in a Kubernetes cluster).
5. If in a containerized environment with IPv6 partially configured, check for the known `glibc` parallel-query race — a quick test is disabling IPv6 lookups (or setting `single-request` in `/etc/resolv.conf`'s `options`) and seeing if the failure rate changes.
6. Check the resolver's own logs/metrics for error rates, timeouts, or resource exhaustion during the failure window.

## Commands

```bash
cat /etc/resolv.conf

for i in $(seq 1 200); do dig +short example.com @<resolver-ip> || echo "FAIL $i"; done

sudo tcpdump -i any port 53 -w dns-capture.pcap

# Kubernetes: check CoreDNS for errors/timeouts
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=200
kubectl top pod -n kube-system -l k8s-app=kube-dns
```

## Resolution

If it's UDP packet loss or conntrack-related, the fix is usually infrastructure-level: increasing conntrack table size/timeout, or addressing whatever's causing network congestion at the times failures cluster. If it's the `glibc` parallel-query race, adding `options single-request` (or `single-request-reopen`) to `resolv.conf` forces sequential rather than parallel A/AAAA queries, which is the well-documented workaround. If it's an under-provisioned cluster resolver, scale it (more CoreDNS replicas, adjusted resource limits) or add local caching (e.g. `node-local-dns` in Kubernetes) to reduce the query volume actually hitting the central resolver.

## Prevention

- Add DNS resolution latency and error-rate monitoring at the resolver level, not just inferred from application-level symptoms.
- In Kubernetes specifically, consider a local DNS cache (NodeLocal DNSCache) to reduce load on cluster DNS and reduce the blast radius of any single resolver having a bad moment.
- Set `options single-request` proactively in environments known to be affected by the glibc parallel-query issue, rather than waiting to hit it in production.
- Load-test DNS resolution specifically (not just application throughput) before assuming a new environment's DNS setup will hold up under real traffic.

## Interview Follow-Up Questions

- Why does DNS primarily use UDP instead of TCP, and what are the tradeoffs of that choice for reliability?
- How does `NodeLocal DNSCache` in Kubernetes actually reduce DNS-related failures, mechanically?
- How would you differentiate a client-side resolution problem from the authoritative/upstream DNS server itself being unreliable?

## Key Takeaways

- Intermittent DNS failures need to be made visible via packet capture or reproduction, not reasoned about abstractly.
- UDP packet loss and the glibc parallel A/AAAA query race are the two most common, well-documented causes worth checking first.
- Correlate failures against load (both application host and resolver) as a fast way to narrow the cause.
- `options single-request` in `resolv.conf` is a known, specific fix for one common failure mode — not a universal fix for all DNS intermittency.

## References

- [Kubernetes: Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes: Using NodeLocal DNSCache](https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/)
- [Linux man-pages: resolv.conf(5)](https://man7.org/linux/man-pages/man5/resolv.conf.5.html)
