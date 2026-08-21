---
id: ansible-playbooks-check-mode-command-shell-limitation-001
title: "Why does Ansible's --check mode skip most command/shell tasks by default, and what does that imply about how much you can actually trust --check --diff output?"
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
  - dry-run
estimated_time_minutes: 6
companies: []
related_questions:
  - ansible-playbooks-not-idempotent-every-run-changed-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Running `ansible-playbook --check` is supposed to give a safe dry-run preview of what would change. But `command` and `shell` tasks get skipped by default in check mode rather than actually previewed. Why does that happen, and what does it mean for how much you can trust `--check --diff` output overall?

## Short Answer

Check mode works by asking each module "what would you change, without actually changing it" — purpose-built modules know how to answer that safely because they separately implement inspection and mutation. `command`/`shell` have no such separation: the module's only capability is "run this arbitrary shell command," so there's no safe way to simulate its effect without actually running it, and Ansible skips it by default rather than guess. This means `--check --diff` output is only as complete as the modules used — any playbook leaning on `command`/`shell` has real blind spots check mode can't see into.

## Detailed Explanation

Ansible's check mode relies on individual modules implementing "check mode support" — the ability to determine and report what they *would* do without actually doing it. Purpose-built modules (`file`, `copy`, `template`, `package`, `service`, etc.) can do this because they already separate "inspect current state" from "apply desired state" internally — check mode just runs the inspection half and reports the predicted diff without running the mutation half.

`command` and `shell` don't have that separation at all — the module's entire job is "execute this string as a shell command," and there's no generic way to know what a given command would do without running it. A command could be entirely read-only (`echo`, `cat`) or could delete a directory tree; Ansible has no way to distinguish these from the module's perspective. Given that ambiguity, the safe default is to skip the task in check mode entirely (reporting it as skipped, not as unchanged or changed) rather than either guess at an effect or actually execute something potentially destructive during what's supposed to be a dry run.

This has a real practical consequence: `ansible-playbook --check --diff` output is trustworthy exactly to the extent that a playbook avoids `command`/`shell` for anything with real side effects. A playbook built mostly from purpose-built modules gets a genuinely useful, complete dry-run preview. A playbook leaning heavily on `command`/`shell` (the same anti-pattern that breaks idempotency reporting) gets a check-mode run with real blind spots — tasks silently skipped, meaning the "preview" doesn't actually reflect everything that would happen on a real run. Some `command`/`shell` tasks can opt into limited check-mode behavior via `check_mode: false` (force it to always run, even during check mode — useful for genuinely read-only commands) or by using `creates`/`removes` to give Ansible enough information to predict skip/run behavior, but neither of these makes the task's actual effect visible in the diff the way a purpose-built module's would be.

## Key Takeaways

- Check mode works by having each module report a predicted diff instead of applying it — purpose-built modules can do this because they already separate inspection from mutation.
- `command`/`shell` can't safely support this, since Ansible has no generic way to know what an arbitrary shell command would do without running it — so it's skipped by default in check mode.
- `--check --diff` output is only as trustworthy as the modules used; heavy `command`/`shell` usage creates real blind spots in the dry-run preview.
- `check_mode: false` and `creates`/`removes` give limited control over `command`/`shell` behavior during check mode, but don't restore full diff visibility.

## Interview Follow-Up Questions

- How would you build confidence in a playbook's check-mode output when it has to use `command`/`shell` for something with no equivalent module?
- What's the risk of a task using `check_mode: false` to force it to always execute, even during a supposed dry run?
- How would you audit an existing large playbook to find all the places check mode's coverage is actually incomplete?

## References

- [Ansible: Check mode ("Dry Run")](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [Ansible: command module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html)
