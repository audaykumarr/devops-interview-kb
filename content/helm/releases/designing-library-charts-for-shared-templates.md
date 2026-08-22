---
id: helm-releases-designing-library-charts-shared-templates-001
title: "How would you share common templates (labels, resource boilerplate) across many microservice charts without copy-pasting them into every chart?"
category: helm
subcategory: releases
technologies:
  - helm
difficulty: advanced
question_type:
  - architecture
tags:
  - helm
  - library-charts
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

An organization has dozens of microservices, each with its own Helm chart, and most of those charts share nearly identical boilerplate — standard label sets, common Deployment/Service structure with small per-service differences. Copy-pasting this boilerplate into every chart means a fix or convention change has to be manually propagated to dozens of places. How would you share this templating logic across charts properly?

## Short Answer

Create a Helm library chart — a special chart type (`type: library` in `Chart.yaml`) that defines reusable named templates but produces no deployable resources of its own — and have every microservice's chart declare it as a dependency, then call its named templates (via `include`) wherever the shared boilerplate is needed. A change to the library chart, once its version is bumped and consuming charts update their dependency, propagates the fix everywhere without touching each individual chart's own templates.

## Detailed Explanation

The organizational problem — dozens of charts drifting apart because shared logic lives in copy-pasted form everywhere — has a direct Helm-native solution, since Helm's own dependency and templating mechanisms were designed to support exactly this kind of sharing, provided the shared logic is packaged as a dependency rather than duplicated inline.

## Requirements

- Common templating logic (labels, standard resource structure) must be defined once, not duplicated across every microservice chart.
- Each microservice chart must still be able to customize the specific values that differ per-service.
- Updating the shared logic should have a controlled, versioned propagation path — not require simultaneously editing every consuming chart.

## Architecture

**A library chart is declared with `type: library` in its `Chart.yaml`**: this marks it as a chart that Helm will never install directly — attempting `helm install` on a library chart on its own does nothing (produces no resources), since its entire purpose is to be depended upon by other charts, not deployed standalone.

**Named templates (`define`/`include`) are the actual sharing mechanism**: within the library chart's `templates/` directory, `{{- define "mylib.labels" -}}...{{- end -}}` defines a reusable template block; a consuming chart calls it via `{{ include "mylib.labels" . }}` within its own template files — this is standard Helm templating machinery, just organized so the `define` blocks live in a chart specifically meant to be a shared dependency rather than duplicated inline in every consuming chart.

**Consuming charts declare the library as a dependency in their own `Chart.yaml`**: `dependencies: [{ name: mylib, version: "1.x", repository: "..." }]` — after running `helm dependency update`, the library's templates become available to `include` from the consuming chart's own templates, following the standard Helm chart dependency mechanism (just applied to a chart whose sole purpose is providing templates, not resources).

**Versioning the library chart is what gives controlled propagation of changes**: a fix or convention change to the library chart bumps its own semantic version — consuming charts pin (or range-constrain) which library version they depend on, so upgrading to a new library version is a deliberate, per-consuming-chart decision (bumping the dependency version and running `helm dependency update`), rather than every consuming chart being automatically and simultaneously affected by every library change the moment it's published.

**Per-service customization still happens through each chart's own `values.yaml`**: the library's templates are typically written to accept values (the `.` context passed via `include`) so each consuming chart still controls its own specific values (service name, image, resource sizing) while the *structure* and *convention* (how labels are formatted, what the standard resource shape looks like) comes from the shared library — this separation is what avoids the library chart needing to somehow anticipate every service's specific configuration.

## Trade-offs

A library chart adds a real dependency-management layer to every consuming chart — version bumps need to be deliberately rolled out (not automatic), which is exactly the safety property that makes this approach controlled, but also means a critical fix to the library doesn't reach consuming charts until each one explicitly updates its dependency version, requiring a real rollout process of its own (similar in spirit to the "urgent fix needs to reach all consumers" problem for shared Terraform modules). For an organization with only a handful of charts, the overhead of maintaining a separate library chart may not be worth it compared to accepting some duplication; the investment pays off specifically at the scale where duplication across dozens of charts becomes the bigger cost.

## Key Takeaways

- A library chart (`type: library`) defines reusable named templates but produces no resources of its own — it exists purely to be depended upon.
- Named templates (`define`/`include`) are the actual sharing mechanism, just organized into a chart specifically meant as a shared dependency.
- Consuming charts declare the library as a versioned dependency, giving controlled, deliberate propagation of changes rather than automatic simultaneous impact.
- Per-service customization remains in each consuming chart's own values; the library provides shared structure and convention, not per-service specifics.

## Interview Follow-Up Questions

- How would you roll out an urgent fix to the library chart across dozens of consuming charts quickly, given version bumps are normally a deliberate per-chart process?
- How would you test a library chart's templates in isolation, given it can't be installed directly on its own?
- What's the trade-off between a library chart and simply generating boilerplate via an external tool (a chart scaffolding generator) at chart-creation time instead?

## References

- [Helm: Library Charts](https://helm.sh/docs/topics/library_charts/)
- [Helm: Named Templates](https://helm.sh/docs/chart_template_guide/named_templates/)
