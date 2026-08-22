---
id: kubernetes-configuration-secret-env-var-stale-after-rotation-001
title: "An app reads an env var from a Secret, but after rotating the Secret's value, the running pod still uses the old one — why?"
category: kubernetes
subcategory: configuration
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - kubernetes
  - secrets
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Secret's value is rotated (a database password, an API key) via `kubectl apply` or a Secrets-management pipeline. Pods that reference that Secret via an environment variable keep authenticating with the old, now-invalid value. Waiting doesn't help, unlike a volume-mounted ConfigMap. Why not, and what's the actual fix?

## Short Answer

Environment variables sourced from a Secret are resolved exactly once, at container start — unlike a volume-mounted Secret, there's no ongoing refresh mechanism at all, so no amount of waiting will make a running container's environment variable change. The fix is triggering a pod restart, ideally automated via a checksum-annotation pattern tied to the Secret's content.

## Detailed Explanation

Environment variables are fundamentally different from a mounted volume in how Kubernetes delivers Secret data — a volume mount is a live filesystem view the kubelet periodically refreshes, while an environment variable is a value resolved exactly once, at container start, and then handed to the process by the container runtime with no further connection back to the Secret object at all.

## Symptoms

- A Secret is updated (`kubectl apply`, or a rotation pipeline) to a new value.
- Pods referencing that Secret via `env`/`envFrom` continue authenticating or behaving with the old value.
- The same Secret, if it were instead volume-mounted, would eventually reflect the new value — but env-var consumption never does, regardless of how long you wait.

## Possible Causes

- The Secret is consumed via `env`/`envFrom` with `secretKeyRef`, which is resolved once at container start and never re-evaluated.
- No mechanism exists to trigger a pod restart when the Secret changes, so the stale in-memory value persists indefinitely.

## Investigation Steps

**Confirm the Secret is actually consumed via environment variables, not a volume mount**: `kubectl get deployment <name> -o yaml` — check whether the container spec uses `env`/`envFrom` with `secretKeyRef`/`secretRef`, versus a `volumeMounts`/`volumes` entry referencing the Secret. This single check confirms which delivery mechanism is in play and therefore whether "wait for propagation" is even a valid option at all.

**Confirm the Secret object itself actually updated**: `kubectl get secret <name> -o jsonpath='{.data.<key>}' | base64 -d` — comparing this against the expected new value rules out the possibility that the rotation pipeline itself failed to actually update the Secret object, which would produce the same symptom for a completely different reason.

**Check whether any pods have restarted since the rotation**: `kubectl get pods -o wide` for pod age/restart count — if no pod has restarted since the Secret changed, that directly confirms why the stale env var persists, since nothing has triggered a fresh resolution.

## Resolution

Trigger a pod restart for every Deployment consuming the rotated Secret — either manually (`kubectl rollout restart`) for a one-off rotation, or automatically via a checksum-annotation pattern (a hash of the Secret's content embedded in the pod template's annotations, changing whenever the Secret does and triggering a rolling update) for routine, ongoing rotation. Confirm the fix by checking the application's actual runtime behavior against the new value, not just that the pod restarted, since restarting alone doesn't guarantee the new environment variable was correctly picked up if something else in the deployment pipeline is also stale.

## Key Takeaways

- Environment variables sourced from a Secret are resolved once at container start and never re-evaluated — there's no propagation delay to wait out, because there's no propagation mechanism at all.
- This is fundamentally different from a volume-mounted Secret, which the kubelet does periodically refresh on disk.
- A pod restart is unconditionally required to pick up a rotated Secret's new value when consumed via environment variables.
- A checksum-annotation pattern automates this restart trigger for routine rotation, rather than relying on someone remembering to manually restart affected Deployments.

## Interview Follow-Up Questions

- How would you design a Secret rotation pipeline that automatically restarts every Deployment consuming a rotated Secret, across an entire cluster?
- What's the difference between mounting a Secret as a volume versus injecting it as an environment variable, from a security perspective, and does that change your rotation strategy?
- How would you audit which Deployments across a cluster consume a specific Secret via environment variables, before planning a rotation?

## References

- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
