---
id: networking-dns-why-udp-instead-of-tcp-001
title: "Why does DNS primarily use UDP instead of TCP, and what does that choice trade off for reliability?"
category: networking
subcategory: dns
technologies:
  - dns
difficulty: intermediate
question_type:
  - conceptual
tags:
  - dns
  - networking
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

DNS queries primarily use UDP, even though TCP offers reliable, ordered delivery that seems like it would make DNS more robust. Why was UDP chosen as the primary transport, and what does that trade off?

## Short Answer

UDP was chosen because DNS queries and responses are typically small, one-shot request/response exchanges, and UDP avoids TCP's connection-setup overhead (the handshake) for every single lookup — a meaningful performance win at DNS's massive query volume and latency-sensitivity. The trade-off is UDP's lack of built-in reliability: a dropped UDP packet just silently disappears, requiring the DNS client's own retry/timeout logic to detect and recover from it, and UDP's practical packet-size limits historically constrained how much data a single DNS response could carry, which is exactly why DNS falls back to TCP for larger responses.

## Detailed Explanation

A typical DNS query and its response are both small — a hostname lookup and an IP address (or a few) fit comfortably in a single small packet. TCP's connection establishment (the three-way handshake) adds a full network round-trip of overhead *before* any actual data is even exchanged — for a protocol designed around massive volumes of small, latency-sensitive lookups (DNS resolution happens constantly, often multiple times per web page load), that per-query handshake overhead would add up to a meaningful performance cost at scale. UDP, being connectionless, skips that entirely — a query and its response can complete in a single round-trip with no setup cost, which is why UDP was the natural default choice for DNS's actual usage pattern.

The trade-off is genuine: UDP provides no delivery guarantee at all — a query or response packet can simply be dropped somewhere in the network, and neither side is automatically notified. DNS clients handle this themselves with their own timeout and retry logic (if no response arrives within some timeout, re-send the query, potentially to a different configured resolver) — meaning DNS's practical reliability comes from application-level retry behavior layered on top of an inherently unreliable transport, not from the transport itself.

The other historical constraint UDP introduced: traditional DNS-over-UDP responses were limited to 512 bytes without EDNS0 extensions (a later addition raising the practical limit, though still bounded), which is too small for some legitimate DNS responses — a domain with many records, DNSSEC signature data, or a zone transfer. This is exactly why DNS specifies a fallback: when a response would exceed the size a UDP packet can carry, the server sets a "truncated" flag, and the client is expected to retry the same query over TCP instead, which has no such small-packet-size constraint. Zone transfers (a full copy of a DNS zone's data between servers) always use TCP directly, given they're inherently larger, ordered transfers where TCP's reliability and ordering guarantees are actually needed anyway.

## Key Takeaways

- UDP avoids TCP's per-query connection-handshake overhead, which matters enormously given DNS's high query volume and latency sensitivity.
- UDP's lack of built-in reliability means DNS clients implement their own timeout/retry logic to handle dropped packets.
- UDP's practical packet-size limits are why DNS falls back to TCP (via the truncation flag) for responses too large to fit in a single UDP packet.
- Zone transfers always use TCP directly, since they're inherently larger, ordered exchanges where TCP's guarantees are genuinely needed.

## Interview Follow-Up Questions

- How does DNS-over-TLS or DNS-over-HTTPS change this picture, given they're built on TCP-based transports for different reasons (privacy/security, not size)?
- What does EDNS0 actually do to raise the practical UDP response size limit, and what does it not solve?
- How would a client's DNS retry/timeout configuration affect the DNS-resolution-works-sometimes-fails-others symptom discussed in the base question?

## References

- [RFC 1035: Domain Names — Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035)
- [RFC 6891: Extension Mechanisms for DNS (EDNS0)](https://www.rfc-editor.org/rfc/rfc6891)
