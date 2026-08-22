---
id: kubernetes-admission-webhook-sideeffects-dryrun-compatibility-001
title: "kubectl apply --dry-run=server behaves unexpectedly for requests a webhook handles — what does a webhook's sideEffects field have to do with it?"
category: kubernetes
subcategory: admission-control
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - conceptual
  - troubleshooting
tags:
  - kubernetes
  - admission-control
  - webhooks
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team relies on `kubectl apply --dry-run=server` to preview changes safely before actually applying them. For requests handled by a specific webhook, dry-run either fails outright, or (worse) actually appears to trigger a real external side effect despite being "dry-run." What's the `sideEffects` field on a webhook configuration, and why does it matter for this?

## Short Answer

`sideEffects` is a declared field on the webhook configuration telling the API server whether the webhook is safe to invoke during a dry-run request — `NoneOnDryRun` promises the webhook itself checks the request's `dryRun` flag and skips any real side effect when set, while `Some` means it can't make that promise. If the declared value doesn't match what the webhook's code actually does (or the code never checks `dryRun` at all despite promising `NoneOnDryRun`), you get exactly this mismatch: either a real side effect firing during a supposed dry-run, or the API server skipping the webhook during dry-run and producing a preview that doesn't reflect what would really happen.

## Detailed Explanation

The API server needs to know, per webhook, whether calling it during a dry-run request is actually safe — a webhook that only inspects the request and returns a decision is safe to call during dry-run; a webhook that reaches out and does something in the real world (calling an external system, incrementing a counter, provisioning something) is not, and calling it during what's supposed to be a no-op preview would itself be a real, unwanted side effect.

## Symptoms

- `kubectl apply --dry-run=server` behaves unexpectedly for requests a specific webhook intercepts — either erroring out, or (more concerning) something external actually happens despite the request being dry-run.
- Other requests not touching that webhook work fine with dry-run.
- The webhook's own logic, read directly, does something beyond pure in-memory validation/mutation (an external API call, a database write, incrementing some counter).

## Possible Causes

- The webhook's `sideEffects` field is set to `None` or `NoneOnDryRun` when the webhook's actual implementation does have real side effects — a mismatch between what the field declares and what the webhook code actually does.
- The webhook doesn't check the incoming `AdmissionReview` request's `dryRun` field at all in its own logic, meaning it performs its real side effect unconditionally, regardless of whether the request itself was a dry-run.
- `sideEffects: Unknown` (or a value the API server interprets conservatively) causes the API server to skip calling the webhook entirely during dry-run, which can itself produce a confusing "the mutation/validation I expected didn't happen in this dry-run preview" symptom, distinct from an actual error.

## Investigation Steps

**Check the webhook's declared `sideEffects` value**: `kubectl get validatingwebhookconfiguration <name> -o yaml` (or mutating) — `None` (no side effects ever), `NoneOnDryRun` (has side effects normally, but the webhook itself correctly skips them when it detects a dry-run request), `Some` (has side effects, doesn't handle dry-run specially), or `Unknown` — each value tells the API server something different about how safe it is to include this webhook in a dry-run request.

**Check whether the webhook's own code actually inspects the `dryRun` field on incoming requests**: for a webhook declared `NoneOnDryRun`, its implementation needs to actually check `request.dryRun` and skip its real side effect when true — if the declared value promises this behavior but the code doesn't implement it, that's a direct mismatch causing real side effects during what should be a safe preview.

**Reproduce with a controlled test request and observe actual behavior directly**: rather than inferring from `kubectl` behavior alone, sending a deliberately-crafted `AdmissionReview` request with `dryRun: true` directly to the webhook's endpoint (bypassing the API server) and observing whether its side effect actually occurs confirms the webhook's real behavior unambiguously.

## Resolution

If `sideEffects` is declared incorrectly relative to the webhook's actual behavior, correct the declaration to accurately reflect reality (`Some` if it genuinely can't safely skip side effects during dry-run) — this at least makes the API server's behavior consistent with the truth, even if it means dry-run requests touching this webhook can't fully bypass its side effects. If the webhook can reasonably be made dry-run-safe, implement the `dryRun` field check in the webhook's own code and correctly declare `NoneOnDryRun`, which is the better long-term fix since it actually restores safe dry-run behavior for requests touching this webhook. Confirm the fix by re-testing `kubectl apply --dry-run=server` against the same request that previously exhibited the problem.

## Key Takeaways

- `sideEffects` tells the API server whether it's safe to call a specific webhook during a dry-run request — this isn't automatically inferred, it's a declared value the webhook author must set correctly.
- A webhook declared `NoneOnDryRun` must actually implement the corresponding logic (checking `request.dryRun` and skipping real side effects) — declaring it without implementing it is a real, dangerous mismatch.
- `sideEffects: Some` (or `Unknown`) can cause the API server to skip the webhook during dry-run entirely, which produces its own confusing "expected mutation/validation didn't happen in the preview" symptom.
- Test dry-run behavior with a direct, controlled request to the webhook when investigating, rather than only inferring behavior indirectly through `kubectl`'s own output.

## Interview Follow-Up Questions

- How would you audit every webhook in a cluster to confirm their declared `sideEffects` value actually matches their real implementation behavior?
- What would you do if a webhook's core purpose genuinely requires a real side effect that can't safely be skipped during dry-run at all?
- How does `sideEffects` interact with the newer server-side apply feature, given both relate to how the API server processes a request without necessarily persisting it in the traditional sense?

## References

- [Kubernetes: Dynamic Admission Control — Side effects](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#side-effects)
