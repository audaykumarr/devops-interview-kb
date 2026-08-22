---
id: linux-process-management-systemd-restart-policy-001
title: "A misbehaving service is stuck in a rapid restart loop, consuming CPU and flooding logs, because systemd keeps restarting it immediately after every crash. How would you configure this correctly?"
category: linux
subcategory: process-management
technologies:
  - linux
  - systemd
difficulty: intermediate
question_type:
  - practical
tags:
  - linux
  - systemd
  - restart-policy
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A misconfigured service is crashing immediately on startup, but systemd's default restart behavior keeps relaunching it immediately after every crash — resulting in a rapid crash-restart loop that consumes CPU, floods logs, and makes the underlying problem harder to diagnose amid the noise. How would you configure systemd's restart policy to handle this properly?

## Short Answer

`Restart=on-failure` (or `always`) alone doesn't include any pacing — combine it with `RestartSec=` (a delay between restart attempts) and, critically, `StartLimitIntervalSec=`/`StartLimitBurst=` (systemd's built-in rate-limiting, giving up and marking the unit as failed after too many restart attempts within a time window) — this converts an unbounded, rapid crash loop into a bounded number of paced retry attempts, after which systemd stops trying and surfaces the failure clearly instead of looping forever.

## Detailed Explanation

The default `Restart=` behavior, without additional pacing configuration, restarts a failed service essentially immediately — reasonable for a transient failure that's genuinely likely to succeed on retry, but actively harmful for a service that's crashing due to a persistent misconfiguration, since immediate, unlimited restart attempts just repeat the same failure as fast as the system can cycle through them.

**`RestartSec=` adds a delay between restart attempts**: `RestartSec=10` (for example) means systemd waits 10 seconds after a crash before attempting to restart the service, rather than restarting essentially instantly — this alone reduces the rate of the crash loop and gives more breathing room, but doesn't fundamentally stop an indefinitely-repeating loop if the underlying problem doesn't resolve itself.

**`StartLimitIntervalSec=` and `StartLimitBurst=` provide the actual circuit-breaker**: together, these define "if the service fails to start more than `StartLimitBurst` times within `StartLimitIntervalSec` seconds, stop trying and mark the unit as failed" — this is what actually converts an unbounded crash loop into a bounded number of attempts, after which systemd stops (rather than continuing to retry forever) and the unit's failed state becomes visible to monitoring, rather than the system quietly, indefinitely burning resources on a doomed retry loop.

```ini
[Service]
Restart=on-failure
RestartSec=10
StartLimitIntervalSec=300
StartLimitBurst=5
```

This configuration means: on failure, wait 10 seconds before restarting; if the service fails to start 5 times within a 300-second window, stop trying entirely and mark the unit failed, rather than continuing to loop.

**`Restart=on-failure` versus `Restart=always` matters for what counts as a "failure" worth restarting**: `on-failure` restarts only on a non-zero exit code, a signal, or a timeout, while `always` also restarts on a clean, intentional exit — for most long-running services, `on-failure` is more appropriate, since a clean exit is often deliberate (a controlled shutdown) rather than something that should trigger an automatic restart.

**Once the `StartLimitBurst` threshold is hit and the unit is marked failed, it requires manual intervention** (`systemctl reset-failed` followed by `systemctl start`, after actually fixing the underlying issue) — this is a deliberate design choice: rather than the system indefinitely trying and failing, a clear "this needs a human" signal is surfaced, which is exactly the behavior you want instead of a silent, resource-consuming crash loop.

**This configuration should be paired with actual monitoring/alerting on unit failure state**, since the circuit-breaker stopping the crash loop is only half the fix — someone needs to actually be notified that the service is now stopped and failed, rather than the crash loop simply becoming silent instead of loud.

## Key Takeaways

- `Restart=` alone has no pacing — combine it with `RestartSec=` to add a delay between restart attempts, reducing the rate of a crash loop.
- `StartLimitIntervalSec=`/`StartLimitBurst=` is systemd's actual circuit-breaker, stopping retry attempts entirely after too many failures within a time window rather than looping indefinitely.
- Once the start limit is hit, the unit is marked failed and requires manual intervention (`systemctl reset-failed` plus fixing the underlying issue) — a deliberate design surfacing a clear "needs a human" signal.
- Pair this configuration with monitoring/alerting on unit failure state, since stopping the crash loop only helps if someone is actually notified the service is now down.

## Interview Follow-Up Questions

- How would you choose appropriate values for `RestartSec`, `StartLimitIntervalSec`, and `StartLimitBurst` for a specific service's actual failure characteristics?
- How would you distinguish a transient failure worth aggressive retrying from a persistent misconfiguration that should fail fast, when designing this policy?
- How does this concept map to Kubernetes' own Pod restart policy and `CrashLoopBackOff` behavior?

## References

- [systemd.service Documentation](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [systemd.unit Documentation (StartLimit)](https://www.freedesktop.org/software/systemd/man/systemd.unit.html)
