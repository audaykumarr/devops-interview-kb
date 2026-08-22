---
id: kubernetes-cluster-security-seccomp-profiles-beyond-securitycontext-001
title: "What does a seccomp profile actually add on top of SecurityContext's capability restrictions, and when do you need one?"
category: kubernetes
subcategory: cluster-security
technologies:
  - kubernetes
difficulty: advanced
question_type:
  - conceptual
tags:
  - kubernetes
  - seccomp
  - security
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A pod's `securityContext` already drops unnecessary Linux capabilities and disables privilege escalation. A teammate suggests also adding a seccomp profile. Isn't dropping capabilities already sufficient hardening — what does seccomp add on top of that?

## Short Answer

Linux capabilities and seccomp operate at different, complementary layers: capabilities control which *privileged operations* a process is allowed to perform (even if it has the capability); seccomp controls which *syscalls* a process is allowed to invoke at all, regardless of privilege level. A process with all dangerous capabilities already dropped can still invoke a huge number of syscalls that have nothing to do with capabilities — seccomp narrows that syscall surface directly, which is a meaningfully different (and additional) restriction than capability dropping alone provides.

## Detailed Explanation

**Capabilities gate specific privileged actions; seccomp gates which syscalls can be called at all**: dropping `CAP_SYS_ADMIN`, for instance, prevents a process from performing the specific privileged operations that capability governs — but the process can still call the vast majority of the ~300+ Linux syscalls that have nothing to do with capabilities at all, many of which represent unnecessary attack surface for a typical containerized application that only actually needs a small subset of syscalls to function.

**A smaller syscall surface directly reduces the kernel attack surface an exploit can target**: many real container-escape and privilege-escalation exploits work by triggering a bug in a specific, often obscure syscall's kernel implementation — a process that's syscall-restricted to only what it actually needs simply cannot invoke the syscall a given exploit depends on, even if the exploit itself has nothing to do with capabilities at all. This is a fundamentally different protection than capability dropping.

**The default (`RuntimeDefault`) seccomp profile already blocks a meaningful set of genuinely dangerous, rarely-needed syscalls**: most container runtimes ship a default seccomp profile blocking around 40-50 syscalls considered dangerous or unnecessary for typical containerized workloads (certain kernel module operations, raw socket creation in some configurations, and others) — applying `seccompProfile: { type: RuntimeDefault }` is a low-effort, broadly-safe hardening step that most workloads can adopt without custom profile work.

**A custom, application-specific profile provides much tighter restriction, at real implementation cost**: rather than the runtime's generic default, a profile listing exactly the syscalls a specific application actually uses (built by tracing the application's real behavior, via tools like `strace` or specialized profile-generation tools) restricts the syscall surface far more tightly than the generic default — but building and maintaining this profile is genuine, ongoing work, and an incomplete profile risks breaking the application if it hits a legitimately-needed syscall that wasn't captured during profiling.

**Capabilities and seccomp should both be configured together, not treated as alternatives**: since they restrict genuinely different things, a hardened pod spec sets both — dropping unnecessary capabilities *and* applying at least the `RuntimeDefault` seccomp profile — rather than treating one as making the other redundant.

## Key Takeaways

- Capabilities gate specific privileged operations; seccomp gates which syscalls can be invoked at all, regardless of capability — these are genuinely different, complementary restriction layers.
- A process with capabilities fully dropped can still invoke hundreds of syscalls unrelated to any capability, which seccomp specifically restricts.
- `seccompProfile: { type: RuntimeDefault }` is a low-effort, broadly-applicable hardening step blocking a meaningful set of dangerous, rarely-needed syscalls.
- A custom, application-specific seccomp profile is much tighter but requires real profiling work and carries a risk of breaking the application if the profile is incomplete.

## Interview Follow-Up Questions

- How would you build a custom seccomp profile for a specific application, and what tools would you use to trace its actual syscall usage?
- What would you do if applying `RuntimeDefault` seccomp broke an existing application — how would you diagnose which specific syscall was blocked?
- How does seccomp interact with AppArmor or SELinux, given all three are Linux kernel security mechanisms that can apply to the same container simultaneously?

## References

- [Kubernetes: Restrict a Container's Syscalls with seccomp](https://kubernetes.io/docs/tutorials/security/seccomp/)
- [Linux man-pages: seccomp(2)](https://man7.org/linux/man-pages/man2/seccomp.2.html)
