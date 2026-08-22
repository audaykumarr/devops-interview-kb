---
id: yaml-anchors-structure-anchors-aliases-001
title: "A Kubernetes manifest repeats the same resource limits block across 8 containers. A teammate suggests using YAML anchors to avoid the duplication. How do anchors actually work, and what's the catch?"
category: yaml
subcategory: anchors-and-structure
technologies:
  - yaml
difficulty: intermediate
question_type:
  - practical
  - conceptual
tags:
  - yaml
  - anchors
  - dry
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A Kubernetes manifest defines the same `resources:` limits block, copy-pasted identically across 8 different containers. A teammate suggests using YAML anchors to define it once and reference it everywhere. How do YAML anchors and aliases actually work mechanically, and what's the catch worth knowing before adopting this pattern broadly?

## Short Answer

An anchor (`&name`) marks a node so it can be referenced elsewhere via an alias (`*name`), and the alias is expanded to a genuine copy of the anchored content at parse time — this eliminates the copy-paste duplication in the source file while still producing the identical final structure any consumer of the parsed YAML would see. The catch: anchors/aliases only work within a single YAML document, are somewhat less readable to someone unfamiliar with the syntax, and some tools/parsers in a given pipeline may have inconsistent or limited support for them, which matters if the same file needs to pass through multiple different tools.

## Detailed Explanation

Anchors and aliases are YAML's own, spec-level mechanism for internal reuse within a document — distinct from a templating tool layered on top (like Helm's Go templating), since this is native YAML syntax any spec-compliant parser understands.

**An anchor (`&name`) marks a node, an alias (`*name`) references it**:

```yaml
resources: &default-resources
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi

containers:
  - name: app-1
    resources: *default-resources
  - name: app-2
    resources: *default-resources
```

At parse time, every `*default-resources` alias is expanded into an actual copy of the anchored `resources:` block — the parser produces the same final data structure as if you'd written out the full block 8 separate times, just without the source-file duplication.

**This is expansion, not a reference/pointer, in the resulting parsed data**: each alias produces an independent copy of the anchored value in the parsed output (in most parsers) — modifying one container's resulting resource values in memory after parsing doesn't affect another's, since they're genuinely separate copies by the time parsing completes, not shared references to the same object.

**Anchors/aliases only work within a single YAML document**: you can't anchor something in one file and alias it from a separate file — the reuse is scoped to one document (or, with multi-document YAML using `---` separators, sometimes just one document within that stream, depending on the specific implementation) — for cross-file reuse, you'd need a different mechanism entirely (a templating tool, or a build step that composes files together before the YAML parser ever sees them).

**Readability and tooling support are real, practical trade-offs**: anchors/aliases are less immediately readable to someone unfamiliar with the syntax (the actual value used for `app-1`'s resources isn't visible at that point in the file without tracing back to the anchor definition), and while most mainstream YAML parsers support the basic anchor/alias mechanism well, some specific tools or older parser versions have had inconsistent support — worth verifying for the specific pipeline of tools a given YAML file needs to pass through, rather than assuming universal support.

**Merge keys (`<<: *anchor`) are a related but distinct, deprecated mechanism**: merge keys let you merge an anchored mapping's keys into another mapping (with the ability to override specific keys) rather than just substituting the whole value wholesale — a genuinely useful pattern for partial overrides, but merge keys were never formally part of the core YAML 1.1/1.2 spec and support varies more inconsistently across parsers than plain anchors/aliases do, worth knowing as a separate risk if a team is relying on it.

## Key Takeaways

- Anchors (`&name`) mark a node for reuse; aliases (`*name`) reference it, expanding to a genuine copy of the anchored content at parse time.
- This eliminates source-file duplication while producing an identical parsed result to writing the content out repeatedly — a native YAML mechanism, not a separate templating layer.
- Anchors/aliases only work within a single document, are less readable to someone unfamiliar with the syntax, and tooling support (especially for merge keys specifically) can be inconsistent across the parser ecosystem.
- Merge keys (`<<: *anchor`) enable partial overrides but are a separate, non-standardized mechanism with more inconsistent parser support than plain anchors/aliases — worth verifying before relying on it broadly.

## Interview Follow-Up Questions

- How would you handle needing the same reusable block across multiple separate YAML files, given anchors are scoped to a single document?
- What's the trade-off between YAML anchors and a proper templating tool (like Helm) for reducing Kubernetes manifest duplication at scale?
- How would you verify a specific tool in your pipeline correctly supports anchors/aliases before relying on them in production configuration?

## References

- [YAML Specification: Anchors and Aliases](https://yaml.org/spec/1.2.2/#71-alias-nodes)
- [PyYAML documentation](https://pyyaml.org/wiki/PyYAMLDocumentation)
