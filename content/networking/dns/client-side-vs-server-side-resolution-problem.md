---
id: networking-dns-client-vs-server-side-problem-001
title: "How would you differentiate a client-side DNS resolution problem from the authoritative or upstream DNS server itself being unreliable?"
category: networking
subcategory: dns
technologies:
  - dns
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - dns
  - troubleshooting
  - networking
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

DNS resolution is intermittently failing. How would you determine whether the problem is on the client side (the resolver configuration, the local network path) versus the authoritative or upstream DNS server itself being unreliable?

## Short Answer

Query the same name directly against multiple different resolvers (the client's configured resolver, a known-reliable public resolver like 8.8.8.8, and the domain's actual authoritative nameserver directly) from the same client — if only the client's configured resolver fails while the others succeed consistently, the problem is client-side (local resolver config, local network path to that specific resolver); if the failure is consistent even querying the authoritative server directly, the problem is genuinely upstream/authoritative.

## Detailed Explanation

The isolation technique works by holding the client constant and varying only which resolver answers the query — whichever resolver(s) the failure follows tells you where in the chain the actual problem sits.

## Symptoms

- DNS lookups for a specific name fail or time out intermittently.
- Uncertainty about whether the cause is local (client, local resolver, local network) or remote (upstream resolver, authoritative server).

## Possible Causes

- Client-side: local resolver misconfiguration, local network path issues to the configured resolver specifically, conntrack/UDP issues (as covered in the NodeLocal DNSCache context) affecting only traffic to the local resolver.
- Server-side: the authoritative nameserver for the domain being unreliable, network issues between the client's resolver and the authoritative server, or the upstream resolver itself (if using a third-party public resolver) having its own problems.

## Investigation Steps

1. Query the failing name against the client's currently-configured resolver directly and repeatedly (`dig @<configured-resolver> <name>` in a loop) to reproduce and quantify the failure rate.
2. Query the same name, from the same client, against a different, known-reliable resolver (a public resolver like 8.8.8.8 or 1.1.1.1) the same number of times — if this consistently succeeds while the configured resolver fails, the problem is specific to that resolver or the path to it, not the domain's DNS setup itself.
3. Query the same name directly against the domain's actual authoritative nameservers (found via `dig NS <domain>`, then querying those specific servers directly, bypassing any intermediate resolver) — if this also fails consistently, the problem is genuinely at the authoritative/upstream level, not anything client-side.
4. If the configured resolver specifically fails while others succeed, check the network path to that resolver specifically (packet loss, latency) and its own configuration/logs if it's a resolver you control.

## Commands

```bash
dig @<configured-resolver-ip> <domain>
for i in $(seq 1 20); do dig @<configured-resolver-ip> <domain> +short +time=2 +tries=1 || echo "FAILED attempt $i"; done

dig @8.8.8.8 <domain>

dig NS <domain>
dig @<authoritative-ns-from-above> <domain>
```

## Resolution

If the failure isolates to the client's specific configured resolver, the fix is on that side — correcting resolver configuration, addressing local network path issues, or replacing an unreliable resolver with a more reliable one (public resolver, or fixing whatever's wrong with a self-hosted one like NodeLocal DNSCache or CoreDNS). If the failure reproduces even querying the authoritative server directly, the fix is entirely outside the client's control — this needs to be escalated to whoever manages the authoritative DNS infrastructure (the domain's DNS provider, or an internal team if it's an internal authoritative zone), since no client-side change can fix a genuinely unreliable authoritative server.

## Prevention

- Configure multiple resolvers (not just one) in client DNS configuration where the platform supports automatic failover, so a single resolver's unreliability doesn't cause total resolution failure.
- Monitor resolver health and latency proactively (from representative client locations) rather than only discovering resolver unreliability when someone notices resolution failures.
- For domains you control, monitor authoritative nameserver health and latency directly, independent of any specific client's experience.

## Key Takeaways

- Querying the same name against multiple different resolvers (configured, a known-reliable public one, and the authoritative server directly) isolates whether the failure is client-side or genuinely upstream.
- A failure specific to the client's configured resolver, while others succeed, points to local resolver/network issues.
- A failure that reproduces even querying the authoritative server directly means the problem is genuinely outside client-side control.
- This same client-side-vs-server-side isolation technique generalizes to most "works sometimes, fails other times" networking symptoms, not just DNS specifically.

## Interview Follow-Up Questions

- How would you distinguish a genuinely unreliable authoritative server from a transient issue that happened to occur during your specific test window?
- How would you build ongoing, automated monitoring for this specific isolation technique, rather than doing it manually during each incident?
- How does this investigation change if DNSSEC validation is involved, given validation failures can look similar to resolution failures?

## References

- [Linux man-pages: dig(1)](https://linux.die.net/man/1/dig)
- [RFC 1035: Domain Names — Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035)
