---
id: github-actions-workflow-design-self-hosted-runner-risk-001
title: "Why is it specifically dangerous to use self-hosted GitHub Actions runners on a public repository, in a way that doesn't apply to a private repository?"
category: github-actions
subcategory: workflow-design
technologies:
  - github-actions
difficulty: advanced
question_type:
  - security
tags:
  - github-actions
  - self-hosted-runners
  - security
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

GitHub's own documentation specifically warns against using self-hosted runners for public repositories. Why is this specifically dangerous in a way that doesn't apply to a private repository, and what's the actual attack it enables?

## Short Answer

On a public repository, anyone can open a pull request, and a workflow configured to run on `pull_request` (or worse, run automatically for external contributors) will execute that PR's code on your self-hosted runner — meaning an attacker can submit a PR containing malicious workflow code or build scripts that runs directly on infrastructure you own and control, potentially pivoting from there into your internal network, unlike GitHub-hosted runners which are ephemeral and isolated per run.

## Detailed Explanation

The risk is specifically about *whose infrastructure* the untrusted code runs on. GitHub-hosted runners are ephemeral, isolated virtual machines that are destroyed after each run — even if a malicious PR's workflow does something harmful, the blast radius is contained to that throwaway VM. A self-hosted runner is your own machine (or a persistent pool of them), often with network access to your other internal systems, meaning code execution there is a genuine foothold into your actual infrastructure, not a disposable sandbox.

**Anyone can trigger workflow execution on a public repository via a pull request**: unlike a private repository where only people you've explicitly granted access can open PRs, a public repository accepts pull requests from any GitHub user by design — if a workflow is configured to run automatically for these PRs (particularly with `pull_request_target`, which runs with the base repository's permissions and secrets even for fork-originated PRs), an attacker doesn't need any special access to get their code executing.

**Self-hosted runners persist and often have broader network access than a throwaway CI VM**: a self-hosted runner is frequently deployed with access to internal resources (private package registries, internal APIs, sometimes broader network segments) that a build genuinely needs — but this is exactly what turns a malicious PR's code execution into a potential pivot point into infrastructure well beyond "just the CI build," which a fully isolated, ephemeral GitHub-hosted runner wouldn't expose.

**The runner also isn't guaranteed to be cleaned between jobs the way GitHub-hosted runners are**: depending on configuration, a self-hosted runner may execute multiple jobs over its lifetime without being fully reset — meaning a malicious job could leave something behind (a persistence mechanism, a modified environment) affecting a subsequent, legitimate job run on the same runner.

**The practical mitigation**: if self-hosted runners are genuinely needed for a public repository (for specialized hardware, licensing, or performance reasons), scope them to only run for trusted contexts — never for `pull_request` events from forks, and ideally gated behind a required-approval step for first-time or external contributors, with the runner itself isolated (ephemeral, minimal network access, no access to sensitive internal systems) rather than a persistent, broadly-networked machine.

## Key Takeaways

- The core risk is whose infrastructure untrusted code runs on — GitHub-hosted runners are ephemeral and isolated per run; self-hosted runners are your own persistent infrastructure.
- A public repository accepts PRs from anyone by design, so a workflow auto-running on `pull_request` (especially `pull_request_target`) can execute an attacker's code with no special access required.
- A compromised self-hosted runner is a potential pivot point into whatever internal network/resource access that runner has, unlike a disposable GitHub-hosted VM.
- If self-hosted runners are necessary for a public repo, isolate them (ephemeral, minimal network access) and never let them auto-run untrusted fork PR code.

## Interview Follow-Up Questions

- How would you design a required-approval gate so first-time contributors' workflow runs don't execute automatically on a self-hosted runner?
- What would ephemeral self-hosted runners (spun up per job, destroyed after) do to mitigate this risk, and what would that cost?
- How would you detect whether a self-hosted runner had already been compromised via a past malicious PR run?

## References

- [GitHub Docs: Security hardening for GitHub Actions — self-hosted runners](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#hardening-for-self-hosted-runners)
- [GitHub Security Lab: Keeping your GitHub Actions and workflows secure](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
