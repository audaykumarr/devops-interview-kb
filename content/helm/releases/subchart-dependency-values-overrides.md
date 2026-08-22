---
id: helm-releases-subchart-dependency-values-overrides-001
title: "How would you override a specific value inside a subchart that a parent Helm chart depends on, without modifying the subchart itself?"
category: helm
subcategory: releases
technologies:
  - helm
difficulty: intermediate
question_type:
  - practical
tags:
  - helm
  - subcharts
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A parent Helm chart declares a dependency on a subchart (in `Chart.yaml`'s `dependencies`, or the legacy `charts/` directory). The subchart has its own `values.yaml` with defaults you need to override for this specific deployment, but you don't own or want to modify the subchart itself. How do you override a subchart's value from the parent chart?

## Short Answer

In the parent chart's own `values.yaml` (or an override file/`-f` passed at install time), nest the override under a top-level key matching the subchart's name (or its configured alias) — Helm automatically scopes values under that key to the subchart when rendering it, without needing to touch the subchart's own files at all.

## Detailed Explanation

**Subchart values are namespaced under the subchart's name in the parent's values structure**: if a parent chart depends on a subchart named `redis`, setting `redis: { auth: { enabled: false } }` in the parent chart's `values.yaml` (or via `--set redis.auth.enabled=false`) passes that value specifically into the `redis` subchart's own template rendering, overriding whatever the subchart's own `values.yaml` set as the default for that key — the subchart itself remains completely unmodified.

**This works because Helm merges values into a hierarchical structure matching the chart dependency tree**: when Helm renders a parent chart with subcharts, each subchart's templates see a values context that's the merge of the subchart's own defaults with whatever the parent (or the user, via `-f`/`--set`) provided under that subchart's namespaced key — this hierarchical scoping is what makes override-without-modification possible at any depth of chart dependency.

**An `alias` in `Chart.yaml` changes which key the override needs to use**: if the same subchart is depended upon multiple times under different aliases (a common pattern for depending on the same subchart twice for two different purposes), overrides need to target the alias, not the subchart's original name — `kubectl`/Helm behavior here follows whatever alias was configured in the parent's `Chart.yaml` `dependencies` entry, not the subchart's own declared name.

**Global values (`global:`) provide a way to share values across the parent and every subchart simultaneously**: for values that genuinely need to be consistent across the parent and all its subcharts (a shared image registry prefix, a common label), the special `global` key in values is automatically passed down into every subchart's context (in addition to each subchart's own namespaced values) — this avoids needing to duplicate the same override under every individual subchart's key.

**Verify the override actually took effect using `helm template`, not just assuming it did**: rendering the full chart tree with the override applied (`helm template . -f my-overrides.yaml`) and checking the specific subchart's rendered manifest confirms the value genuinely propagated as intended — nesting/key-naming mistakes in values overrides are common and don't always produce an obvious error, since Helm generally treats a values key it doesn't recognize as simply unused rather than raising an error.

## Key Takeaways

- Override a subchart's value by nesting it under a top-level key matching the subchart's name (or configured alias) in the parent chart's values.
- This works via Helm's hierarchical values-merging across the chart dependency tree, requiring no modification to the subchart itself.
- If a subchart is depended upon multiple times under different aliases, target the alias in the override, not the subchart's original name.
- The `global:` key propagates shared values into every subchart automatically, avoiding duplication for values that need to be consistent across the whole chart tree.

## Interview Follow-Up Questions

- How would you structure values for a chart with several levels of nested subchart dependencies, to keep overrides manageable and discoverable?
- What happens if both the parent chart's default values and a user-supplied override both set the same subchart key — which one wins?
- How would you audit a complex chart's full dependency tree to understand every value a specific subchart actually consumes, before writing an override?

## References

- [Helm: Subcharts and Global Values](https://helm.sh/docs/chart_template_guide/subcharts_and_globals/)
