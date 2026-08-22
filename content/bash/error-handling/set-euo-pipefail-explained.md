---
id: bash-error-handling-set-euo-pipefail-001
title: "What does 'set -euo pipefail' actually do at the start of a Bash script, and why is it considered close to mandatory for production scripts?"
category: bash
subcategory: error-handling
technologies:
  - bash
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - bash
  - error-handling
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Nearly every production Bash script starts with `set -euo pipefail`. What does each of these three options actually do, and why does their absence cause real, common bugs?

## Short Answer

`-e` (errexit) makes the script exit immediately if any command fails, instead of Bash's default behavior of plowing ahead to the next line regardless. `-u` (nounset) makes referencing an undefined variable an error, instead of silently substituting an empty string. `-o pipefail` makes a pipeline's exit status reflect the first command that failed within it, instead of only the last command's exit status — without it, a failure in the middle of a pipeline is completely invisible to `-e` and to any code checking `$?`. Together, these three close off three of the most common ways a Bash script silently continues after something has actually gone wrong.

## Detailed Explanation

Bash's default behavior without these options is surprisingly permissive about failure, which is convenient for interactive use (you don't want your terminal session to die because one command failed) but genuinely dangerous for unattended scripts, where a failure that's silently ignored can mean the script proceeds to do something destructive or incorrect based on a false assumption that a prior step succeeded.

**`-e` (errexit) stops the script on the first failing command**: without it, if a command in a script fails (returns non-zero), Bash just moves on to the next line as if nothing happened — meaning a script that, say, fails to `cd` into a directory and then proceeds to `rm -rf *` executes that dangerous command in whatever directory it actually was in, not the one it intended to be in. `-e` converts this into an immediate script exit at the point of failure, rather than silently continuing on a false premise.

**`-u` (nounset) turns referencing an undefined variable into an error**: without it, `$UNDEFINED_VAR` silently evaluates to an empty string — which is exactly the kind of typo (a misspelled variable name) that can turn `rm -rf "$DIR/"` into `rm -rf "/"` if `$DIR` was actually undefined due to a typo, since the empty-string substitution leaves just `/` as the argument. `-u` makes this fail loudly and immediately instead of silently doing something catastrophic.

**`-o pipefail` fixes a specific, easy-to-miss gap in how pipelines report failure**: by default, a pipeline's exit status is just the last command's exit status, regardless of whether an earlier command in the pipeline failed — so `false | true` reports success (exit 0), because `true` (the last command) succeeded, even though `false` (the first command) failed. This means, without `pipefail`, a failure in the middle of a pipeline like `curl ... | jq ... | some-processing` is completely invisible to `-e` and to any script logic checking the pipeline's exit code — `pipefail` makes the whole pipeline's exit status reflect the first failing command, so `-e` (and your own error checking) actually catches it.

**These options interact, and understanding the combination matters more than any one alone**: `-e` alone doesn't catch a mid-pipeline failure without `pipefail`; `-u` alone doesn't stop the script from continuing after a command failure without `-e` — the three together close off distinct, complementary gaps, which is why they're conventionally used as a set rather than individually.

**There are real, documented exceptions and gotchas worth knowing**: `-e` doesn't trigger inside a conditional expression (`if some_command; then` doesn't exit even if `some_command` fails, since checking its exit status is the whole point of the `if`), and doesn't trigger for a command whose failure is explicitly checked (`command || true`, or as part of `&&`/`||` chains) — understanding these exceptions is necessary to avoid being surprised by cases where `-e` doesn't behave the way a naive reading might suggest.

## Key Takeaways

- `-e` (errexit) exits the script immediately on any command failure, instead of silently continuing to the next line as Bash does by default.
- `-u` (nounset) errors on referencing an undefined variable, instead of silently substituting an empty string — catching typos before they cause a dangerous, unintended command.
- `-o pipefail` makes a pipeline's exit status reflect the first failing command, not just the last one — without it, a mid-pipeline failure is invisible to `-e` and to exit-code checks entirely.
- The three options are complementary, closing off distinct gaps — understanding `-e`'s documented exceptions (inside conditionals, explicitly-checked commands) is necessary to avoid surprises.

## Interview Follow-Up Questions

- Why doesn't `-e` cause a script to exit inside an `if some_command; then` block even if `some_command` fails?
- What additional safeguard would you add for a script that needs to handle an expected command failure gracefully, given `-e` is enabled?
- How would you debug a script using `set -euo pipefail` that's exiting at a point you don't expect, without disabling the safety options entirely?

## References

- [GNU Bash Manual: The Set Builtin](https://www.gnu.org/software/bash/manual/bash.html#The-Set-Builtin)
- [Bash Pitfalls (Greg's Wiki)](https://mywiki.wooledge.org/BashPitfalls)
