---
id: kubernetes-cluster-security-runtime-detection-vs-preventive-admission-001
title: "You already enforce preventive admission policies (Kyverno/Gatekeeper) — why would you also need runtime security tooling like Falco?"
category: kubernetes
subcategory: cluster-security
technologies:
  - kubernetes
  - falco
difficulty: advanced
question_type:
  - comparison
tags:
  - kubernetes
  - runtime-security
  - falco
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A cluster already enforces preventive policies at admission time — no privileged containers, no `:latest` tags, required resource limits. A teammate suggests also deploying Falco for runtime security monitoring. If bad configurations are already blocked before they're ever deployed, what does runtime detection actually add?

## Short Answer

Admission control only sees the *declared configuration* of a pod at deployment time — it has no visibility into what a process actually *does* once it's running. A perfectly-compliant, non-privileged, properly-resource-limited container can still be exploited at runtime (a code vulnerability, a supply-chain-compromised dependency) and then behave maliciously — spawning an unexpected shell, reading sensitive files, making unexpected network connections — none of which admission control could have prevented, since none of it was visible in the pod's declared spec. Runtime detection watches actual behavior as it happens, catching exactly this class of threat that preventive admission control structurally cannot see.

## Detailed Explanation

**Admission control is a point-in-time gate on declared configuration, not an ongoing behavioral observer**: every admission policy evaluates the pod spec being submitted — it has no mechanism to observe what happens after the pod is actually running, since its entire job is done at the moment of admission.

**A compliant pod can still be exploited after admission**: a container with a legitimate, minimal, properly-configured spec (no privileged access, dropped capabilities, resource limits set — everything an admission policy would check) can still have a real vulnerability in its application code or a dependency — once exploited, the attacker's actual actions (spawning a shell, reading files outside the expected working directory, making a network connection to an unexpected destination) are runtime *behavior*, which no admission-time check could have anticipated from the spec alone.

**Falco (and similar tools) observe actual kernel-level behavior via eBPF or a kernel module**: rather than checking declared configuration, Falco monitors real-time system calls and events (process execution, file access, network connections) against a set of rules describing suspicious or unexpected behavior — "a shell was spawned inside a container that shouldn't normally spawn shells," "a container process is reading `/etc/shadow`," "a container made an outbound connection to an unexpected destination" — these are runtime facts, not configuration facts.

**The two layers address genuinely different points in an attack's lifecycle**: preventive admission control reduces the *attack surface* available to an attacker before anything runs (fewer privileges, fewer capabilities, no dangerous configurations) — this is valuable and reduces the likelihood and severity of a successful exploit. Runtime detection catches an attacker's *actual actions* after a successful exploit, which is the layer that matters specifically when prevention didn't (or couldn't, given a genuine zero-day) stop the initial compromise.

**Defense in depth means neither layer is optional if the goal is genuine security, not just compliance**: an organization with only admission control has strong prevention but no detection capability if something does get through; an organization with only runtime detection has no preventive reduction of attack surface, catching problems only after they're already happening — combining both gives both a smaller attack surface and a safety net for whatever prevention doesn't catch.

## Key Takeaways

- Admission control evaluates declared pod configuration at a single point in time (deployment) — it has no visibility into runtime behavior after the pod is running.
- A perfectly admission-policy-compliant pod can still be exploited via an application vulnerability or compromised dependency, producing malicious runtime behavior no admission check could have anticipated.
- Runtime security tools (Falco) observe actual kernel-level behavior (syscalls, process execution, network connections) in real time, catching exactly the class of threat admission control structurally cannot see.
- The two layers are complementary, addressing different points in an attack's lifecycle — prevention reduces attack surface before anything runs, detection catches actual malicious behavior after a successful exploit.

## Interview Follow-Up Questions

- How would you design Falco alerting to minimize false positives while still catching genuine suspicious behavior, given legitimate applications sometimes do unusual-looking things?
- How would you integrate a runtime detection alert into an actual incident response process, given detecting the behavior is only the first step?
- What's the relationship between runtime detection and network-level monitoring (like detecting unusual traffic patterns) — do they overlap or address different threats?

## References

- [Falco: Documentation](https://falco.org/docs/)
- [Kubernetes: Security](https://kubernetes.io/docs/concepts/security/)
