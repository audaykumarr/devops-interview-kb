---
id: infrastructure-as-code-drift-manual-console-change-001
title: "Someone manually changed a cloud resource in the console that's managed by your IaC. What actually happens the next time the pipeline runs, and how would you handle the drift?"
category: infrastructure-as-code
subcategory: drift
technologies:
  - terraform
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - infrastructure-as-code
  - drift
  - terraform
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Someone manually changed a setting on a cloud resource directly in the provider's console — a resource that's managed by your infrastructure-as-code. What actually happens the next time the IaC pipeline runs a plan/apply, and how would you handle the resulting drift?

## Short Answer

Most IaC tools (Terraform included) refresh actual resource state from the provider before planning, so the manual change is detected as drift — the plan will show the tool intends to revert that resource back to whatever the code declares, since the tool has no memory of "someone meant this on purpose," only "the code says X and reality says Y." Handling it well means deciding, deliberately, whether the manual change should be reverted (enforce code as truth) or imported into the code (accept it as the new intended state) — never just clicking "apply" without understanding which one is about to happen.

## Detailed Explanation

Terraform (and most declarative IaC tools) work by comparing three things: the resource definitions in code, the last-known state file, and the actual current state of the resource as reported live by the provider. A `terraform plan` refreshes that third piece before computing a diff, so a manual console change is visible to Terraform as a mismatch between "what the state file/code expects" and "what the provider actually reports right now." Terraform's default behavior is to treat the code as the source of truth — the plan will show that attribute being changed back to the code's declared value, because from Terraform's point of view, the code is what's *supposed* to be true and the console change is an unexplained deviation from it.

This is often surprising to people not used to IaC: manually "fixing" something urgently in the console (say, during an incident) feels like it solved the problem, but the very next `terraform apply` — whether run by a human or, worse, an automated pipeline — will silently revert that fix, because nothing told Terraform the manual change was intentional. This has caused real incidents: an emergency console fix gets reverted hours later by a routine scheduled apply, reintroducing the exact problem that was just fixed, with no obvious link between "someone ran a pipeline" and "the incident came back."

The correct response depends on intent, and requires a human decision, not a default action: if the manual change was a mistake or unauthorized, letting the next apply revert it is exactly the desired self-healing behavior IaC is supposed to provide. If the manual change was a deliberate, correct fix that the code hasn't caught up to yet, the fix belongs in the code (updating the Terraform config to match, so the two stop disagreeing) — either updating the resource's config directly, or in trickier cases, using `terraform import`/state manipulation if the resource was created out-of-band entirely rather than just modified.

## Symptoms

- A `terraform plan` shows an unexpected diff on an attribute nobody remembers changing in code.
- A previously-applied fix "reverts itself" after an unrelated pipeline run.
- `terraform plan` in CI reports drift on a schedule (if drift detection is configured) with no corresponding code change to explain it.

## Possible Causes

- A manual change was made directly via the cloud console or CLI, bypassing the IaC pipeline, often during an incident under time pressure.
- Another automated process (a different pipeline, a Lambda/Function, an auto-scaling action) modified the resource outside of Terraform's awareness.
- A provider-side default value changed between provider plugin versions, appearing as drift even though nobody touched the resource directly.

## Investigation Steps

1. Run `terraform plan` and carefully read exactly which attribute(s) it intends to change and to what value — this tells you precisely what drifted.
2. Check the cloud provider's audit log (e.g. AWS CloudTrail) for the resource to identify who or what made the out-of-band change, and when.
3. Determine whether the drift was a deliberate fix (check incident timelines, chat history) or an accidental/unauthorized change.
4. Decide the resolution path — revert via apply, or update code to adopt the manual change — before running `apply` on autopilot.

## Commands

```bash
terraform plan

terraform state show <resource.address>

terraform import <resource.address> <cloud-resource-id>

terraform apply -target=<resource.address>
```

## Resolution

If the manual change should be undone, running the normal `terraform apply` does exactly that — no special action needed beyond confirming that's actually the intent. If the manual change should be kept, update the Terraform configuration to declare the new value as the intended state, then run `plan` again to confirm it now shows no diff for that resource — this makes the code the accurate source of truth going forward instead of leaving the two silently disagreeing. For resources changed structurally (not just an attribute, but something created or attached outside Terraform entirely), `terraform import` may be needed to bring the out-of-band object under management before the config can accurately describe it.

## Prevention

- Restrict console/CLI write access to production resources managed by IaC, so manual changes require going through the pipeline by default rather than being the easy path during an incident.
- Run scheduled drift detection (`terraform plan` on a cron, reporting without applying) so drift is caught and triaged promptly instead of discovered by surprise weeks later.
- Establish an explicit "break-glass" procedure for emergency manual changes that includes immediately updating the corresponding IaC code as part of the incident's follow-up, not as an afterthought.
- Treat any manual change as incomplete work until it's reflected in code — the incident isn't really resolved until the fix is durable against the next apply.

## Interview Follow-Up Questions

- How would you design CI so that scheduled drift detection alerts the right team without becoming noise nobody reads?
- What's the risk of using `-target` to apply a fix to just one resource, and when is it actually appropriate?
- How does this problem change in severity for a stateful resource (a database) versus a stateless one (a security group rule)?

## Key Takeaways

- IaC tools treat code as the source of truth by default; manual out-of-band changes show up as drift and get reverted on the next apply unless code is updated to match.
- An emergency console fix that isn't followed up with a matching code change will likely be silently undone by a later pipeline run.
- Whether to revert or adopt drift is a deliberate human decision based on intent, not something to default through by just running apply.
- Restricting manual write access and running scheduled drift detection are the two main preventive levers.

## References

- [Terraform: State and drift](https://developer.hashicorp.com/terraform/language/state)
- [Terraform: terraform import](https://developer.hashicorp.com/terraform/cli/import)
- [HashiCorp: Detecting and managing drift with Terraform](https://developer.hashicorp.com/terraform/tutorials/state/resource-drift)
