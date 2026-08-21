---
id: ansible-playbooks-auditing-check-mode-coverage-001
title: "How would you audit an existing large Ansible playbook to find all the places check mode's coverage is actually incomplete?"
category: ansible
subcategory: playbooks
technologies:
  - ansible
difficulty: advanced
question_type:
  - practical
tags:
  - ansible
  - check-mode
  - auditing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A large, established playbook has accumulated many tasks over time, and it's unclear how much of it check mode can actually meaningfully preview. How would you audit it to find every place check-mode coverage is incomplete?

## Short Answer

Search the playbook systematically for `command`/`shell` module usage (the primary source of check-mode gaps) and for explicit `check_mode: false` overrides, cross-reference each finding against whether it has a `changed_when` making its check-mode behavior at least partially informative, and separately run the playbook with `--check --diff -v` to directly observe which tasks report as skipped due to check-mode limitations — combining static analysis (searching the source) with dynamic verification (actually running it) gives a more complete picture than either alone.

## Detailed Explanation

**Static search for the primary gap sources**: grep (or a proper YAML-aware search) across the playbook and any included roles for `command:`/`shell:` module usage — every instance is a candidate check-mode gap, since these modules can't safely preview their effect by default. Similarly search for `check_mode: false` — every instance is a deliberate override worth verifying is genuinely read-only, per the earlier risk discussion. This gives a comprehensive static inventory without needing to actually execute anything.

**Cross-reference against mitigations already in place**: for each `command`/`shell` task found, check whether it already has `changed_when` (giving at least partial check-mode-relevant signal about whether it *would* report changed, even though its actual effect still can't be previewed) or `creates`/`removes` (letting check mode at least predict skip/run behavior). Tasks with neither are the highest-priority gaps — completely opaque to check mode with no mitigating configuration at all.

**Dynamic verification via actually running check mode**: running `ansible-playbook --check --diff -vv` and reviewing the output for tasks reporting as `skipped` specifically due to check-mode limitations (Ansible's own check-mode-skip messaging, visible in verbose output) directly confirms which tasks are actually being skipped in practice, complementing the static search — this catches cases the static search might miss (a module other than `command`/`shell` that also has incomplete check-mode support for certain parameter combinations) and confirms the static findings are actually manifesting as expected.

**Produce a prioritized, actionable inventory, not just a raw list**: the audit's output should be a list of specific tasks, each tagged with why it's a gap (no module equivalent exists, versus a module equivalent exists but wasn't used, versus a deliberate `check_mode: false` override) and a rough risk/priority assessment (how often this task runs, how consequential a wrong preview would be) — turning the audit into something that can actually drive a prioritized remediation effort (per the earlier retrofitting-idempotency discussion) rather than just a long, undifferentiated list.

**Make this a repeatable check, not a one-time audit**: since new tasks get added to a large playbook continuously, a one-time audit goes stale — building the static search into a linting step (part of CI, or a pre-commit check) that flags new `command`/`shell` usage without `changed_when` keeps the coverage gap from silently regrowing after the initial audit.

## Key Takeaways

- Static search for `command`/`shell` usage and `check_mode: false` overrides gives a comprehensive inventory of candidate check-mode gaps.
- Cross-referencing against existing `changed_when`/`creates`/`removes` mitigations identifies which gaps are partially covered versus completely opaque.
- Running `--check --diff -vv` and reviewing skip messages verifies the static findings actually manifest, catching anything the static search might miss.
- Turning the audit into a repeatable CI/lint check prevents the coverage gap from silently regrowing as new tasks are added over time.

## Interview Follow-Up Questions

- How would you prioritize which identified gaps to actually fix first, given limited time?
- What would a CI lint rule enforcing "new command/shell tasks must have changed_when" actually look like?
- How would you handle a gap inside a third-party role you don't control the source of?

## References

- [Ansible: Check mode ("Dry Run")](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [Ansible: command module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html)
