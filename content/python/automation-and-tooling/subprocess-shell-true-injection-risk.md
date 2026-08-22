---
id: python-automation-tooling-subprocess-shell-true-risk-001
title: "A Python automation script uses subprocess.run(f'kubectl get pod {pod_name}', shell=True) where pod_name comes from user input. What's actually wrong with this, and how do you fix it?"
category: python
subcategory: automation-and-tooling
technologies:
  - python
difficulty: advanced
question_type:
  - security
  - troubleshooting
tags:
  - python
  - subprocess
  - security
  - command-injection
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An internal automation tool includes this pattern: `subprocess.run(f"kubectl get pod {pod_name}", shell=True)`, where `pod_name` comes from user input (a web form, a CLI argument, an API request body). What's actually wrong with this, and how do you fix it?

## Short Answer

This is a textbook command injection vulnerability: `shell=True` runs the string through an actual shell, meaning any shell metacharacter in `pod_name` (`;`, `|`, `` ` ``, `$()`) is interpreted by the shell, not treated as a literal argument — a malicious input like `mypod; rm -rf /` would execute a second, completely different command with whatever privileges the script has. The fix is passing arguments as a list without `shell=True`, which bypasses shell interpretation entirely and treats the entire value as a single literal argument to `kubectl`, regardless of what characters it contains.

## Detailed Explanation

The vulnerability exists because `shell=True` causes Python to hand the entire constructed string to an actual shell process (`/bin/sh -c "..."` on Unix) for interpretation, exactly as if you'd typed that string into a terminal — meaning the shell's own metacharacter interpretation (command separators, pipes, substitution) applies fully to whatever ends up in that string, including any part built from user input.

## Symptoms

- A security review or penetration test flags the `subprocess.run(..., shell=True)` pattern combined with unsanitized user input as a command injection vulnerability.
- In the worst case, an actual exploitation attempt shows unexpected commands executing with the automation tool's own privileges.

## Possible Causes

- `shell=True` is used, often because it was the first pattern that worked during development (allowing convenient use of shell features like pipes or globbing) without considering the security implications of untrusted input reaching that string.
- User-controlled input (a form field, a CLI argument, a value parsed from an API request) is interpolated directly into the command string via an f-string or `.format()`, with no escaping or validation.
- No input validation restricts what characters `pod_name` is allowed to contain before it reaches the command construction.

## Investigation Steps

1. Identify every place in the codebase where `subprocess` (or `os.system`, which carries the same risk) is called with `shell=True` and any part of the command string derived from external input.
2. For each instance, trace the input's origin to confirm whether it's genuinely user-controllable (versus a hardcoded or internally-generated value that happens to look similar but isn't actually attacker-influenced).
3. Test with a deliberately crafted malicious input (in a safe, isolated environment) to confirm the injection is actually exploitable as suspected, rather than assuming based on pattern-matching alone.

## Resolution

1. **Pass arguments as a list, without `shell=True`**: `subprocess.run(["kubectl", "get", "pod", pod_name])` — this bypasses shell interpretation entirely; `pod_name` is passed as a single, literal argument to the `kubectl` process directly, regardless of what characters it contains, since there's no shell in the middle to interpret metacharacters.
2. **If shell features (pipes, globbing) are genuinely needed**, use `shlex.quote()` to properly escape any user-controlled portion of the command string before interpolating it — though switching to the list-based, `shell=False` approach is almost always preferable when it's possible, since it eliminates the risk class entirely rather than requiring correct escaping every time.
3. **Add input validation as defense in depth**, restricting `pod_name` to an expected format (e.g., matching Kubernetes' own valid resource-name pattern) before it's used at all — this doesn't replace the list-based fix, but adds a second layer catching malformed or suspicious input even if a future code change accidentally reintroduces a `shell=True` pattern elsewhere.
4. **Audit for the same pattern elsewhere in the codebase**, since a command injection vulnerability found in one place is a strong signal the same anti-pattern (interpolating input into a shell string) may exist in other automation scripts written by the same team or around the same time.

## Prevention

- Default to `subprocess.run([...])` with a list of arguments and no `shell=True`, treating `shell=True` as something requiring explicit justification, not the default choice.
- Add a linting rule or code review checklist item specifically flagging `shell=True` combined with any string interpolation, so this pattern is caught before merge rather than discovered in a security review.
- Validate and constrain user input format at the boundary (as soon as it enters the system) rather than only at the point it's used in a subprocess call, providing defense in depth.

## Key Takeaways

- `shell=True` runs the constructed command string through an actual shell, meaning shell metacharacters in any user-controlled portion are interpreted, not treated as literal text — this is the root cause of the injection risk.
- Passing arguments as a list without `shell=True` is the direct fix, since it bypasses shell interpretation entirely regardless of what characters the input contains.
- `shlex.quote()` is a fallback for cases where shell features are genuinely needed, but the list-based approach is preferable whenever possible since it eliminates the risk class rather than requiring correct escaping.
- Audit for the same anti-pattern elsewhere in the codebase — a command injection vulnerability found once is a signal to check for the same mistake in similar code written around the same time.

## Interview Follow-Up Questions

- What's the equivalent risk and fix for `os.system()`, and why is `subprocess.run()` generally preferred over it regardless of injection concerns?
- How would you retrofit input validation onto an existing large codebase with many similar subprocess calls, prioritizing effectively?
- How does this same class of vulnerability apply to other languages and contexts, like constructing SQL queries via string interpolation?

## References

- [Python docs: subprocess — Security Considerations](https://docs.python.org/3/library/subprocess.html#security-considerations)
- [OWASP: OS Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
