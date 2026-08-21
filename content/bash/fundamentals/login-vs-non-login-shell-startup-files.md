---
id: bash-fundamentals-login-vs-non-login-shell-001
title: "What's the actual difference between a login shell and a non-login, non-interactive shell, and why does that distinction determine which startup files get sourced?"
category: bash
subcategory: fundamentals
technologies:
  - bash
difficulty: beginner
question_type:
  - conceptual
tags:
  - bash
  - shell
  - fundamentals
estimated_time_minutes: 6
companies: []
related_questions:
  - bash-scripting-cron-environment-mismatch-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Bash startup files (`.bash_profile`, `.bashrc`, `/etc/profile`) don't all get sourced in every situation. What's the actual difference between a login shell and a non-login, non-interactive shell, and why does that distinction determine which files actually run?

## Short Answer

A login shell is one started as part of logging in (a fresh SSH session, a virtual console login) and sources `/etc/profile` plus one of `~/.bash_profile`/`~/.bash_login`/`~/.profile`; an interactive non-login shell (opening a new terminal window/tab on an already-logged-in desktop session) sources `~/.bashrc` instead; a non-interactive shell (running a script, or how cron/systemd invoke commands) sources neither by default — it only picks up whatever `$BASH_ENV` points to, if that's even set. This is exactly why a cron job or CI script can lack environment setup that works fine in a normal terminal: it's neither a login shell nor an interactive shell, so none of the usual startup files run at all.

## Detailed Explanation

Bash decides which startup files to source based on two independent questions: is this a login shell, and is this an interactive shell? The answers determine a specific, documented sourcing behavior:

**Login shell** (started via login, `bash -l`, or as the very first shell of an SSH session): sources `/etc/profile`, then the first of `~/.bash_profile`, `~/.bash_login`, or `~/.profile` that exists (only one, not all three). This is meant to set up a user's environment once per session — `PATH` exports, environment variables meant to apply session-wide.

**Interactive non-login shell** (opening a new terminal window on a desktop where you're already logged in, or running `bash` from within another shell): sources `~/.bashrc` only. This is meant for interactive-specific setup — aliases, shell prompt customization, functions — things that make sense for an interactive session but don't need to be re-run for every single interactive shell you happen to open. It's common practice for `~/.bash_profile` to explicitly source `~/.bashrc` itself, specifically so login shells also get the interactive setup — without that explicit sourcing, a login shell wouldn't pick up `.bashrc`'s contents at all, since it isn't automatically read for login shells.

**Non-interactive, non-login shell** (running a script via `./script.sh` or `bash script.sh`, or how cron and most CI/automation systems invoke commands): sources neither of the above by default. The only startup file Bash considers is whatever the `$BASH_ENV` environment variable points to, and only if it happens to be set — which it usually isn't. This is why anything defined only in `.bashrc` or `.bash_profile` (a `PATH` addition, an alias, an environment variable) is simply invisible to a script run this way, even though it "obviously" works when you type the same command manually in a terminal — the manual terminal session went through the login/interactive sourcing path; the script invocation didn't go through any of it.

This is the mechanical explanation behind the broader "works manually, fails in cron/CI" class of problem: it isn't that cron or CI is broken, it's that non-interactive, non-login shell invocation was never going to source the files an interactive terminal session sources, by Bash's own documented design.

## Key Takeaways

- Login shells source `/etc/profile` plus one of `~/.bash_profile`/`~/.bash_login`/`~/.profile`; interactive non-login shells source only `~/.bashrc`; non-interactive shells source neither by default.
- It's common for `.bash_profile` to explicitly source `.bashrc`, since login shells don't pick it up automatically otherwise.
- Scripts, cron jobs, and most CI/automation invocations are non-interactive, non-login shells — they source none of the usual startup files.
- This is the precise mechanical reason "works in my terminal, fails in cron/CI" happens — it's not a bug, it's Bash's documented startup-file behavior for a different invocation type.

## Interview Follow-Up Questions

- How would you use `$BASH_ENV` deliberately to give a non-interactive script access to specific environment setup?
- Why might putting a `PATH` export in `.bashrc` instead of `.bash_profile` cause it to work in new terminal tabs but not in a fresh SSH login?
- How does this same startup-file logic differ for a POSIX-compliant shell like `sh`/`dash` compared to `bash`?

## References

- [GNU Bash Manual: Bash Startup Files](https://www.gnu.org/software/bash/manual/bash.html#Bash-Startup-Files)
- [GNU Bash Manual: Invoking Bash](https://www.gnu.org/software/bash/manual/bash.html#Invoking-Bash)
