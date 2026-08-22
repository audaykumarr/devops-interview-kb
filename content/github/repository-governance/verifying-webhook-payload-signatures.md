---
id: github-repository-governance-webhook-signature-verification-001
title: "A service accepts GitHub webhook payloads and triggers a deployment based on push events, but doesn't verify where the request actually came from. What's the risk, and how do you fix it?"
category: github
subcategory: repository-governance
technologies:
  - github
difficulty: intermediate
question_type:
  - security
tags:
  - github
  - webhooks
  - security
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An internal service exposes an HTTP endpoint that accepts GitHub webhook payloads and triggers a deployment whenever it receives a `push` event for `main`. The endpoint parses the JSON payload and acts on it, but never verifies the request actually came from GitHub. What's the actual risk, and how do you fix it?

## Short Answer

Without verification, anyone who discovers the endpoint's URL can send a forged payload shaped like a legitimate GitHub webhook, potentially triggering an unauthorized deployment or other automated action — since the endpoint has no way to distinguish a genuine GitHub-originated request from a crafted one. The fix is validating the webhook's HMAC signature (sent in the `X-Hub-Signature-256` header), computed using a shared secret configured both in GitHub's webhook settings and in the receiving service, which cryptographically proves the payload actually came from GitHub and hasn't been tampered with in transit.

## Detailed Explanation

The core problem is that an HTTP endpoint, by itself, has no inherent way to know who sent a request — anyone who knows or guesses the URL can send an HTTP POST with any JSON body they choose, and without cryptographic verification, a service has no way to distinguish "this genuinely came from GitHub" from "this is a crafted payload from anyone on the internet."

**GitHub signs every webhook payload with a shared secret you configure**: when setting up a webhook, you provide a secret value known only to you and GitHub; every payload GitHub sends includes an `X-Hub-Signature-256` header containing an HMAC-SHA256 signature computed over the payload body using that shared secret — a receiving service that knows the same secret can independently compute the same HMAC over the received body and compare it against the header's value.

```python
import hmac
import hashlib

def verify_signature(payload_body, secret, signature_header):
    expected = "sha256=" + hmac.new(
        secret.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

**A matching signature proves both authenticity and integrity**: since only someone who knows the shared secret could produce a signature that matches a specific payload, a valid signature confirms the request genuinely originated from a source that knows your configured secret (in practice, GitHub, assuming the secret hasn't leaked) — and because the signature is computed over the exact payload bytes, it also confirms the payload wasn't tampered with in transit, since any modification would produce a different, non-matching signature.

**Use constant-time comparison, not a simple string equality check, when comparing signatures**: `hmac.compare_digest()` (or the equivalent in other languages) compares strings in a way that takes the same amount of time regardless of where they first differ, preventing a timing-attack that could otherwise let an attacker guess the correct signature byte-by-byte based on how long the comparison takes — a naive `==` string comparison is vulnerable to this, even though it's functionally "correct" for legitimate use.

**Reject any request that fails signature verification, before processing the payload at all**: the verification check should happen as the very first step, rejecting the request immediately on a mismatch, rather than parsing and partially acting on the payload before checking — this ensures an unverified request can't trigger any side effects even if verification happens to occur later in the code path than ideal.

**This is a specific instance of a general principle worth recognizing**: any endpoint accepting webhook-style callbacks from an external system (not just GitHub) should verify the request's authenticity via whatever signing mechanism that system provides — the same underlying risk (anyone can POST to a public URL) and the same underlying fix (cryptographic signature verification using a shared secret) applies broadly, not just to this specific GitHub scenario.

## Key Takeaways

- Without signature verification, any HTTP endpoint accepting webhook payloads can't distinguish a genuine request from a forged one sent by anyone who knows the URL.
- GitHub signs webhook payloads with HMAC-SHA256 using a shared secret, sent in the `X-Hub-Signature-256` header — verifying this confirms both authenticity and payload integrity.
- Use a constant-time comparison function (not a naive string equality check) when comparing computed and received signatures, to avoid a timing-attack vulnerability.
- Reject unverified requests before any processing occurs, and recognize this as a general principle applicable to any external webhook integration, not just GitHub specifically.

## Interview Follow-Up Questions

- How would you securely store and rotate the shared webhook secret, given it needs to be configured identically in both GitHub and your receiving service?
- What additional validation would you add beyond signature verification, such as checking the event type or specific branch before triggering a deployment?
- How would you handle webhook delivery failures or retries from GitHub's side, given network issues could cause a legitimate webhook to not arrive?

## References

- [GitHub Docs: Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Python docs: hmac.compare_digest](https://docs.python.org/3/library/hmac.html#hmac.compare_digest)
