---
id: kubernetes-rbac-incident-response-leaked-serviceaccount-token-001
title: "A pod's ServiceAccount token was found in a public repo — what's your incident response, and how do you reduce blast radius for next time?"
category: kubernetes
subcategory: rbac-security
technologies:
  - kubernetes
difficulty: expert
question_type:
  - scenario
  - security
  - troubleshooting
tags:
  - kubernetes
  - rbac
  - incident-response
  - security
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A security researcher reports that a Kubernetes ServiceAccount token — apparently copy-pasted into a debugging script and accidentally committed — is sitting in a public GitHub repository. It's unclear how long it's been exposed. Walk through your incident response, and then how you'd reduce the blast radius of this class of incident happening again.

## Short Answer

Immediately determine exactly what that token can do (resolve its ServiceAccount's effective RBAC permissions), revoke it, and audit the API server's audit logs for any use of it from an unexpected source — then, going forward, move toward short-lived, automatically-rotated bound service account tokens instead of long-lived static ones, and set `automountServiceAccountToken: false` by default so tokens only exist where a workload genuinely calls the Kubernetes API.

## Detailed Explanation

A leaked ServiceAccount token is an identity compromise, not just a data leak — the correct response sequence is to establish exactly what that identity could do, cut off its access, and only then determine whether it was actually exploited during the exposure window. Getting the order right (contain first, fully understand second) matters because the exposure window is often unknown, and every additional minute the token remains valid is additional risk that doesn't need to exist while you're still investigating.

## Symptoms

- A long-lived ServiceAccount token (a JWT, often from a mounted `secrets/<name>-token-xxxxx` in older clusters, or a manually-requested long-lived token) is found in a public location.
- The exposure window is unknown — the token may have been public for minutes or months depending on when the commit was made versus when it was discovered.
- It's unclear whether the token has actually been used maliciously, or only exposed.

## Possible Causes

- A legacy cluster still auto-mounting long-lived ServiceAccount tokens by default (pre-1.24 behavior, or `automountServiceAccountToken` not explicitly disabled).
- A developer manually extracting a token for local debugging or a script, then accidentally committing it alongside other code.
- No secret-scanning pre-commit hook or CI check in place to catch this class of leak before it reaches a public repository.

## Investigation Steps

**Immediately determine what the token can actually do**: identify the ServiceAccount and namespace the token belongs to (decode the JWT's payload, which includes `kubernetes.io/serviceaccount/service-account.name` and `.namespace`), then resolve its effective RBAC permissions with `kubectl auth can-i --list --as=system:serviceaccount:<namespace>:<name>` — this tells you the actual severity: a token scoped to `get configmaps` in one namespace is a very different incident than one bound to a broad ClusterRole.

**Revoke the token before finishing the rest of the investigation**: if the cluster uses the older long-lived Secret-based tokens, deleting the associated Secret invalidates it. If it's a newer bound service account token (time-limited, tied to a specific pod via the TokenRequest API), it will expire on its own, but you should still consider deleting the pod that requested it and rotating the ServiceAccount if there's any doubt. Speed here matters more than full understanding — revoke first, then investigate usage history.

**Search the API server's audit logs for any use of the token**: Kubernetes audit logs (if enabled — worth confirming as part of this investigation) record the identity used for each API request; searching for the specific ServiceAccount's requests around and after the suspected exposure window can reveal whether it was actually used by an unauthorized source (an unfamiliar source IP or user-agent pattern) versus only being exposed without evidence of misuse.

**Check what the ServiceAccount's permissions would have allowed an attacker to actually do**: beyond the RBAC permission list itself, reason through what those permissions mean in context — read access to Secrets in a namespace could mean the attacker also obtained other credentials stored there, turning a single leaked token into a much larger compromise if you don't also check what it could have read.

**Determine how long the exposure window actually was**: check the Git commit history for when the token was actually committed (not just when it was discovered) — `git log -p --follow -- <file>` or a GitHub search for the specific string — since the real exposure window (which determines how much audit log history you need to review) is from that commit, not from the discovery date.

## Resolution

Revoke the specific leaked token immediately, audit its usage history for any signs of actual exploitation (and respond accordingly if found — treating it as a broader compromise, not just a credential leak), and confirm the fix by verifying the old token no longer authenticates (`kubectl auth can-i` with the leaked token should now fail entirely, not just lack permissions).

## Key Takeaways

- Resolve the token's actual RBAC permissions first — the response's urgency and scope depend entirely on what the token could do, not just that it leaked.
- Revoke before fully investigating; speed matters more than complete understanding in the first response step.
- Audit logs (if enabled) are what actually tell you whether the token was exploited versus merely exposed — this distinction changes the entire scope of the incident.
- Prevent recurrence structurally: move to short-lived bound service account tokens, set `automountServiceAccountToken: false` by default, and add secret-scanning to catch this class of leak before it reaches a public repo.

## Prevention

Moving to Kubernetes' bound service account tokens (time-limited, audience-bound, tied to a specific pod, available since 1.20 and default since 1.24) means even an accidentally-exposed token has a naturally short useful life instead of being valid indefinitely. Setting `automountServiceAccountToken: false` at the pod or ServiceAccount level for workloads that don't actually call the Kubernetes API removes the token from existing at all in the majority of pods where it's simply unused. Adding a pre-commit secret-scanning hook (and the equivalent check in CI) catches this specific failure mode — a token accidentally pasted into a script — before it ever reaches a public repository.

## Interview Follow-Up Questions

- How would you determine, with high confidence, whether the leaked token was actually used by an attacker versus merely exposed with no evidence of misuse?
- What's the difference between the older Secret-based ServiceAccount tokens and the newer TokenRequest-API bound tokens, in terms of what this incident would have looked like under each?
- How would you roll out `automountServiceAccountToken: false` as a new default across an existing cluster without breaking workloads that do legitimately need API access?

## References

- [Kubernetes: Service Account Tokens](https://kubernetes.io/docs/concepts/security/service-accounts/#bound-service-account-token-volume)
- [Kubernetes: Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
