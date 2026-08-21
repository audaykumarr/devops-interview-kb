---
id: azure-pipelines-agents-self-hosted-command-not-found-001
title: "An Azure Pipelines YAML job runs fine on Microsoft-hosted agents but fails only on self-hosted agents with 'command not found' for a tool the job needs. Why, and how do you fix it?"
category: azure-pipelines
subcategory: agents
technologies:
  - azure-pipelines
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - azure-pipelines
  - self-hosted-agents
  - ci-cd
  - troubleshooting
estimated_time_minutes: 7
companies: []
related_questions:
  - azure-pipelines-agents-self-hosted-vs-hosted-tradeoffs-001
  - azure-pipelines-agents-fleet-consistency-over-time-001
  - azure-pipelines-agents-fail-fast-missing-tool-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

An Azure Pipelines YAML job runs a build step that calls a CLI tool. It passes reliably on Microsoft-hosted agents (`vmImage: ubuntu-latest`), but the identical pipeline fails on the team's self-hosted agent pool with `command not found`. Why does the same YAML behave differently, and how do you fix it?

## Short Answer

Microsoft-hosted agent images ship with a large, curated set of preinstalled tools (language runtimes, CLIs, package managers) documented per image, while self-hosted agents are just whatever's actually installed on that VM/container — nothing is bundled for you, so any tool the pipeline assumes is present has to be installed explicitly, either baked into the self-hosted agent's image or added as an explicit pipeline step.

## Detailed Explanation

Microsoft-hosted agents (`ubuntu-latest`, `windows-latest`, `macos-latest`, etc.) run on Microsoft-managed VM images that come preloaded with dozens of common tools — multiple language runtimes, Docker, common CLIs, cloud provider tools — specifically so most pipelines "just work" without an explicit install step. Teams get used to this and write YAML that calls a tool directly, implicitly depending on it being preinstalled, without ever adding an explicit install task.

Self-hosted agents have none of that curation. A self-hosted agent is just a regular VM, container, or machine with the Azure Pipelines agent software running on it — whatever tools exist on that machine are whatever someone (or some provisioning script) explicitly put there. If the self-hosted pool was set up before this tool was needed, or was provisioned by a different process than the one that provisioned the Microsoft-hosted image being implicitly relied on, the tool simply isn't there, and the shell step fails with the standard "command not found" the moment it tries to invoke it.

This is a common surprise specifically because the pipeline YAML itself gives no visual signal of the dependency — nothing in the YAML says "this step assumes tool X is preinstalled," so the gap is invisible until someone runs it on an agent that doesn't happen to have it.

## Symptoms

- The exact same YAML pipeline succeeds on `vmImage: ubuntu-latest` (or similar) but fails with `command not found` (or equivalent, e.g. `'foo' is not recognized` on Windows) only on self-hosted agents.
- The failure happens immediately at the step invoking the tool, with no other apparent difference in the pipeline logic.

## Possible Causes

- The self-hosted agent pool was provisioned without the specific tool installed, because nothing in the pipeline made that dependency explicit.
- The tool is installed but not on the `PATH` for the account the agent service runs as.
- The self-hosted agent's OS/architecture differs from what the tool (or an install script copy-pasted from Microsoft-hosted docs) assumes.

## Investigation Steps

1. Confirm the exact command that's failing and cross-reference it against the [Microsoft-hosted image software list](https://github.com/actions/runner-images) (Azure Pipelines' hosted images share tooling documentation with GitHub Actions' `runner-images` repo) to confirm it's implicitly relied upon there.
2. SSH/RDP into the self-hosted agent machine and check whether the tool is present at all: `which <tool>` or `where <tool>`.
3. If present, check whether it's on the `PATH` for the specific user account the Azure Pipelines agent service runs as — this can differ from an interactive login shell's `PATH`.
4. Check whether the self-hosted pool's provisioning script/image build process is documented anywhere, to understand what it does and doesn't include by design.

## Commands

```bash
which <tool>
echo $PATH

sudo systemctl status vsts.agent.*
cat /etc/systemd/system/vsts.agent.*.service | grep Environment
```

## Resolution

Add an explicit install step to the pipeline YAML (e.g. a task or script step that installs the tool via the platform's package manager) so the dependency is documented in code and the pipeline no longer silently relies on agent-specific preinstallation — this is the most portable fix, since it also protects against a future self-hosted pool reprovision removing the tool again. Alternatively, bake the tool into the self-hosted agent's base image/provisioning script if it's needed by effectively every pipeline that pool runs, but document that dependency clearly since it becomes an implicit assumption future pipelines will inherit.

## Prevention

- Treat "works on Microsoft-hosted, fails on self-hosted" as a signal to make tool dependencies explicit in the YAML rather than relying on either environment's preinstalled state.
- Maintain self-hosted agent images/provisioning scripts as versioned, reviewed infrastructure, not hand-configured machines, so tool availability is predictable and reproducible.
- Document which tools are expected to be preinstalled on self-hosted pools versus which pipelines are expected to install their own, so the assumption is explicit for whoever writes the next pipeline.

## Interview Follow-Up Questions

- What are the trade-offs of self-hosted versus Microsoft-hosted agents beyond just tool availability (cost, control, security, startup latency)?
- How would you keep a fleet of self-hosted agents consistent over time as tool requirements evolve?
- How would you design a pipeline template that fails fast with a clear error if a required tool is missing, instead of a raw "command not found"?

## Key Takeaways

- Microsoft-hosted agents preinstall a large curated toolset; self-hosted agents have only what was explicitly installed on them.
- Pipelines that implicitly rely on preinstalled tools work invisibly until run on an agent without that curation.
- The durable fix is making tool installation an explicit pipeline step, not assuming any agent's starting state.
- Self-hosted agent pools should be treated as versioned, reproducible infrastructure rather than ad hoc machines.

## References

- [Azure Pipelines: Microsoft-hosted agents](https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/hosted)
- [Azure Pipelines: Self-hosted agents](https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/agents?tabs=browser#install)
- [GitHub: runner-images (software preinstalled on hosted images)](https://github.com/actions/runner-images)
