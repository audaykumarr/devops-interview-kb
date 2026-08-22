---
id: python-automation-tooling-cli-exit-codes-001
title: "A Python CLI tool used in CI pipelines always exits with code 0, even when it detects and reports a real failure. What breaks because of this, and how do you fix it?"
category: python
subcategory: automation-and-tooling
technologies:
  - python
difficulty: intermediate
question_type:
  - practical
tags:
  - python
  - cli
  - exit-codes
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Python CLI tool used as a CI pipeline step (for example, a custom validation script) prints an error message and a clear "FAILED" line when it detects a problem — but the script always exits with status code 0. As a result, the CI pipeline treats every run as successful, even when the tool's own output says otherwise. What's actually broken here, and how do you fix it?

## Short Answer

CI systems (and shell scripting generally) determine success or failure by a process's exit code, not by parsing its printed output — a script that prints "FAILED" but exits 0 is telling every automated caller "I succeeded," regardless of what the human-readable text says, since nothing downstream is reading and interpreting that text. The fix is calling `sys.exit(1)` (or any non-zero code) on the failure path, and reserving `sys.exit(0)` (or simply falling off the end of `main()`) for genuine success — making the exit code, not the printed text, the actual source of truth for automation.

## Detailed Explanation

The core misunderstanding is treating a script's printed output as its primary interface to automation, when in fact the exit code is the actual, universally-understood contract between a process and anything that invokes it — shells, CI systems, and orchestration tools all check exit codes to determine success or failure, and none of them parse arbitrary printed text to infer that (nor should a script rely on them doing so).

**Exit code 0 means success, any non-zero code means failure, by long-standing Unix convention**: this convention is what `&&`, `||`, `set -e`, and every CI system's "did this step pass or fail" logic is built on — a script that always exits 0 is asserting success unconditionally, regardless of what actually happened inside it, which silently breaks any automation depending on that signal.

```python
import sys

def main():
    problems = run_validation()
    if problems:
        print(f"FAILED: {len(problems)} issue(s) found")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print("All checks passed")
    sys.exit(0)

if __name__ == "__main__":
    main()
```

**Different non-zero codes can carry additional meaning, if useful**: while any non-zero value signals general failure, some tools use distinct exit codes for different failure categories (e.g., exit 2 for "invalid arguments" versus exit 1 for "validation failed") — this is optional but can let calling automation react differently to different failure types, rather than treating all failures identically.

**An uncaught exception already produces a non-zero exit code by default**: if the script's failure path is an unhandled exception rather than a deliberately detected condition, Python's default behavior (printing a traceback and exiting with status 1) already provides correct exit-code behavior without needing an explicit `sys.exit()` call — the bug specifically arises when a script *catches* an error condition, handles it gracefully enough to print a clear message, but then forgets to also propagate that as a non-zero exit code, which is easy to overlook precisely because the script appears to be "handling" the error correctly from a human-reading-the-output perspective.

**This matters most exactly where a human isn't reading the output directly**: in an interactive session, a person can read "FAILED" and understand what happened regardless of the exit code — the bug only becomes consequential in automation (CI pipelines, cron jobs, orchestration) where nothing is reading the text, and the exit code is the only signal available.

## Key Takeaways

- CI systems and shell scripting determine success/failure via exit code, not by parsing a script's printed output — a script that prints "FAILED" but exits 0 is asserting success to every automated caller.
- Explicitly call `sys.exit(1)` (or another non-zero code) on any detected failure path, reserving 0 for genuine success.
- An uncaught exception already exits non-zero by default — the bug specifically arises when a script gracefully catches and reports an error but forgets to also propagate a non-zero exit code.
- This bug is invisible to a human reading the output directly, and only becomes consequential in automation where the exit code is the only available success/failure signal.

## Interview Follow-Up Questions

- How would you design distinct exit codes for different failure categories, and what would calling automation do differently based on them?
- How would you test that a CLI tool's exit code behavior is actually correct, beyond just reading its printed output?
- How does this same principle apply to a script that's meant to be used both interactively and as part of automation?

## References

- [Python docs: sys.exit](https://docs.python.org/3/library/sys.html#sys.exit)
- [Advanced Bash-Scripting Guide: Exit Codes](https://tldp.org/LDP/abs/html/exit-status.html)
