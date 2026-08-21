---
id: bash-scripting-cron-environment-mismatch-001
title: "A backup script runs perfectly when you execute it by hand, but fails silently every night when cron runs it. How would you debug it?"
category: bash
subcategory: scripting
technologies:
  - bash
  - linux
difficulty: beginner
question_type:
  - troubleshooting
tags:
  - bash
  - cron
  - environment-variables
  - scripting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A backup script works perfectly every time you run it by hand from your shell, but fails silently every night when cron runs it — no useful error, the backup just doesn't happen. How would you debug it?

## Short Answer

The most common cause by far is environment differences: cron runs jobs with a minimal environment (a bare-bones `PATH`, no shell profile sourced, none of the exports your interactive shell has), so a script that works manually often relies on something your login shell provides that cron's execution environment doesn't — usually `PATH` not including a directory a command lives in, or an environment variable the script assumes is set. Capturing the script's actual output and environment during a cron run (instead of assuming it's identical to manual execution) is the fastest way to confirm which.

## Detailed Explanation

When you run a script from an interactive terminal, it inherits your full login environment — `PATH` set by `.bashrc`/`.profile`, any environment variables your shell or a sourced config file exports, your current working directory, and so on. Cron does none of that: it runs jobs with a deliberately minimal environment (historically just `SHELL`, `PATH` set to something like `/usr/bin:/bin`, `HOME`, and `LOGNAME`), doesn't source your shell's startup files, and doesn't run from any particular working directory unless the script sets one explicitly. A script that calls a binary by name assuming it's on `PATH` (a tool installed to `/usr/local/bin` or a language version manager's shims, common for things like `aws`, `docker`, `node`, `python3` from a virtualenv) can work perfectly by hand and fail immediately under cron with nothing more informative than "command not found" — which, if the script doesn't check exit codes or redirect stderr, can genuinely produce zero visible output.

"Fails silently" is itself a clue: by default, cron only emails output if there's any (and only if mail delivery is configured at all, which it often isn't on modern systems), and a script that doesn't explicitly capture and log its own stdout/stderr gives you nothing to look at after the fact. This is why the very first debugging step should always be making the failure visible — redirecting the cron job's output to a log file — rather than trying to reason about what might be different in cron's environment without evidence.

## Symptoms

- The script succeeds every time it's run manually from an interactive shell.
- The scheduled cron execution produces no visible result (backup doesn't happen), with no obvious error to look at.
- No entry in `/var/log/syslog` or `/var/log/cron` beyond confirmation that cron attempted to run the job.

## Possible Causes

- `PATH` in cron's minimal environment doesn't include a directory a command the script calls lives in.
- The script relies on an environment variable normally set by `.bashrc`/`.profile`/`.bash_profile`, none of which cron sources.
- The script assumes a specific working directory (using relative paths) that differs from cron's default working directory (often the user's home directory, or unspecified).
- The script's output (both success confirmation and any errors) isn't being redirected anywhere, so failures are genuinely invisible after the fact.
- The script runs under a different user via cron than the one you're testing manually with, and that user lacks a permission, credential, or environment setting the interactive test had.

## Investigation Steps

1. Redirect the cron job's output to a log file if it isn't already, so the next failure is actually visible: `* * * * * /path/to/script.sh >> /var/log/myscript.log 2>&1`.
2. Compare the environment cron actually provides against your interactive shell's environment — a common trick is a temporary cron job that just runs `env > /tmp/cron-env.txt` and comparing it against `env` run interactively.
3. Check whether the script uses relative paths anywhere, and confirm what cron's actual working directory is during execution (it's often not what you'd assume).
4. Confirm which user account cron is running the job as, and whether that user has the same permissions, credentials, and installed tooling as the user you tested with manually.
5. Add explicit logging/tracing inside the script itself (`set -x`, or manual echo statements with timestamps) so a future failure shows exactly which line didn't behave as expected.

## Commands

```bash
crontab -l

# temporary diagnostic cron entry
* * * * * env > /tmp/cron-env.txt 2>&1
diff <(env | sort) <(sort /tmp/cron-env.txt)

# add logging to the real job
* * * * * /path/to/backup.sh >> /var/log/backup.log 2>&1

# run the script the way cron would, to reproduce without waiting for a schedule
env -i /bin/sh -c '/path/to/backup.sh'
```

## Resolution

Once the actual cause is visible in the logs, the fix is usually one of: setting an explicit `PATH` at the top of the script (or in the crontab itself) rather than relying on an inherited one; converting relative paths to absolute paths, or explicitly `cd`-ing to a known directory at the start of the script; explicitly setting any environment variables the script needs instead of relying on shell profile files cron doesn't source; or fixing a user/permission mismatch if the cron job runs as a different account than was used for manual testing. In all cases, the underlying fix is making the script self-sufficient — not dependent on an interactive shell's environment — rather than trying to make cron's environment match your shell's.

## Prevention

- Write scripts that set their own `PATH` and any required environment variables explicitly at the top, rather than assuming they'll be inherited.
- Use absolute paths for all file references inside scripts intended to run unattended.
- Always redirect cron job output to a log file from the start, so the first failure is diagnosable instead of invisible.
- Test scheduled scripts by actually invoking them the way cron would (minimal environment, correct user, no interactive shell) before trusting a manual test run as representative.

## Interview Follow-Up Questions

- How would this debugging approach differ for a systemd timer instead of cron?
- What's the difference between a login shell and a non-login, non-interactive shell, and why does that matter for which startup files get sourced?
- How would you handle a script that needs credentials (like cloud CLI auth) that are normally provided by an interactive session's environment?

## Key Takeaways

- Cron's execution environment is deliberately minimal and doesn't source shell startup files — never assume it matches an interactive shell.
- "Fails silently" usually just means output isn't being captured anywhere, not that nothing happened — redirect output before debugging further.
- `PATH` issues and relative-path assumptions are the two most common causes of "works manually, fails under cron."
- Write unattended scripts to be self-sufficient (explicit `PATH`, absolute paths, explicit environment) rather than dependent on inherited shell state.

## References

- [Debian Administrator's Handbook: cron and at](https://debian-handbook.info/browse/stable/sysv-startup.html)
- [Linux man-pages: crontab(5)](https://man7.org/linux/man-pages/man5/crontab.5.html)
- [GNU Bash Manual: Bash Startup Files](https://www.gnu.org/software/bash/manual/bash.html#Bash-Startup-Files)
