---
id: bash-error-handling-quoting-pitfalls-001
title: "A script that processes filenames from a directory listing works fine in testing, but breaks (or silently does the wrong thing) the moment a filename has a space in it. Why, and how do you fix it?"
category: bash
subcategory: error-handling
technologies:
  - bash
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - bash
  - quoting
  - word-splitting
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Bash script loops over files and processes each one — `for f in $(ls *.log); do process "$f"; done`. It works correctly in testing, but breaks or silently does the wrong thing the moment a filename contains a space (or worse, is manipulated incorrectly). Why does this happen, and how do you fix it?

## Short Answer

The root cause is unquoted command substitution triggering word splitting: `$(ls *.log)` produces a single string, and without quotes, Bash splits that string on whitespace (spaces, tabs, newlines) before the `for` loop ever sees it — a filename with a space in it gets split into two separate "words," each treated as a separate loop iteration on a fragment of the real filename, not the actual full filename. The fix is avoiding this pattern entirely: use a glob directly (`for f in *.log; do ...; done`) rather than parsing `ls` output, and quote every variable expansion to prevent unwanted word splitting and globbing.

## Detailed Explanation

Unquoted variable and command substitution expansions in Bash undergo word splitting (breaking the result into separate words based on `$IFS`, whitespace by default) and pathname expansion/globbing (treating `*`, `?`, etc. in the result as glob patterns) — this is Bash's default, long-standing behavior, and it's almost never what you actually want when the expansion's content is meant to be treated as a single, literal value like a filename.

## Symptoms

- A script that processes filenames works correctly for filenames without spaces, but breaks or silently misprocesses files with spaces or other special characters.
- A loop appears to iterate more times than there are actual files, or processes fragments of filenames rather than complete ones.
- The `for f in $(ls ...)` (or similar unquoted command substitution) pattern appears somewhere in the script.

## Possible Causes

- Parsing `ls` output at all is fragile, since `ls`'s output format isn't designed to be machine-parsed reliably (it can also behave differently depending on locale, aliasing, or formatting flags) — using a glob directly is both simpler and correct.
- Unquoted `$(...)` command substitution triggers word splitting on the result, breaking a single filename containing a space into multiple separate words.
- A variable holding a filename is referenced unquoted elsewhere in the script (`process $filename` instead of `process "$filename"`), causing the same word-splitting problem even after the initial file list is correctly obtained.
- The filename itself contains a glob-special character (`*`, `?`), and an unquoted expansion causes unwanted pathname expansion against the current directory's actual files.

## Investigation Steps

1. Identify every place a variable or command substitution is used unquoted in the script, since each one is a potential word-splitting or globbing bug, not just the one that happened to be triggered by this specific test case.
2. Confirm the specific pattern causing the reported issue — test directly with a filename containing a space to reproduce.
3. Check whether the script is parsing `ls` output anywhere, since that's a strong signal of the underlying anti-pattern even beyond the specific symptom currently being investigated.

## Resolution

1. **Use a glob directly instead of parsing `ls` output**: `for f in *.log; do process "$f"; done` — Bash's own globbing correctly handles each matched filename as a single, complete word, entirely avoiding the word-splitting problem `$(ls ...)` introduces.
2. **Quote every variable expansion involving a filename or any value that might contain spaces or special characters**: `"$f"` not `$f`, everywhere the variable is used, not just where the bug happened to be caught — this is the single most important habit, since an unquoted expansion anywhere in the script can reintroduce the same class of bug.
3. **For genuinely dynamic file lists that can't use a simple glob** (e.g., reading filenames from a file, one per line), use a `while IFS= read -r line; do ... done < file` loop rather than a `for` loop over unquoted command substitution — `read` handles each line correctly without word-splitting issues, provided `IFS=` and `-r` are set correctly.
4. **Verify the fix** by testing explicitly with filenames containing spaces, and ideally other special characters (`*`, quotes, newlines) to confirm the fix is genuinely robust, not just fixed for the one specific case that was reported.

## Prevention

- Adopt "quote every variable expansion by default" as a standing habit, only leaving something unquoted when you specifically want word splitting or globbing to occur (a genuinely rare, deliberate case).
- Never parse `ls` output for filenames — use globs, or `find` with `-print0` piped to `xargs -0` (or a `while read` loop reading null-delimited output) for cases needing more complex filtering.
- Use a shell linter like `shellcheck` in CI, which specifically catches unquoted expansions and many other common Bash pitfalls automatically, rather than relying on manually remembering every rule.

## Key Takeaways

- Unquoted command substitution and variable expansion trigger word splitting (on whitespace) and globbing — the root cause of "works until a filename has a space in it" bugs.
- Never parse `ls` output — use a glob directly (`for f in *.log`), which correctly treats each matched filename as one complete word.
- Quote every variable expansion as a standing default habit, not just in the specific place a bug was caught, since the same class of bug can hide elsewhere in the script.
- Use `shellcheck` in CI to catch unquoted expansions and other common quoting pitfalls automatically.

## Interview Follow-Up Questions

- How would you safely handle filenames containing newlines, which even a `while read` loop with default settings can mishandle?
- What's the difference between `find ... -print0 | xargs -0` and a simple glob, and when would you need the more complex approach?
- How would you configure `shellcheck` to run automatically in CI for a repository with many existing Bash scripts?

## References

- [Bash Pitfalls (Greg's Wiki)](https://mywiki.wooledge.org/BashPitfalls)
- [ShellCheck](https://www.shellcheck.net/)
- [GNU Bash Manual: Word Splitting](https://www.gnu.org/software/bash/manual/bash.html#Word-Splitting)
