---
id: terraform-state-drift-vs-config-change-refresh-only-001
title: "What's the difference between state drift and a genuine configuration change in Terraform, and how does -refresh-only help distinguish them?"
category: terraform
subcategory: state
technologies:
  - terraform
difficulty: intermediate
question_type:
  - conceptual
  - comparison
tags:
  - terraform
  - state
  - drift
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A `terraform plan` showing a change could mean two different things: drift (reality diverged from Terraform's last-known state) or a genuine configuration change (someone edited the `.tf` files). How does `-refresh-only` help distinguish between them?

## Short Answer

State drift is a mismatch between Terraform's stored state and the resource's actual live state (caused by something outside Terraform changing it); a genuine configuration change is a mismatch between the configuration files and the stored state (caused by someone editing the `.tf` code). A normal `terraform plan` conflates both into a single diff against configuration, making it hard to tell which caused a given change. `terraform plan -refresh-only` isolates just the first question — it refreshes state against real infrastructure and shows *only* what's different between the old stored state and the newly-refreshed state, without comparing against configuration at all, directly surfacing drift in isolation.

## Detailed Explanation

Terraform's normal `plan` operation actually does two things at once, by default: it refreshes state (checking the actual live infrastructure against what Terraform last recorded) and then computes a diff between that refreshed state and the declared configuration — producing one combined plan output that doesn't distinguish "this changed because reality drifted" from "this changed because someone edited the config." Both look like "changes" in the plan, and reading the plan output alone doesn't automatically tell you which category a given change actually falls into, even though the two have very different implications (drift usually needs investigation into *why* something changed outside Terraform; a genuine config change is presumably intentional and just needs normal review).

`terraform plan -refresh-only` decouples this: it refreshes state against real infrastructure exactly as normal, but then shows a plan comparing the **old state to the newly-refreshed state** — not against configuration at all. This isolates drift specifically: any difference shown in a `-refresh-only` plan is, by construction, something that changed outside of Terraform's own applies (since it's purely state-vs-reality, with configuration not even part of the comparison), giving a direct, unambiguous view of drift alone.

Once drift is identified via `-refresh-only`, a separate, normal `terraform plan` (comparing the now-refreshed state against configuration) shows what would need to change to bring the resource back in line with the declared configuration — the combination of the two commands run in sequence gives you the full picture: `-refresh-only` tells you what drifted and why (a real change happened outside Terraform), and the follow-up normal plan tells you what applying would actually do about it (revert the drift, assuming configuration wasn't also updated to match the new intentional state).

`terraform apply -refresh-only` (applying just the refresh) updates Terraform's stored state to match the newly-observed reality without changing any actual infrastructure — useful specifically when the drift was legitimate and intentional (someone made a deliberate out-of-band change that should now be treated as the new baseline) and you want Terraform's state to acknowledge that reality without either reverting it or needing to update the `.tf` configuration files to match first.

## Key Takeaways

- State drift is a state-vs-reality mismatch (something changed outside Terraform); a configuration change is a config-vs-state mismatch (someone edited the `.tf` files) — a normal plan conflates both into one diff.
- `-refresh-only` isolates drift specifically by comparing old state to newly-refreshed state, with configuration excluded from the comparison entirely.
- Running `-refresh-only` first, then a normal plan, gives the full picture: what drifted, and separately, what applying would do to reconcile it.
- `terraform apply -refresh-only` updates stored state to match observed reality without changing infrastructure — useful for acknowledging legitimate, intentional drift as the new baseline.

## Interview Follow-Up Questions

- How would you incorporate `-refresh-only` into a scheduled drift-detection pipeline, distinct from normal apply pipelines?
- What's the risk of running `terraform apply -refresh-only` without first understanding why the drift happened?
- How does this distinction interact with the earlier discussion of handling manual console changes as drift?

## References

- [Terraform: Refresh-only mode](https://developer.hashicorp.com/terraform/tutorials/state/refresh#review-the-terraform-refresh-only-workflow)
- [Terraform: State and drift](https://developer.hashicorp.com/terraform/language/state)
