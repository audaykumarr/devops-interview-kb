---
id: bash-error-handling-idempotent-script-001
title: "A provisioning script failed halfway through, and re-running it from the top caused errors because some resources already existed. How do you make it safely re-runnable?"
category: bash
subcategory: error-handling
technologies:
  - bash
difficulty: intermediate
question_type:
  - practical
  - conceptual
tags:
  - bash
  - idempotency
  - scripting
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A provisioning script failed partway through, leaving infrastructure in a half-created state. Re-running the script from the beginning caused new errors, because some steps tried to create resources that already existed from the partial run. How would you design a Bash script to be safely re-runnable from the start, regardless of how far a previous attempt got?

## Short Answer

Make each step check current state before acting, rather than assuming a clean starting point — "does this resource already exist? if so, skip or verify it; if not, create it" — so re-running the script from the top is always safe, whether it's the first attempt or a retry after a partial failure. This is the same idempotency property expected of any well-designed infrastructure-as-code tool, applied explicitly in a Bash script that doesn't get it for free the way Terraform does.

## Detailed Explanation

The underlying problem is that a naive script written as a straight-line sequence of imperative actions ("create this, then create that") implicitly assumes it's always starting from the same clean state — which is true on a first run, but false on a retry after a partial failure, and the mismatch between that assumption and reality is exactly what causes a rerun to fail differently than the original run did.

**Check for existence before creating, rather than assuming a clean slate**: for each resource or action the script performs, checking "does this already exist / has this already happened" before acting means the script behaves correctly whether it's truly starting fresh or picking up after a partial previous run — a step that finds its target already exists can skip, verify, or (if genuinely needed) update rather than failing on an unexpected "already exists" error.

```bash
if ! resource_exists "my-resource"; then
  create_resource "my-resource"
else
  echo "my-resource already exists, skipping creation"
fi
```

**This check-then-act pattern needs to be applied consistently to every step, not just the one that happened to fail last time**: a script is only genuinely safe to rerun if every step is idempotent this way — fixing just the specific step that failed in the last incident, while leaving other steps still assuming a clean slate, means the script remains fragile against a different partial-failure point next time.

**For steps with genuine side effects that can't simply be "checked and skipped," design for safe re-application instead**: some actions (like sending a notification, or an operation that's inherently not naturally idempotent) need a different strategy — tracking what's already been done in a state file or marker, and having the script check that marker before repeating the action, rather than relying on the underlying operation itself being naturally safe to repeat.

**Logging progress explicitly helps both debugging and manual recovery**: a script that logs clearly which step it's on (and ideally records completed steps somewhere) makes it much easier to understand exactly where a failure happened and whether the idempotency logic is actually working correctly, rather than having to infer progress from incomplete external state after the fact.

**This mirrors the same principle infrastructure-as-code tools handle automatically**: Terraform's `apply` is safe to rerun because it always checks current state against desired state before deciding what action to take — a hand-written Bash provisioning script doesn't get this for free, and needs the same check-before-act discipline built in explicitly, which is exactly why many teams prefer a real IaC tool over hand-rolled provisioning scripts once the complexity crosses a certain threshold.

## Key Takeaways

- A script is only safely re-runnable if every step checks current state before acting, not just the specific step that happened to fail in a past incident.
- The check-existence-then-act pattern (`if ! resource_exists; then create; fi`) is the core mechanism, applied consistently across every step.
- For actions that aren't naturally idempotent (sending a notification, a one-time operation), track completion in a state file or marker and check it before repeating the action.
- This is the same idempotency property IaC tools like Terraform provide automatically — a hand-written provisioning script needs the same discipline built in explicitly.

## Interview Follow-Up Questions

- At what point would you recommend migrating from a hand-written provisioning script to a real IaC tool, given the complexity of building this idempotency by hand?
- How would you handle a step that's genuinely destructive and shouldn't simply be skipped if it appears to have already run?
- How would you test that a script is actually idempotent, beyond just reasoning about the code?

## References

- [GNU Bash Manual](https://www.gnu.org/software/bash/manual/bash.html)
- [Wikipedia: Idempotence](https://en.wikipedia.org/wiki/Idempotence)
