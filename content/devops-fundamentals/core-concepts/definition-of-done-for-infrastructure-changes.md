---
id: devops-fundamentals-core-concepts-definition-of-done-infra-001
title: "A team's definition of 'done' for infrastructure changes is just 'terraform apply succeeded.' What's actually missing from that definition, and why does it matter?"
category: devops-fundamentals
subcategory: core-concepts
technologies:
  - devops
difficulty: intermediate
question_type:
  - conceptual
tags:
  - devops-fundamentals
  - definition-of-done
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A team's informal definition of "done" for an infrastructure change is simply "the `terraform apply` succeeded, no errors." What's actually missing from that definition, and why does treating apply-success as sufficient cause real, recurring problems?

## Short Answer

"Apply succeeded" only confirms that Terraform was able to create/modify the declared resources without an API error — it says nothing about whether the resulting infrastructure actually works correctly, is observable, is documented, or is safe for the rest of the team to operate going forward. A more complete definition of done includes functional verification (does the change actually do what it was meant to), observability (can you detect if it breaks later), and knowledge transfer (does anyone besides the author understand what changed and why) — treating apply-success as the finish line means real, foreseeable gaps routinely reach production undetected.

## Detailed Explanation

The gap between "the command succeeded" and "the change is actually done" is the same class of problem covered by CI exit codes and script correctness elsewhere — success at the mechanical level doesn't imply success at the level that actually matters, and infrastructure changes have this gap in a particularly consequential way, since a broken infrastructure change often doesn't fail loudly the way a broken application deploy might.

**Functional verification confirms the change actually accomplishes its purpose, not just that resources were created**: a security group rule can apply successfully while still being subtly wrong (allowing the wrong port, or not actually reaching the intended source) — Terraform succeeding tells you the API calls to create the declared resources worked, not that the resulting configuration does what was intended; verifying the actual behavior (can the expected traffic flow, does the expected access work) is a separate, necessary step.

**Observability ensures a future problem with this change is actually detectable**: a newly provisioned resource with no corresponding monitoring, alerting, or logging means if it fails or misbehaves later, nobody finds out until a user notices — a complete definition of done for infrastructure work includes confirming the new resource is actually visible in the team's monitoring, not just that it exists.

**Documentation and knowledge transfer ensure the change is operable by more than just its author**: infrastructure changes often encode non-obvious decisions (why this specific instance size, why this particular network configuration) — without some record of the reasoning (a PR description, updated documentation, a comment in the code itself), the next person who needs to modify or troubleshoot this infrastructure has to reverse-engineer the original intent, which is both slower and riskier than having the context already available.

**Rollback/recovery capability should be confirmed, not assumed**: a complete definition of done considers whether this change can actually be safely reverted if it turns out to be wrong — for some infrastructure changes (especially stateful ones, per the earlier stateful-versus-stateless drift discussion), "can we undo this" isn't automatic, and confirming it before considering the change fully done avoids discovering the answer during an actual incident.

**This mirrors the same underlying principle as application code's definition of done**: application teams that have matured past "the code compiles" to a fuller definition of done (tests pass, code reviewed, documentation updated, monitoring in place) are applying exactly the same reasoning infrastructure changes deserve — "the command didn't error" is the infrastructure equivalent of "the code compiles," a necessary but clearly insufficient bar.

**A practical, concrete definition of done for infrastructure changes might include**: the apply succeeded with the expected plan (no unexpected resource replacements); the change was functionally verified against its actual intended purpose; relevant monitoring/alerting covers the new or changed resource; the change and its reasoning are documented somewhere discoverable; and rollback/recovery path is understood, not just assumed to exist.

## Key Takeaways

- "Terraform apply succeeded" only confirms the API calls to create/modify declared resources worked — it says nothing about whether the result actually functions correctly, is observable, or is understood by anyone beyond the author.
- Functional verification, observability coverage, documentation/knowledge transfer, and confirmed rollback capability are all real gaps left open by a "apply succeeded" definition of done.
- This mirrors the same maturity gap application teams close when moving from "the code compiles" to a fuller definition of done including tests, review, and documentation.
- A concrete, complete definition of done for infrastructure work should be defined and agreed upon explicitly, rather than left as an implicit, minimal "no errors" bar.

## Interview Follow-Up Questions

- How would you introduce a fuller definition of done to a team currently used to treating apply-success as sufficient, without making every change feel bureaucratically heavier?
- What's a concrete example of an infrastructure change that applied successfully but caused a real problem later specifically because of a gap this fuller definition would have caught?
- How would you verify rollback capability for infrastructure changes without actually performing a risky rollback in production to test it?

## References

- [Terraform: Plan and apply](https://developer.hashicorp.com/terraform/cli/run)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
