---
id: ansible-playbooks-not-idempotent-every-run-changed-001
title: "An Ansible playbook reports \"changed\" on the same tasks every single run, even when nothing about the target host actually changed. Why, and how do you fix it?"
category: ansible
subcategory: playbooks
technologies:
  - ansible
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - ansible
  - idempotency
  - playbooks
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An Ansible playbook reports certain tasks as `changed` on every single run, even immediately after a run that supposedly already applied the change. Why does this happen, and how would you fix it so the playbook is properly idempotent?

## Short Answer

This almost always means the task is using a module that can't accurately detect current state — most commonly `command` or `shell` running an imperative command instead of a declarative module — so Ansible has no way to know the desired state was already reached and reports `changed` unconditionally. The fix is to replace the imperative command with the equivalent state-based module (e.g. `copy`/`template`/`lineinfile` instead of `echo >>`, `package` instead of `apt-get install` via `shell`, `service` instead of `systemctl restart` via `command`) so Ansible can compare current vs. desired state itself.

## Detailed Explanation

Ansible's idempotency model relies on each module knowing how to inspect the target's current state and compare it against the task's declared desired state, only reporting `changed` when an actual difference was found and corrected. Purpose-built modules (`file`, `copy`, `template`, `lineinfile`, `package`, `service`, `user`, etc.) do exactly this. The `command` and `shell` modules are different in kind: they just run an arbitrary shell command and report `changed: true` unconditionally (because Ansible has no idea what that command does or whether it changed anything), unless the task explicitly opts out via `changed_when` or is guarded by `creates`/`removes`.

This is the single most common idempotency bug in real playbooks: someone reaches for `shell: echo "some line" >> /etc/somefile.conf` instead of `lineinfile`, or `command: systemctl restart nginx` instead of `service: name=nginx state=restarted`, and it works functionally but breaks the "changed" signal — every run reports changed even when the file already has that line, and every run actually restarts nginx unnecessarily. Beyond just noisy output, this has real consequences: `handlers` notified by a task that's always `changed` fire every run instead of only when needed, and `--check` mode (dry-run) becomes meaningless for that task since `command`/`shell` can't be checked without actually running them (Ansible skips them in check mode and just assumes changed).

## Symptoms

- The same task reports `changed` on every run of the playbook, including immediately re-running right after a previous successful run.
- Handlers notified by that task fire on every run (e.g. a service restarts every deploy even when its config didn't change).
- `ansible-playbook --check` either fails to accurately predict the task's effect, or the task is silently skipped in check mode.

## Possible Causes

- The task uses `command` or `shell` for something a purpose-built module already handles (file edits, package installs, service state, user/group management).
- The task uses `command`/`shell` for something with no equivalent module, but doesn't set `changed_when` (or `creates`/`removes`) to tell Ansible how to judge success.
- A templated file (`template` module) includes a value that changes on every render even when nothing meaningful changed — e.g. an embedded timestamp — making every run look like a real diff.

## Investigation Steps

1. Identify the specific task(s) reporting `changed` every run via `-v` (or `-vv`) output, which shows which module ran.
2. If the module is `command` or `shell`, check whether a purpose-built module exists for the same intent (file state, package state, service state) — this covers the large majority of cases.
3. If `command`/`shell` is genuinely necessary (no equivalent module), check whether `changed_when`, `creates`, or `removes` is set.
4. If the task uses `template`, diff the rendered output between two runs to check for accidental non-idempotent content like a timestamp or random value baked into the template.

## Commands

```bash
ansible-playbook site.yml -vv

ansible-playbook site.yml --check --diff

ansible-doc lineinfile
ansible-doc copy
ansible-doc service
```

## Resolution

Replace the imperative `command`/`shell` task with the matching declarative module wherever one exists — this is the correct fix in most real cases and restores true idempotency for free, since the module handles state comparison internally. Where no module fits and `command`/`shell` is genuinely required, add `changed_when` with a condition based on the command's actual output or return code (e.g. `changed_when: "'already applied' not in result.stdout"`), or use `creates`/`removes` to let Ansible infer state from a file's presence. For templates rendering a non-deterministic value, remove that value from the template or move it somewhere idempotency doesn't need to cover.

## Prevention

- Default to purpose-built modules; treat reaching for `command`/`shell` as a signal to first check `ansible-doc -l` for an existing module.
- Whenever `command`/`shell` is unavoidable, make setting `changed_when` (and ideally `failed_when`) part of the task from the start, not an afterthought.
- Run playbooks with `--check --diff` in CI against a known environment to catch tasks that can't be meaningfully checked (a proxy for "not really idempotent").
- Code review playbooks specifically for `command`/`shell` usage the same way you'd review for a missed edge case — it's the highest-signal place idempotency bugs hide.

## Interview Follow-Up Questions

- Why does `--check` mode skip most `command`/`shell` tasks by default, and what does that imply about trusting `--check --diff` output?
- How would you retrofit idempotency checks into an existing large playbook without rewriting every task at once?
- What's the difference between idempotency and "safe to re-run" — can a task be safely re-run without being truly idempotent?

## Key Takeaways

- `command` and `shell` report `changed` unconditionally because Ansible can't inspect their effect the way it can with state-based modules.
- The fix is almost always "use the purpose-built module instead," not "add more logic around the shell command."
- `changed_when`/`creates`/`removes` are the escape hatch for the genuine cases where no module exists.
- Non-idempotent tasks silently break handler behavior and make `--check` mode unreliable, not just noisy output.

## References

- [Ansible: Controlling how modules report changes](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html#controlling-what-defines-failure)
- [Ansible: command module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html)
- [Ansible: Idempotency and check mode](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html)
