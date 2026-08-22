---
id: linux-process-management-sigterm-vs-sigkill-001
title: "A service takes 25 seconds to shut down gracefully, but your orchestrator sends SIGKILL after a 10-second grace period, causing corrupted in-progress writes on every deploy. How do you actually fix this?"
category: linux
subcategory: process-management
technologies:
  - linux
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - linux
  - signals
  - graceful-shutdown
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A service needs about 25 seconds to shut down gracefully (finishing in-flight requests, flushing buffered writes), but your orchestrator (Kubernetes, systemd, or similar) sends `SIGTERM` and then forcibly `SIGKILL`s the process after a 10-second grace period. This is causing corrupted or lost in-progress writes on every deploy. How do you actually fix this?

## Short Answer

`SIGTERM` is a request the process can catch and handle (running its own graceful shutdown logic); `SIGKILL` is an unconditional, immediate termination the process cannot catch, block, or clean up after — the corruption happens because the grace period between them is shorter than the process's actual shutdown needs, so the orchestrator escalates to the un-catchable `SIGKILL` mid-cleanup. The fix is increasing the grace period to comfortably exceed the process's actual graceful shutdown time, and separately confirming the application's `SIGTERM` handler is efficient and actually completing what it needs to within that window.

## Detailed Explanation

The distinction between these two signals is fundamental to how graceful shutdown is supposed to work in any orchestrated environment: `SIGTERM` is specifically designed to give a process the opportunity to clean up (finish in-flight work, flush buffers, close connections gracefully) before exiting, while `SIGKILL` exists specifically as an unconditional backstop for processes that don't respond to `SIGTERM` in a reasonable time — the grace period between the two is the process's actual allotted window to do that cleanup, and if it's set shorter than what the process genuinely needs, `SIGKILL` interrupts the cleanup mid-flight.

## Symptoms

- In-progress writes or transactions are corrupted or lost specifically around deployment/restart events, not during normal operation.
- The service's own logs show graceful shutdown beginning but not completing before the process disappears.
- The orchestrator's own logs or events show a forced termination (`SIGKILL`) following the initial termination signal.

## Possible Causes

- The orchestrator's configured grace period (Kubernetes' `terminationGracePeriodSeconds`, systemd's `TimeoutStopSec`, or equivalent) is shorter than the application's actual, measured time to complete graceful shutdown.
- The application's `SIGTERM` handler itself is slow or inefficient — waiting on something with its own long timeout, or not prioritizing the most critical cleanup steps first.
- The application doesn't handle `SIGTERM` at all (using the language/runtime's default behavior, which for many runtimes is immediate termination), meaning there's effectively no graceful shutdown happening regardless of the grace period length.

## Investigation Steps

1. Measure the application's actual graceful shutdown time under realistic conditions (with genuine in-flight work present, not an idle process), rather than assuming the theoretical 25 seconds is accurate under all real circumstances.
2. Confirm the current grace period configuration in the orchestrator and compare it directly against the measured shutdown time.
3. Check whether the application actually has a `SIGTERM` handler implemented, and trace through what it does — is it doing the right things in a reasonable order, or is something within it unnecessarily slow?
4. Review orchestrator logs/events for confirmation that `SIGKILL` is indeed what's terminating the process, rather than assuming based on symptoms alone.

## Resolution

1. **Increase the grace period to comfortably exceed the measured graceful shutdown time**, with real margin (not just barely enough) to account for variability under different load conditions — `terminationGracePeriodSeconds` in Kubernetes, `TimeoutStopSec` in systemd, or the equivalent for your orchestrator.
2. **Verify or implement a proper `SIGTERM` handler in the application** if one doesn't exist or is currently relying on runtime defaults, ensuring it actually performs the necessary cleanup (finishing in-flight requests, flushing buffers, closing connections) rather than just letting the process die immediately.
3. **Optimize the shutdown handler if 25 seconds itself is longer than it needs to be** — sometimes the actual fix is making shutdown faster (a more efficient flush strategy, parallelizing independent cleanup steps) rather than just extending the grace period indefinitely to accommodate a slow handler.
4. **Verify the fix** by triggering an actual deploy/restart with genuine in-flight load present, confirming no corruption occurs and the process completes graceful shutdown within the new window.

## Prevention

- Set grace periods based on actual measured shutdown time data, with real margin, rather than an arbitrary default value nobody has verified against the application's actual behavior.
- Test graceful shutdown behavior explicitly as part of a service's readiness for production, not just assumed to work because a `SIGTERM` handler exists in the code.
- Monitor for forced-termination events (a `SIGKILL` following `SIGTERM` within the grace period) as a signal worth alerting on, since it indicates the grace period and actual shutdown time are mismatched.

## Key Takeaways

- `SIGTERM` is a catchable request giving a process the opportunity to clean up; `SIGKILL` is an unconditional, uncatchable termination — corruption happens when the grace period between them is shorter than the actual cleanup needs.
- Measure the application's actual graceful shutdown time under realistic load, and set the orchestrator's grace period to comfortably exceed it, not just theoretically match it.
- Confirm the application actually implements proper `SIGTERM` handling — some language runtimes don't gracefully handle it by default, meaning grace period length is irrelevant if nothing productive happens during it.
- Consider whether shutdown itself can be made faster, rather than only ever extending the grace period to accommodate a slow handler.

## Interview Follow-Up Questions

- How would you handle a shutdown process whose duration is genuinely variable depending on how much in-flight work exists at the moment of termination?
- What's the risk of setting the grace period too generously long, beyond just slower deploys?
- How does Kubernetes' Pod termination sequence (readiness gate removal, `preStop` hook, `SIGTERM`, grace period, `SIGKILL`) fit together as a complete picture?

## References

- [Linux man-pages: signal(7)](https://man7.org/linux/man-pages/man7/signal.7.html)
- [Kubernetes: Pod Lifecycle — Termination of Pods](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
