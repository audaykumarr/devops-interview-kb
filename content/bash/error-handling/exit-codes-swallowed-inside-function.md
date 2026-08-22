---
id: bash-error-handling-swallowed-exit-code-001
title: "A script has 'set -e' at the top, but a failing command inside a function doesn't stop the script the way you'd expect. Why not, and how do you fix it?"
category: bash
subcategory: error-handling
technologies:
  - bash
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - bash
  - error-handling
  - exit-codes
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A script starts with `set -e`, and a command failing directly in the main script body correctly stops execution as expected. But the same failing command, when it happens inside a function that's called as part of a larger conditional or command substitution, doesn't stop the script — execution continues past the failure. Why does this happen, and how do you fix it?

## Short Answer

`-e`'s behavior has documented exceptions for commands whose exit status is being explicitly checked or used — and a function call used inside a conditional (`if my_function; then`), as part of `&&`/`||`, or inside a command substitution (`result=$(my_function)`) all count as contexts where the calling code is "checking" the result, which suppresses `-e`'s automatic exit behavior for everything inside that function call, not just the specific top-level command. The fix is checking the function's actual return status explicitly wherever it's called in one of these contexts, since `-e` genuinely won't do it for you there.

## Detailed Explanation

This is one of the most commonly misunderstood `-e` behaviors, and it exists because `-e`'s design principle is "don't exit automatically anywhere the script appears to be deliberately checking a command's success or failure" — but this rule applies to the entire compound command a function call is part of, including everything that executes inside the function, not just the specific line where the function is invoked.

## Symptoms

- A command that reliably triggers `set -e`'s exit behavior when run directly in the main script body doesn't trigger it when the same command runs inside a called function, if that function is itself invoked inside a conditional, command substitution, or `&&`/`||` chain.
- The script continues executing after what should have been a fatal error, potentially with a function's caller receiving unexpected or default values from a failed operation.
- The bug is often intermittent-seeming in how it's discovered, since it depends specifically on the calling context of the function, not the function's own internal code.

## Possible Causes

- The function is called as the condition of an `if` statement (`if my_function; then ...`), which is exactly the context `-e`'s documentation specifies as exempt, since checking a command's exit status via `if` is considered deliberate error handling by the script author.
- The function's output is captured via command substitution (`result=$(my_function)`), and the assignment itself is treated as a context where the function's exit status is available to be checked, even if the calling script doesn't actually check `$?` afterward.
- The function is called as part of an `&&` or `||` chain, which similarly signals to Bash that the caller is handling the result explicitly.

## Investigation Steps

1. Identify the exact calling context of the function where the unexpected behavior occurs — is it inside an `if`, a command substitution, or a `&&`/`||` chain?
2. Confirm this matches one of `-e`'s documented exemption cases, rather than assuming it's a different, unrelated bug.
3. Check whether the function's own internal logic relies on `-e` to catch a failure it doesn't otherwise check — if so, that reliance is the actual root cause, since it only worked by coincidence when the function happened to be called in a "plain" context elsewhere.

## Resolution

1. **Explicitly check the function's own commands' exit status inside the function**, rather than relying on `-e` propagating through every possible calling context — the function's own error handling should be self-sufficient, checking `$?` or command success directly (`command || return 1`) rather than assuming `-e` will always catch a failure regardless of how the function is later called.
2. **Explicitly check the function's return status at each call site that needs to react to it**, especially call sites inside `if`, command substitution, or `&&`/`||` contexts, since these are precisely where `-e`'s automatic behavior is suppressed by design.
3. **Consider restructuring to avoid relying on implicit `-e` propagation through complex call chains at all**, treating explicit error checking (rather than `-e`'s automatic behavior) as the primary mechanism for anything beyond the simplest, most direct script bodies — `-e` is a useful safety net for straightforward top-level scripts, but becomes genuinely hard to reason about correctly once functions and various calling contexts are involved.

## Prevention

- Don't rely purely on `-e` for error handling inside functions that might be called from conditional contexts — write functions to explicitly check and propagate their own internal command failures.
- Document (or better, test) each function's actual failure-handling contract, so callers know whether they need to check its return status explicitly rather than assuming `-e` will always catch a problem.
- Use `shellcheck`, which can flag some (though not all) of these subtle `-e`-exemption cases, as an additional automated check beyond manual code review.

## Key Takeaways

- `-e`'s automatic exit-on-failure behavior is suppressed for a command (including an entire function call and everything inside it) used as the condition of `if`, in a command substitution, or as part of `&&`/`||` — these are documented exceptions, not a bug.
- This means a failure inside a function can go completely uncaught by `-e` if the function is called in one of these contexts, even though the same command would correctly trigger `-e` at the top level of the script.
- Functions should explicitly check and propagate their own internal command failures rather than relying purely on `-e`, since `-e`'s protection isn't guaranteed to reach through every possible calling context.
- `-e` is a reasonable safety net for simple, direct scripts, but becomes genuinely hard to reason about correctly once functions and various calling contexts are involved — explicit error checking is more reliable for anything beyond the simplest cases.

## Interview Follow-Up Questions

- How would you write a function's own error handling to be self-sufficient, independent of whatever context it's later called from?
- What other documented `-e` exceptions exist beyond the ones covered here, and how would you discover them systematically rather than by surprise?
- How would `shellcheck` help catch this class of bug, and what are its limitations in doing so?

## References

- [GNU Bash Manual: The Set Builtin](https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin)
- [Bash Pitfalls (Greg's Wiki)](https://mywiki.wooledge.org/BashPitfalls)
