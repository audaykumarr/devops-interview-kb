---
id: ansible-playbooks-check-mode-false-risk-001
title: "What's the risk of a task using check_mode: false to force it to always execute, even during a supposed dry run?"
category: ansible
subcategory: playbooks
technologies:
  - ansible
difficulty: intermediate
question_type:
  - conceptual
tags:
  - ansible
  - check-mode
  - safety
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

`check_mode: false` on a task forces it to actually execute even when the overall playbook run is a dry run (`--check`). What's the actual risk of using this, and when is it genuinely safe?

## Short Answer

The risk is direct and literal: a "dry run" that someone expects to make zero real changes can actually execute a real, potentially state-changing command, since `check_mode: false` overrides the dry-run intent for that specific task. It's genuinely safe only for tasks that are truly read-only (gathering information needed by later tasks in the same run) — using it on anything that mutates state defeats the entire safety guarantee `--check` is supposed to provide, silently, for whoever's relying on that guarantee.

## Detailed Explanation

`--check` mode exists specifically to let someone preview a playbook's effects without actually applying them — a safety mechanism relied upon precisely because it's supposed to guarantee "nothing real happens." `check_mode: false` on an individual task is an explicit escape hatch from that guarantee for that one task, meaning it runs for real regardless of whether the overall invocation was a dry run.

**The legitimate use case**: some tasks need to gather real information (a fact, a lookup, a query) that later tasks in the *same* run depend on to compute what they would do — since check mode's whole plan needs to be internally consistent, a task supplying data to a later conditional needs to actually run to produce that data, even during a dry run. This is genuinely safe specifically because the task itself is read-only — querying, not mutating.

**The risk**: if `check_mode: false` is applied to a task that actually changes state (installs a package, modifies a file, restarts a service), running a playbook with `--check` no longer provides the guarantee its name implies — someone confidently running `--check` to preview changes before a real apply, trusting that nothing actually happens, would be wrong for that specific task, with no visible warning in the check-mode output that anything different happened there. This is a genuinely dangerous silent violation of the tool's stated contract, especially since the person running `--check` may have no reason to inspect every task's individual `check_mode` setting before trusting the overall dry-run guarantee.

**Why this matters more than it might initially seem**: the entire value of `--check` as a safety practice (reviewing a plan before committing to it, especially for production changes) depends on the guarantee holding uniformly across the whole playbook — a single task quietly breaking that guarantee undermines trust in the mechanism for the whole playbook, not just that one task, since anyone relying on `--check`'s safety now has to individually audit every task rather than trusting the tool's stated behavior.

## Key Takeaways

- `check_mode: false` forces a task to execute for real even during a `--check` dry run, overriding the dry-run guarantee for that specific task.
- It's genuinely safe only for truly read-only tasks whose output later tasks in the same check-mode run depend on.
- Using it on a state-mutating task silently breaks the "nothing real happens" guarantee `--check` is supposed to provide, with no visible warning to whoever's relying on it.
- This risk compounds because it undermines trust in the entire dry-run mechanism, not just the one task using it.

## Interview Follow-Up Questions

- How would you audit a playbook to find every use of `check_mode: false` and verify each one is genuinely read-only?
- What would you document or communicate to teammates about a playbook's use of `check_mode: false`, so `--check` isn't misunderstood as a complete guarantee?
- How does `check_mode: false` interact with `changed_when` on the same task?

## References

- [Ansible: Check mode ("Dry Run")](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html)
