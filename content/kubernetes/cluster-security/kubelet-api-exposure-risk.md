---
id: kubernetes-cluster-security-kubelet-api-exposure-risk-001
title: "A security scan found the kubelet's API port reachable without authentication on some nodes — what can an attacker actually do with that, and how do you fix it?"
category: kubernetes
subcategory: cluster-security
technologies:
  - kubernetes
difficulty: expert
question_type:
  - security
  - troubleshooting
tags:
  - kubernetes
  - kubelet
  - security
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A network scan finds that some nodes' kubelet API (port 10250, or the older read-only port 10255) is reachable from outside the cluster's expected trust boundary, and in some cases without requiring authentication. What can someone actually do with unauthenticated kubelet API access, and how would you remediate this?

## Short Answer

An unauthenticated (or unauthorized) kubelet API grants direct access to run commands inside any pod on that node (via the `exec` subresource), read pod logs, and view detailed node/pod state — this is effectively equivalent to broad access to every workload on that node, bypassing the Kubernetes API server and its RBAC entirely, since the kubelet has its own separate API surface. Remediation means enabling kubelet authentication/authorization (so requests must be authenticated and RBAC-checked, same as the main API), disabling the deprecated read-only port entirely, and restricting network-level reachability to only the control plane.

## Detailed Explanation

The kubelet exposes its own HTTP API, separate from the main Kubernetes API server — this is easy to overlook precisely because almost all normal cluster interaction goes through `kubectl`/the API server, leaving the kubelet's own direct API surface as a less-obvious, sometimes under-hardened secondary attack surface.

## Symptoms

- A network/security scan identifies port 10250 (or the deprecated 10255) reachable from outside the expected trust boundary.
- Requests to the kubelet API succeed without providing valid credentials, or without an authorization check actually being enforced.
- This may only be discovered via an external scan, since it doesn't produce any obvious operational symptom for the cluster's own workloads.

## Possible Causes

- The kubelet's `--anonymous-auth` (kubelet-level, distinct from the API server's own anonymous-auth setting) is enabled, allowing unauthenticated requests to be treated as an anonymous user.
- `--authorization-mode` on the kubelet is set to `AlwaysAllow` rather than `Webhook` (which would delegate authorization decisions back to the main API server's RBAC), meaning any authenticated (or anonymous) request is permitted regardless of what it's actually trying to do.
- The deprecated read-only port 10255 is still enabled, which historically served a subset of the kubelet API with no authentication at all by design.
- Network policy/firewall rules don't actually restrict which sources can reach the kubelet's port, exposing it beyond the intended trust boundary (ideally, only the control plane).

## Investigation Steps

**Confirm the kubelet's actual authentication/authorization configuration**: checking the kubelet's config (`--anonymous-auth`, `--authorization-mode` flags, or the equivalent in a `KubeletConfiguration` file) on the affected nodes directly reveals whether anonymous access and always-allow authorization are actually enabled, versus this being a network-reachability issue against a properly-configured kubelet.

**Test actual API access directly to confirm the real exposure**: attempting an unauthenticated request against the kubelet's API (`curl -k https://<node-ip>:10250/pods`, from a position representing the scan's actual vantage point) confirms whether the exposure is genuinely exploitable, not just theoretically possible based on configuration alone.

**Check network-level reachability, independent of the kubelet's own auth configuration**: even a well-configured kubelet with authentication/authorization enabled shouldn't be reachable from arbitrary external sources — checking firewall rules, security groups, or NetworkPolicy (where applicable to node-level ports, which typically isn't covered by standard Kubernetes NetworkPolicy since that governs pod traffic, not node-level kubelet ports) to confirm actual reachability scope.

**Check whether the deprecated read-only port 10255 is still enabled anywhere**: this port, when enabled, serves a read-only subset of the kubelet API with no authentication by design — its mere presence is itself a finding requiring remediation, regardless of the main port's configuration.

## Resolution

Enable kubelet authentication (`--anonymous-auth=false`) and delegate authorization to the API server (`--authorization-mode=Webhook`), so kubelet API requests go through the same RBAC enforcement as the rest of the cluster rather than being independently and more permissively controlled. Disable the deprecated read-only port entirely. Restrict network-level reachability of the kubelet port to only the control plane (the only legitimate caller in normal operation), via firewall rules or security groups, as defense in depth beyond the kubelet's own auth configuration. Confirm the fix by re-running the same unauthenticated-access test from the investigation and confirming it now fails.

## Key Takeaways

- The kubelet exposes its own separate API, distinct from the main Kubernetes API server — this is a less-obvious secondary attack surface easy to overlook since normal cluster interaction doesn't touch it directly.
- Unauthenticated/unauthorized kubelet API access effectively grants exec access into every pod on that node, bypassing the main API server's RBAC entirely.
- Remediation requires both application-level hardening (kubelet auth/authorization settings, disabling the deprecated read-only port) and network-level restriction (limiting reachability to only the control plane) as defense in depth.
- `--authorization-mode=Webhook` on the kubelet is what makes kubelet-level access decisions actually go through the same RBAC as the rest of the cluster, rather than being independently configured.

## Interview Follow-Up Questions

- How would you audit an entire fleet of nodes to confirm none of them have this misconfiguration, rather than checking one node at a time?
- What's the relationship between this kubelet-level hardening and the CIS Kubernetes Benchmark's specific recommendations on kubelet configuration?
- How would you design monitoring to detect an actual exploitation attempt against the kubelet API, beyond just fixing the configuration gap?

## References

- [Kubernetes: Kubelet authentication/authorization](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-authn-authz/)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
