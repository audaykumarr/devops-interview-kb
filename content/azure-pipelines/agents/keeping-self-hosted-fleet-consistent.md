---
id: azure-pipelines-agents-fleet-consistency-over-time-001
title: "How would you keep a fleet of self-hosted Azure Pipelines agents consistent over time as tool requirements evolve, instead of them slowly drifting apart?"
category: azure-pipelines
subcategory: agents
technologies:
  - azure-pipelines
difficulty: advanced
question_type:
  - scenario
  - practical
tags:
  - azure-pipelines
  - self-hosted-agents
  - configuration-management
estimated_time_minutes: 7
companies: []
related_questions:
  - azure-pipelines-agents-self-hosted-command-not-found-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A fleet of self-hosted Azure Pipelines agents starts out identical, but over months of ad hoc "just install this one extra tool" fixes, individual agents can drift apart. How would you keep the fleet consistent as tool requirements evolve, rather than accumulating snowflake machines?

## Short Answer

Treat agent provisioning as versioned infrastructure — define the agent image/configuration in code (a Packer template, a Dockerfile if using containerized agents, or a configuration-management tool like Ansible), rebuild and redeploy the whole fleet from that source whenever requirements change, and disallow manual one-off changes to running agents — any new tool requirement goes through the same code-reviewed, versioned path rather than an ad hoc SSH session.

## Detailed Explanation

The root cause of fleet drift is always the same: a tool was needed urgently, someone SSH'd into one agent (or a few) and installed it directly to unblock a build, and that fix never made it back into whatever originally provisioned the fleet — so the next agent added to the pool, or the next full rebuild, doesn't have it, and now the fleet is inconsistent in a way that's invisible until a build happens to land on the "wrong" agent.

The fix is making the provisioning source of truth the *only* way agents get their tooling, and making that source of truth easy enough to update that the ad hoc SSH fix is never the path of least resistance:

**Define the agent as code**: a Packer template building a VM image, a Dockerfile for containerized agents, or an Ansible playbook applied during provisioning — whichever fits the agent hosting model — should list every tool and version the fleet needs, version-controlled and code-reviewed like any other infrastructure change.

**Rebuild, don't patch, for changes**: when a new tool is needed, the change goes into the versioned definition, a new image/configuration is built and tested, and the fleet is redeployed from that new version — rather than SSH-ing into existing agents to add the tool in place. This guarantees every agent in the fleet, new or existing, ends up with the identical toolset.

**Make manual changes to running agents explicitly disallowed** (as a team norm, and ideally as a technical control — e.g. treating agents as immutable/replaceable rather than long-lived, so a manual change doesn't even persist past the next scheduled rebuild) — removing the option removes the temptation to take the fast, drift-causing shortcut under deadline pressure.

**Automate the rebuild-and-redeploy cycle**: a CI pipeline (fittingly) that builds the new agent image/configuration, runs a smoke test against it, and rolls it out to the fleet — ideally with a rolling replacement strategy so the whole fleet isn't down at once — turns "update the fleet's tooling" into a routine, low-friction operation rather than a risky manual one.

## Key Takeaways

- Fleet drift happens when ad hoc fixes on individual agents never make it back into the actual provisioning source of truth.
- Defining the agent's tooling as versioned, code-reviewed infrastructure (Packer/Dockerfile/Ansible) and rebuilding rather than patching keeps every agent identical.
- Treating agents as immutable/replaceable removes the incentive for manual one-off fixes under deadline pressure.
- Automating the build-test-redeploy cycle turns fleet updates into a routine operation instead of a risky manual one.

## Interview Follow-Up Questions

- How would you handle an urgent, one-off tool need that can't wait for the normal rebuild-and-redeploy cycle?
- What testing would you put in place to catch a broken agent image before it's rolled out to the whole fleet?
- How would you migrate an existing, already-drifted fleet back to a consistent, versioned baseline without a large disruptive cutover?

## References

- [Azure Pipelines: Self-hosted agents](https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/agents?tabs=browser#install)
- [HashiCorp Packer: Documentation](https://developer.hashicorp.com/packer/docs)
