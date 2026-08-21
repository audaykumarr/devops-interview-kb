---
id: ansible-playbooks-confidence-check-mode-with-shell-001
title: "How would you build confidence in a playbook's check-mode output when it has to use command/shell for something with no equivalent module?"
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
  - testing
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Some tasks genuinely need `command`/`shell` because no purpose-built module covers them, and check mode can't safely preview their effect. How would you build real confidence in a playbook's check-mode output despite that gap?

## Short Answer

Make the gap explicit rather than silent: use `changed_when`/`check_mode: false` deliberately so the task's behavior in check mode is a known, documented choice rather than an accident, add a separate, real (non-check-mode) test environment where the actual `command`/`shell` task runs and is verified against expected outcomes, and treat check-mode output as "trustworthy for the covered majority, explicitly flagged as unverified for the specific named exceptions" rather than implicitly trusting the whole plan uniformly.

## Detailed Explanation

The core problem is that check mode's blind spot around `command`/`shell` isn't visible in its own output — a skipped task just looks like "nothing to do here," not "we genuinely don't know what this would do." Building real confidence means making that gap visible and compensating for it deliberately, rather than treating the overall check-mode plan as uniformly trustworthy.

**Document and deliberately configure each exception**: for every `command`/`shell` task that check mode can't meaningfully preview, an explicit decision should be made and recorded — either accept it'll be skipped in check mode (the honest default), or use `check_mode: false` to force it to always run even during a dry run (appropriate only for genuinely read-only commands), or provide a best-effort `changed_when` prediction. Whichever choice is made, it should be a deliberate, documented decision for that specific task, not a silent default nobody thought about.

**Maintain a real (non-check-mode) test environment for these specific tasks**: since check mode structurally can't verify `command`/`shell` tasks' actual effect, the compensating control is running the playbook for real (apply, not just check) against a disposable test environment, specifically to verify these exact tasks behave as expected — this doesn't help the check-mode workflow directly, but it builds independent confidence that the task does the right thing, verified through a different mechanism than check mode.

**Track and periodically audit the list of check-mode gaps**: maintaining an explicit list of "these specific tasks are known check-mode blind spots" (versus discovering this ad hoc when someone's surprised by an unexpected apply-time change) makes the actual coverage visible and reviewable, and gives a concrete artifact to periodically revisit — checking whether a newer version of Ansible or a community module has since closed one of these gaps, converting an accepted `command`/`shell` exception into proper coverage.

**Communicate the limitation explicitly to whoever reviews the check-mode output**: if a team relies on `--check --diff` output as part of a review or approval process, whoever's reviewing needs to know which parts of the plan are genuinely verified previews and which are "known gaps, verify separately" — trusting the full plan uniformly, without that context, risks a false sense of complete coverage.

## Key Takeaways

- Make check-mode gaps explicit and deliberately configured per task, rather than silent defaults nobody examined.
- A real, non-check-mode test environment is the compensating control for verifying exactly the tasks check mode can't preview.
- Maintain and periodically review an explicit list of known check-mode blind spots, checking whether newer tooling has since closed any of them.
- Communicate the limitation to anyone relying on check-mode output for review, so they know which parts are genuinely verified versus known gaps.

## Interview Follow-Up Questions

- How would you automate detection of new `command`/`shell` tasks being added to a playbook, to keep the known-gaps list current?
- What would a lightweight, repeatable test harness for verifying these specific tasks' real behavior look like?
- How would you weigh the cost of building this compensating tooling against simply accepting the coverage gap for low-risk tasks?

## References

- [Ansible: Check mode ("Dry Run")](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [Ansible: command module](https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html)
