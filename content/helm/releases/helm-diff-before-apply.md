---
id: helm-releases-preview-changes-before-upgrade-001
title: "How would you preview exactly what a helm upgrade will change before actually running it against production?"
category: helm
subcategory: releases
technologies:
  - helm
difficulty: intermediate
question_type:
  - practical
tags:
  - helm
  - deployment-strategy
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Before running `helm upgrade` against a production release, you want to know exactly what will change — which resources will be modified, created, or deleted, and precisely what fields differ. `helm upgrade --dry-run` renders the resulting manifests, but doesn't directly show a diff against what's currently deployed. How would you get an actual before/after diff?

## Short Answer

`helm upgrade --dry-run` alone only shows you the *new* rendered manifests, not a comparison against current state — the `helm-diff` plugin specifically fills this gap, computing and displaying an actual diff between the currently-deployed release's manifests and what the upgrade would produce, field by field, which is what you actually want to review before applying a change to production.

## Detailed Explanation

**`helm upgrade --dry-run` renders templates without applying them, but shows no comparison**: this confirms the templates render successfully and lets you inspect the resulting YAML, but reviewing a full manifest dump to spot what specifically changed compared to the current deployment is impractical for anything beyond a trivial chart — you'd need to manually diff it against the currently-deployed manifests yourself.

**The `helm-diff` plugin (a widely-used, effectively standard community plugin) computes the actual diff directly**: `helm diff upgrade <release> <chart> -f values.yaml` fetches the currently-deployed release's manifests and the would-be-applied new manifests, then presents a genuine diff (added/removed/changed lines, similar to `kubectl diff` but computed from Helm's own release state) — this is the practical tool for the specific "what will actually change" review most teams want before a production upgrade.

**Reviewing the diff catches unintended changes before they reach production**: a diff surfaces things that might not be obvious from reading the rendered YAML in isolation — an unexpected image tag change, a resource limit that shifted due to a values-file merge mistake, a label that changed and would trigger an unwanted resource replacement — catching these in a diff review before applying is meaningfully cheaper than discovering them after a production rollout already happened.

**`helm diff` is also commonly integrated directly into CI/CD pipelines as an automated review step**: rather than relying on someone manually running it before approving a deployment, posting the diff output as part of a pull request or deployment approval step (for a GitOps-style or manually-gated pipeline) makes the review a visible, built-in part of the change process rather than an optional manual habit.

**This is conceptually similar to `terraform plan` for Infrastructure as Code, applied to Helm releases**: both solve the same underlying need — seeing exactly what a declarative change will actually do before committing to it — and both exist because the tool's native "render/plan" output alone (Helm's `--dry-run`, Terraform's raw plan) benefits from being paired with an actual comparison against current live state for a genuinely reviewable diff.

## Key Takeaways

- `helm upgrade --dry-run` renders the new manifests but doesn't compute a diff against currently-deployed state on its own.
- The `helm-diff` plugin computes and displays an actual field-by-field diff between current and would-be state, which is the practical tool for pre-upgrade review.
- Reviewing the diff before applying catches unintended changes (unexpected image tags, values-merge mistakes, replacement-triggering label changes) before they reach production.
- Integrating `helm diff` into CI/CD as a required review step makes this check a visible, built-in part of the deployment process rather than an easily-skipped manual habit.

## Interview Follow-Up Questions

- How would you handle a diff that shows a resource will be deleted and recreated (rather than updated in place) — what would cause that, and how would you evaluate whether it's safe?
- How would you integrate `helm diff` output into a pull-request-based approval workflow for production changes?
- What's the difference between what `helm diff` can show you and what a genuine `terraform plan`-equivalent guarantee would provide, given Helm doesn't have Terraform's state-locking model?

## References

- [helm-diff (GitHub)](https://github.com/databus23/helm-diff)
- [Helm: helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)
