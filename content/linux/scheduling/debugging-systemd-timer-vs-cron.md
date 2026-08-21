---
id: linux-scheduling-systemd-timer-vs-cron-debugging-001
title: "How does debugging a systemd timer failure differ from debugging the same issue in cron?"
category: linux
subcategory: scheduling
technologies:
  - linux
  - systemd
difficulty: intermediate
question_type:
  - comparison
  - conceptual
tags:
  - linux
  - systemd
  - cron
  - troubleshooting
estimated_time_minutes: 7
companies: []
related_questions:
  - bash-scripting-cron-environment-mismatch-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A script works fine run manually but fails when triggered by a systemd timer — the same class of symptom as the classic "works manually, fails in cron" problem. How does the debugging approach actually differ between the two?

## Short Answer

The underlying cause category is the same (a minimal, non-interactive execution environment missing something an interactive shell provides — `PATH`, environment variables, working directory), but systemd gives you dramatically better tooling to diagnose it: `systemctl status` and `journalctl` show you the unit's actual exit code, output, and execution context directly, and the unit file itself is an explicit, inspectable declaration of the environment (via `Environment=`, `EnvironmentFile=`, `WorkingDirectory=`) rather than cron's implicit, easy-to-forget minimal environment.

## Detailed Explanation

Both cron and systemd timers run scheduled jobs outside of any interactive shell session, which is the root cause of this whole class of problem: no shell startup files (`.bashrc`, `.profile`) are sourced, so any `PATH` additions, environment variables, or aliases defined there simply don't exist in the scheduled execution, even though they're present when the same script is run manually from an interactive terminal.

Where the two differ is diagnostic tooling and explicitness. Cron's environment is minimal and largely *implicit* — a bare `PATH` (often just `/usr/bin:/bin`), no access to whatever the interactive shell had, and debugging typically means adding explicit logging inside the script itself (`env > /tmp/cron-env.log`) since cron's own logging is minimal (traditionally just a mail notification, or whatever `MAILTO`/syslog integration is configured, without directly showing you exit codes and output in one place).

systemd timers, by contrast, give you real tooling out of the box: `systemctl status <unit>` shows the last run's result, including exit code and a snippet of recent output; `journalctl -u <unit>` shows the unit's full logged output directly, without needing to add your own logging first. And critically, the unit file itself is an explicit declaration of the execution environment — `Environment=`, `EnvironmentFile=`, `WorkingDirectory=`, and `User=` are all visible, version-controllable settings in the `.service` file, rather than cron's implicit "whatever the minimal environment happens to be," making it much easier to see *and fix* what's different from the interactive shell without guessing.

The practical debugging difference: for cron, the investigation usually starts by manually adding environment-dumping to the script itself, since cron gives you little visibility by default. For a systemd timer, the investigation starts with `journalctl -u <unit> -n 50` and `systemctl status <unit>` first — the tooling gives you the failure's actual output and exit code immediately, often without needing to modify the script at all, and the fix is typically adding the missing `Environment=`/`EnvironmentFile=`/`WorkingDirectory=` directive directly to the unit file rather than working around it inside the script.

## Key Takeaways

- Both cron and systemd timers share the same root cause category: a minimal, non-interactive environment missing what an interactive shell provides.
- systemd gives dramatically better built-in diagnostic tooling (`systemctl status`, `journalctl -u`) compared to cron's minimal, implicit logging.
- The systemd unit file is an explicit, inspectable declaration of the execution environment (`Environment=`, `WorkingDirectory=`), unlike cron's implicit minimal environment.
- Debugging a systemd timer typically starts with the built-in tooling; debugging cron typically requires adding your own environment-dumping first.

## Interview Follow-Up Questions

- How would you migrate an existing set of cron jobs to systemd timers, and what environment differences would you need to account for during that migration?
- What's the difference between setting `Environment=` directly in a unit file versus using `EnvironmentFile=` to point at a separate file?
- How would `journalctl -u <unit> --since` help you correlate a timer's failure with other system events happening at the same time?

## References

- [systemd.exec: Environment directives](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#Environment=)
- [systemd.timer documentation](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html)
- [journalctl documentation](https://www.freedesktop.org/software/systemd/man/latest/journalctl.html)
