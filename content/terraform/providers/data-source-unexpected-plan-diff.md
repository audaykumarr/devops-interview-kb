---
id: terraform-providers-data-source-unexpected-plan-diff-001
title: "terraform plan shows changes to a resource you didn't touch, and the diff traces back to a data source — what's actually happening?"
category: terraform
subcategory: providers
technologies:
  - terraform
difficulty: advanced
question_type:
  - troubleshooting
  - conceptual
tags:
  - terraform
  - data-sources
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

`terraform plan` shows a change to a resource that nobody touched in this change — investigating further, the change traces back to a `data` source whose queried value changed between plans, cascading into a diff on anything referencing it. Is this a bug, and how do you reason about when a data source can cause this?

## Short Answer

This isn't a bug — a `data` source queries live, external state at plan/apply time, every time, unlike a `resource`, whose state is what Terraform itself manages and remembers — if the underlying real-world value a data source queries changes (a new "latest" AMI was published, a DNS record changed, another team modified a resource the data source reads), the data source's result changes too, and anything referencing that result recomputes accordingly, even though nothing in your own Terraform configuration changed at all.

## Detailed Explanation

A `resource` block's value comes from Terraform's own recorded state (updated only when Terraform itself creates/modifies it); a `data` source's value comes from querying the real world fresh, every single plan — this fundamental difference is exactly why a data source can introduce a diff with zero configuration change, while a resource generally can't (barring drift).

## Symptoms

- `terraform plan` shows an unexpected diff on a resource, without any change to that resource's own configuration block.
- Tracing the diff's source reveals it's driven by a `data` source whose queried value differs from the previous plan.
- The data source's own configuration (its filter/query arguments) also hasn't changed.

## Possible Causes

- A commonly-used pattern: a data source querying "the latest AMI matching a filter" (`most_recent = true`) — if a new AMI matching the filter was published since the last plan, the data source now resolves to a different AMI ID, and any resource referencing it (an `aws_instance`'s `ami` argument) shows a diff, even though your configuration's filter criteria never changed.
- A data source reading a value from a resource managed by a different team/process (a VPC ID, a security group, a DNS zone) — if that other team changed the underlying resource, your data source picks up the new value on the next plan, cascading a diff into your own resources that reference it.
- A data source with a query that isn't as narrowly scoped as intended, matching a broader (and therefore more volatile) set of real-world resources than the author assumed, making its result change more often than expected.

## Investigation Steps

**Confirm which specific data source is driving the diff, and what changed about its resolved value**: `terraform plan` output shows the data source's resolved attributes; comparing this against the previous plan's recorded value (if available in state or prior plan output) confirms exactly what changed and gives a concrete before/after to investigate.

**Check whether the underlying real-world resource the data source queries genuinely changed**: for an AMI-lookup data source, checking whether a new AMI matching the filter criteria was actually published recently confirms the "the real world changed" explanation directly, rather than assuming a Terraform-side issue.

**Review the data source's filter/query specificity**: if the data source's query is broader than intended (not pinned to a specific, stable identifier), tightening it (pinning to a specific AMI name pattern that won't match future unrelated AMIs, for instance) is often the actual fix, if the volatility itself wasn't intended.

## Resolution

If the data source's changing result reflects genuinely intended behavior (you do want the latest matching AMI, and accept that this means occasional automatic diffs as new AMIs are published), no fix is needed beyond understanding this is expected — this is often the actual use case a "most recent" style data source is designed for. If the volatility is unintended (the query should have been more narrowly scoped, or should reference a specific pinned value rather than "whatever's currently latest"), tighten the data source's filter or replace it with a specific, stable reference (a hardcoded AMI ID managed and updated deliberately, rather than dynamically resolved on every plan). Confirm the fix by re-running `terraform plan` and confirming the diff no longer appears unexpectedly.

## Key Takeaways

- A `data` source queries live external state fresh on every plan, unlike a `resource`, whose value comes from Terraform's own recorded, remembered state.
- This means a data source can introduce a diff with zero change to your own Terraform configuration, if the real-world value it queries changed.
- A common example is a "most recent AMI" style data source, which legitimately produces a new result whenever a matching AMI is published — this is often intended behavior, not a bug.
- If the volatility is unintended, tightening the data source's query specificity, or replacing it with a deliberately-managed pinned value, is the fix.

## Interview Follow-Up Questions

- How would you design a pattern that gets the latest AMI deliberately and predictably (say, only updating on a scheduled review) rather than picking it up automatically on every plan?
- What's the risk of a data source reading a resource managed by a completely different team/Terraform state, in terms of blast radius if that team makes an unexpected change?
- How would you use `terraform plan` output specifically to distinguish a data-source-driven diff from a genuine configuration-driven diff, at a glance?

## References

- [Terraform: Data Sources](https://developer.hashicorp.com/terraform/language/data-sources)
