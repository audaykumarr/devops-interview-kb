---
id: kubernetes-cluster-security-readonly-root-filesystem-enforcement-001
title: "Enforcing readOnlyRootFilesystem across all pods breaks several applications that write temp files — how do you roll this out without breaking them?"
category: kubernetes
subcategory: cluster-security
technologies:
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
  - practical
tags:
  - kubernetes
  - security-context
  - hardening
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A security policy requires `securityContext.readOnlyRootFilesystem: true` on every container, so a compromised process can't write malicious files to the container's own filesystem. Rolling this out breaks several applications that write temporary files, cache data, or logs to paths within the container's own filesystem at runtime. How do you actually roll this out without breaking those applications?

## Short Answer

`readOnlyRootFilesystem: true` only makes the container image's own filesystem layer read-only — it doesn't (and can't) prevent an application from writing altogether. Applications that genuinely need to write at runtime need an explicit writable volume (typically `emptyDir`) mounted at the exact path they write to; roll this out application by application, identifying each one's actual write paths first, rather than flipping the flag cluster-wide and discovering every broken application at once.

## Detailed Explanation

A read-only root filesystem doesn't mean the application can never write anywhere — it means the application can't write to the *container image's own layer*. Applications that genuinely need to write somewhere at runtime need an explicit writable volume mounted at exactly the path they write to, which is a design change, not something that happens automatically just by flipping the flag.

## Symptoms

- Applications crash, fail to start, or error specifically around file-write operations after `readOnlyRootFilesystem: true` is applied.
- Errors typically reference a specific path (a temp directory, a cache directory, a log file location) being read-only or permission-denied.
- The application worked fine before the policy was applied, with no other change to its code or image.

## Possible Causes

- The application writes temporary files to `/tmp` (or a similar path) at runtime, which is now part of the read-only root filesystem.
- The application writes application-specific cache or working data to a path within its own image (not a path that was ever explicitly designed to be a mounted volume).
- A logging library the application uses writes to a local file path by default, rather than to stdout/stderr as Kubernetes-native logging conventions expect.

## Investigation Steps

**Identify exactly which path(s) each broken application actually writes to**: reading the specific error messages, or (if unclear) temporarily reverting `readOnlyRootFilesystem` for one instance and using `strace`/application logs to observe its actual write operations, identifies precisely which paths need to become writable volumes rather than guessing.

**Distinguish genuinely necessary runtime writes from writes that should be eliminated instead**: for `/tmp`-style scratch space, mounting an `emptyDir` volume at that exact path is the straightforward fix. For an application writing logs to a local file (rather than stdout/stderr), the better fix is often reconfiguring the application to log to stdout/stderr as Kubernetes convention expects, rather than working around it with a writable volume — since a local log file inside an ephemeral container is lost on restart anyway and doesn't integrate with cluster-wide log aggregation.

**Check for writes to paths that indicate a deeper application design issue**: an application writing to a path that looks like it's mutating its own installed code or configuration at runtime (rather than genuine scratch/cache data) is a signal worth investigating further — this pattern is itself somewhat concerning from a security perspective (mutable application code) independent of the `readOnlyRootFilesystem` rollout.

## Resolution

For each application, mount an `emptyDir` volume (or a more persistent volume, if the written data genuinely needs to survive a restart) at exactly the specific path(s) identified during investigation — this satisfies the application's genuine write need while keeping the rest of the container's filesystem read-only. Reconfigure applications writing logs to local files to log to stdout/stderr instead, where feasible, rather than working around it with a volume mount. Roll this out application by application (validating each one specifically, since the needed volume mounts differ per application) rather than flipping the flag cluster-wide in one step and discovering every broken application simultaneously.

## Key Takeaways

- `readOnlyRootFilesystem: true` makes the container image's own filesystem layer read-only — it doesn't prevent all writes, it requires genuine runtime write needs to go through an explicit writable volume mount instead.
- Identify the specific path(s) each application actually writes to before designing the fix, rather than guessing.
- For scratch/temp data, an `emptyDir` volume mounted at the exact write path is the standard fix; for local log files, reconfiguring the application to log to stdout/stderr is often the better long-term fix.
- Roll this out application by application, validating each one's specific needed volume mounts, rather than a single cluster-wide flip that breaks everything simultaneously.

## Interview Follow-Up Questions

- How would you audit an existing fleet of applications to determine, before rollout, which ones would actually break and what paths they'd need mounted?
- What's the security benefit specifically lost if you instead just grant a writable volume mounted at the container's entire root, defeating much of the point?
- How would you handle a third-party application/image you don't control the code for, where you can't simply reconfigure its logging behavior?

## References

- [Kubernetes: Configure a Security Context for a Pod or Container](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
