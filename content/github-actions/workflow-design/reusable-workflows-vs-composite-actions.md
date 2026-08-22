---
id: github-actions-workflow-design-reusable-vs-composite-001
title: "You want to share common CI logic across 20 repositories. When would you use a reusable workflow versus a composite action?"
category: github-actions
subcategory: workflow-design
technologies:
  - github-actions
difficulty: intermediate
question_type:
  - comparison
tags:
  - github-actions
  - reusable-workflows
  - composite-actions
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You want to share common CI logic across 20 repositories — things like a standard build-test-lint sequence, or a set of deployment steps. GitHub Actions gives you two mechanisms for this: reusable workflows and composite actions. When would you use each?

## Short Answer

Use a composite action when you're sharing a sequence of steps that gets embedded inside a larger job someone else already controls — it's a building block. Use a reusable workflow when you want to share an entire job (or set of jobs), including its own triggers, permissions, and secrets handling — it's a complete, callable unit. The practical rule: if what you're sharing needs its own `jobs:`/`permissions:`/`secrets:` structure, it's a reusable workflow; if it's just a handful of steps that plug into someone else's job, it's a composite action.

## Detailed Explanation

The two mechanisms exist at different levels of a workflow's structure, and confusing them leads to either overcomplicating a simple set of steps into a full workflow, or trying to force job-level concerns (secrets, permissions, multiple jobs) into a composite action that isn't designed for that.

**Composite actions bundle a sequence of steps into a single, reusable step**: they run inside whatever job calls them, inheriting that job's runner, environment, and context — appropriate for something like "checkout, set up a specific toolchain version, run a standard set of setup commands" that a consuming workflow's job wants to invoke as one step among others it also defines.

**Reusable workflows share an entire job or set of jobs**: called via `uses:` at the job level (`jobs.<job_id>.uses: org/repo/.github/workflows/build.yml@v1`), a reusable workflow can define its own multiple jobs, its own required inputs and secrets, and its own permissions — appropriate for something like "run our full standard CI pipeline" or "deploy to production following our org's standard deployment process," where the shared logic is a complete unit of work, not just a few steps inside someone else's job.

**Secrets and permissions handling differs meaningfully between them**: a composite action inherits the calling job's context automatically (it runs as part of that job), while a reusable workflow requires secrets to be explicitly passed in (`secrets: inherit` or explicit secret mapping) and can define its own `permissions:` block — this makes reusable workflows a cleaner boundary when you want the shared logic to have deliberately scoped access, independent of whatever the calling workflow has.

**Composability**: reusable workflows can call other reusable workflows (with some nesting limits), and can also use composite actions within their own steps — the two aren't mutually exclusive, and a mature shared-CI setup often uses composite actions for small, step-level building blocks and reusable workflows for the larger, complete-job-level orchestration built on top of them.

## Key Takeaways

- Composite actions share a sequence of steps that plug into a job someone else controls; reusable workflows share a complete job (or jobs) with its own triggers, permissions, and secrets.
- The deciding question: does what you're sharing need its own job-level structure (multiple jobs, its own permissions/secrets)? If yes, reusable workflow; if it's just steps, composite action.
- Reusable workflows require explicit secret passing and can define their own scoped permissions, giving a cleaner security boundary than a composite action's automatic context inheritance.
- The two compose together — use composite actions for small building blocks, reusable workflows for larger orchestration built on top of them.

## Interview Follow-Up Questions

- How would you version and roll out a breaking change to a reusable workflow used by 20 repositories, without breaking all of them at once?
- What's the trade-off of using `secrets: inherit` versus explicitly mapping each secret a reusable workflow needs?
- How would you test a reusable workflow or composite action in isolation before rolling it out broadly?

## References

- [GitHub Docs: Reusing workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [GitHub Docs: Creating a composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
