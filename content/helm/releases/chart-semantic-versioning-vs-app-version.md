---
id: helm-releases-chart-semver-vs-appversion-001
title: "A Chart.yaml has both a version and an appVersion field — what's the difference, and how should each actually be bumped?"
category: helm
subcategory: releases
technologies:
  - helm
difficulty: beginner
question_type:
  - conceptual
tags:
  - helm
  - versioning
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

`Chart.yaml` has two separate version fields: `version` and `appVersion`. A new team member assumes they should always move together, and bumps both every time either the chart's templates or the application's code change. What's actually different between these two fields, and why does treating them as always-linked cause confusion?

## Short Answer

`version` is the chart's own semantic version — it changes whenever the chart's templates, values structure, or packaging logic changes, independent of the application. `appVersion` is an informational label indicating which version of the application the chart is currently configured to deploy by default (usually reflected in the default image tag) — it changes when the application version changes, independent of whether the chart's own templating logic changed at all. The two version independently because a chart update (a template bug fix) doesn't necessarily mean a new application version, and a new application version doesn't necessarily require any chart template change.

## Detailed Explanation

**`version` tracks the chart's own packaging/templating, following semantic versioning conventions for the chart artifact itself**: a change to the chart's templates (fixing a bug in how a resource is rendered, adding a new configurable value, restructuring `values.yaml`) is what should bump `version` — this is what `helm repo` indexing, dependency version constraints (`dependencies: [{ version: "1.x" }]`), and `helm install --version` all reference; it has nothing to do with which application version the chart happens to deploy by default.

**`appVersion` is purely informational metadata about the default application version, not consumed by Helm's own mechanics**: Helm doesn't use `appVersion` to make any packaging, dependency-resolution, or installation decision — it's metadata, commonly surfaced in `helm search`/`helm list` output and often used within chart templates (e.g., as a fallback default for an image tag: `image: myapp:{{ .Chart.AppVersion }}`) — but nothing in Helm's own version-resolution logic reads or depends on it.

**These two update independently, and conflating them causes real confusion**: fixing a bug purely in the chart's templates (no application code change at all) should bump `version` but leave `appVersion` unchanged, since the application being deployed hasn't changed. Releasing a new application version that the chart doesn't need any template changes to support (just a new default image tag) can be handled by bumping `appVersion` (and the default image tag value) without necessarily requiring a `version` bump — though many teams choose to bump `version` too in this case for clarity/traceability, that's a team convention choice, not a Helm requirement.

**Semantic versioning discipline still applies to `version`, just scoped to the chart artifact**: a breaking change to the chart's values structure (renaming a key consumers depend on, removing a previously-supported value) should be a major version bump of `version`, a backward-compatible new feature a minor bump, and a bug fix a patch bump — this is exactly standard semver discipline, just applied to "does this break someone currently using this chart," not to the application's own versioning at all.

**A common team convention, though not a Helm requirement, is keeping them loosely correlated for traceability**: some teams choose to bump `version`'s patch/minor number alongside every `appVersion` change (even without a genuine template change) specifically so `helm history` and chart version numbers give a clear, traceable link to which application version was deployed at each point — this is a deliberate team practice for operational clarity, not something Helm enforces or requires.

## Key Takeaways

- `version` is the chart's own semantic version, tracking changes to the chart's templates/packaging — this is what Helm's dependency resolution and repository indexing actually use.
- `appVersion` is informational metadata about the default application version the chart deploys — Helm's own mechanics don't read or depend on it at all.
- The two update independently: a chart-only bug fix bumps `version` without touching `appVersion`; a new application release can bump `appVersion` without necessarily requiring a `version` bump.
- Standard semantic versioning discipline (major/minor/patch) applies to `version`, scoped to whether a change breaks something for someone currently consuming the chart.

## Interview Follow-Up Questions

- How would you audit an existing set of charts to check whether `version` bumps have actually followed genuine semantic versioning discipline, rather than being incremented arbitrarily?
- What would you do if a chart consumer pinned a specific `version` range but needs the `appVersion` to update independently within that range?
- How would you use `Chart.AppVersion` within a template as a sensible default while still letting a user override the actual deployed image tag via values?

## References

- [Helm: The Chart.yaml File](https://helm.sh/docs/topics/charts/#the-chartyaml-file)
- [Semantic Versioning 2.0.0](https://semver.org/)
