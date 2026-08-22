---
id: bash-error-handling-trap-cleanup-001
title: "A deployment script creates a temporary lock file at the start, but if the script fails partway through, the lock file is left behind and blocks every future run. How would you fix this?"
category: bash
subcategory: error-handling
technologies:
  - bash
difficulty: intermediate
question_type:
  - practical
tags:
  - bash
  - error-handling
  - trap
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A deployment script creates a lock file at the start (to prevent overlapping runs) and removes it at the end. But if the script fails or is interrupted partway through, the lock file removal at the end never executes, leaving a stale lock file that blocks every future run until someone manually removes it. How would you fix this?

## Short Answer

Use `trap` to register a cleanup function that runs automatically on script exit, regardless of whether the script finished normally, failed, or was interrupted — `trap 'rm -f "$LOCKFILE"' EXIT` guarantees the lock file gets removed no matter how the script actually terminates, rather than relying on cleanup code at the end of the script that only runs if execution reaches that point normally.

## Detailed Explanation

The core problem is that cleanup code placed at the end of a script only executes if the script actually reaches that line — any failure, early exit, or interruption before that point (exactly the cases where cleanup matters most, since something went wrong) skips right past it, leaving the cleanup undone. `trap` solves this by registering a handler that Bash guarantees to run when the script exits, regardless of the exit path.

**`trap 'commands' EXIT` runs on any script termination**: whether the script finishes normally, calls `exit` explicitly, fails due to `set -e`, or is terminated by certain signals, the `EXIT` trap fires — this is fundamentally different from cleanup code at the end of the script, which is just another line that has to be reached through normal execution flow to run at all.

```bash
LOCKFILE="/tmp/deploy.lock"
trap 'rm -f "$LOCKFILE"' EXIT

# Now register the lock
touch "$LOCKFILE"

# ... rest of the deployment script, including anything that might fail ...
```

Registering the trap immediately after creating the resource that needs cleanup (right after `touch "$LOCKFILE"`, or ideally even before, depending on the exact ordering needed) means from that point forward, no matter what happens next in the script, the lock file will be removed when the script exits.

**Traps can also handle specific signals, not just normal exit**: `trap 'cleanup' INT TERM` additionally catches interruption signals (Ctrl-C, or a `kill` sent to the process) — combined with an `EXIT` trap, this covers both "the script failed or finished normally" and "someone or something external interrupted it," giving comprehensive cleanup coverage across the realistic ways a script can stop running.

**A single trap can call a proper cleanup function for more complex cleanup logic**: rather than cramming cleanup logic into the trap command itself, defining a `cleanup()` function and trapping that (`trap cleanup EXIT`) keeps the script readable and lets cleanup involve multiple steps (removing the lock file, but also perhaps logging that cleanup occurred, or reverting a partial change) without an unwieldy one-liner.

**This pattern generalizes well beyond lock files**: any resource a script creates that needs guaranteed cleanup — a temporary directory, a background process that needs to be killed, a database transaction that needs an explicit rollback if not committed — benefits from the same `trap ... EXIT` pattern, since the underlying problem (cleanup code only running on the happy path) applies identically to all of them.

## Key Takeaways

- Cleanup code placed at the end of a script only runs if execution reaches that line normally — exactly the cases where cleanup matters most (a failure or interruption) skip right past it.
- `trap 'cleanup-command' EXIT` guarantees the cleanup runs regardless of how the script actually terminates, closing this gap structurally rather than relying on normal control flow reaching the end.
- Register the trap immediately after creating the resource needing cleanup, so no window exists where the resource could leak before cleanup is guaranteed.
- The same pattern applies to any resource needing guaranteed cleanup — temp files, background processes, lock files, partial transactions — not just this specific lock-file example.

## Interview Follow-Up Questions

- How would you handle a case where the cleanup itself might fail — should the script still report the original error, or the cleanup failure?
- What's the difference between trapping `EXIT` versus trapping specific signals like `INT` and `TERM`, and when would you need both?
- How would you test that your trap-based cleanup actually works correctly across different failure scenarios, not just the happy path?

## References

- [GNU Bash Manual: Bourne Shell Builtins (trap)](https://www.gnu.org/software/bash/manual/bash.html#index-trap)
- [Bash Pitfalls (Greg's Wiki)](https://mywiki.wooledge.org/BashPitfalls)
