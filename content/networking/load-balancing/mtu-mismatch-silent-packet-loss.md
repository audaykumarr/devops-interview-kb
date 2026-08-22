---
id: networking-load-balancing-mtu-mismatch-001
title: "Small requests to a service work fine, but any request with a larger payload just hangs and eventually times out, with no error on either side. What's the likely cause?"
category: networking
subcategory: load-balancing
technologies:
  - networking
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - networking
  - mtu
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Small requests to a service (a simple GET, a small JSON payload) work fine, but any request with a larger payload — a bigger POST body, a response with a lot of data — just hangs indefinitely and eventually times out. No error appears on either the client or server side; the connection just seems to silently stop making progress. What's the likely cause?

## Short Answer

This is a classic MTU (Maximum Transmission Unit) mismatch symptom: somewhere along the network path, a packet larger than what an intermediate hop can forward gets dropped, and if ICMP "fragmentation needed" messages (which would normally tell the sender to reduce packet size) are being blocked by a firewall along the path, the sender never learns to retry smaller — it just keeps resending the same too-large packet, which keeps getting silently dropped, producing exactly this pattern: small requests fine, larger ones hang with no error.

## Detailed Explanation

Every network link has a maximum packet size (MTU) it can carry, and when a packet larger than that needs to cross a link with a smaller MTU, it either gets fragmented into smaller pieces (IPv4, if fragmentation is allowed) or dropped with an ICMP message telling the sender to reduce its packet size and retry (Path MTU Discovery). The failure mode here happens specifically when that ICMP feedback loop is broken — the oversized packet gets dropped, but the sender never receives the notification telling it why, so it has no way to correct course.

## Symptoms

- Small requests/responses succeed normally; larger ones hang and eventually time out with no explicit error.
- The connection appears to establish successfully (the TCP handshake completes, small early packets go through fine) — the hang happens specifically once a large enough packet needs to be sent.
- The problem may appear only on specific network paths (e.g., through a particular VPN, tunnel, or specific network segment) while working fine on others.

## Possible Causes

- A network path includes a link with a smaller MTU than the sender assumes (common with VPNs, tunnels, or certain cloud networking configurations that add encapsulation overhead, effectively reducing the usable MTU).
- A firewall or security group along the path is blocking ICMP entirely (a common, overly broad "block all ICMP" security practice), which breaks Path MTU Discovery's feedback mechanism specifically — the oversized packet gets dropped, but the "please send smaller" notification never reaches the sender.
- The "don't fragment" flag is set on packets (common for many TCP connections) combined with a smaller-MTU link and blocked ICMP, meaning fragmentation isn't attempted as a fallback either.

## Investigation Steps

1. Confirm the pattern precisely: does the hang correlate specifically with payload/packet size crossing some threshold, by testing with progressively larger payloads to find where it breaks.
2. Check the MTU of every network segment/interface along the actual path (not just the endpoints), particularly any VPN, tunnel, or overlay network segment, since these commonly reduce effective MTU due to encapsulation overhead.
3. Test with `ping` using progressively larger packet sizes and the "don't fragment" flag (`ping -M do -s <size>` on Linux) to directly find the actual path MTU where packets start failing.
4. Check firewall/security group rules along the path for whether ICMP (specifically "fragmentation needed" / "packet too big" messages) is being blocked.

## Resolution

1. **Confirm the diagnosis directly** using the `ping -M do -s <size>` sweep (or equivalent), incrementing size until packets start failing to find the actual effective MTU along the path.
2. **Fix the immediate symptom by explicitly setting a smaller MTU** on the relevant interface(s) or tunnel configuration to match what the path can actually carry, or by adjusting TCP MSS clamping on a router/gateway along the path so TCP connections negotiate a segment size that fits within the actual path MTU from the start.
3. **Fix the underlying ICMP-blocking issue**, if that's contributing — allow the specific ICMP types needed for Path MTU Discovery (`ICMPv6 Packet Too Big`, or the IPv4 equivalent "fragmentation needed") through firewalls along the path, rather than blocking ICMP wholesale, so the normal feedback mechanism can work as designed for future path changes too.
4. **Verify the fix** by re-testing with the payload sizes that previously hung, confirming they now succeed rather than timing out.

## Prevention

- Avoid blocking ICMP wholesale in firewall/security group rules — allow the specific message types Path MTU Discovery depends on, rather than a blanket "block all ICMP" rule that seems safe but breaks this feedback mechanism.
- When introducing a new network overlay, VPN, or tunnel, explicitly verify and account for its effective MTU (accounting for its encapsulation overhead) rather than assuming it matches the underlying network's MTU.
- Consider TCP MSS clamping at network boundaries where MTU mismatches are structurally likely (VPN gateways, tunnel endpoints), so connections negotiate an appropriately sized segment from the start rather than relying entirely on Path MTU Discovery working correctly.

## Key Takeaways

- "Small requests work, larger ones hang silently with no error" is a classic signature of an MTU mismatch combined with blocked ICMP breaking Path MTU Discovery's feedback loop.
- Blocking ICMP wholesale (a common but overly broad firewall practice) is what turns a normal, self-correcting MTU mismatch into a silent, hard-to-diagnose hang.
- `ping -M do -s <size>` (or equivalent) directly measures the actual path MTU, giving a fast, concrete diagnosis rather than guessing.
- Fix both the immediate symptom (correct MTU/MSS configuration) and the underlying cause (allow necessary ICMP types) so future path or network changes don't reproduce the same silent failure.

## References

- [RFC 1191: Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc1191)
- [Linux man-pages: ping(8)](https://man7.org/linux/man-pages/man8/ping.8.html)
