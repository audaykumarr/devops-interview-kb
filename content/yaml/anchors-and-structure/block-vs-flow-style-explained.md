---
id: yaml-anchors-structure-block-vs-flow-style-001
title: "You see the same data expressed as both 'ports: [80, 443]' and a multi-line dashed list in different YAML files. Are these actually equivalent, and when would you use each?"
category: yaml
subcategory: anchors-and-structure
technologies:
  - yaml
difficulty: beginner
question_type:
  - comparison
tags:
  - yaml
  - syntax
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Some YAML files write a list as `ports: [80, 443]` on one line, while others write the same kind of data as a multi-line list with dashes. Are these actually equivalent to a parser, and when would you reach for one style over the other?

## Short Answer

Yes, they're genuinely equivalent — YAML supports two complete, interchangeable syntax styles: block style (the indentation-and-dash/colon style most YAML examples use) and flow style (JSON-like inline syntax with `[...]` for sequences and `{...}` for mappings), and both parse to the identical underlying data structure. Block style is generally preferred for readability in larger, hierarchical configuration files (which is most real-world YAML use in DevOps), while flow style is useful for genuinely short, simple values where a multi-line block would be unnecessarily verbose.

## Detailed Explanation

YAML deliberately supports both styles because they serve different readability goals — block style makes deep, nested structure visually clear through indentation, while flow style is more compact for simple, short values, and YAML lets you mix both within the same document as appropriate.

**Block style uses indentation and dashes/colons to express structure**:

```yaml
ports:
  - 80
  - 443
labels:
  app: my-service
  tier: backend
```

This is the style most commonly seen in Kubernetes manifests, CI configuration, and most real-world DevOps YAML, since it scales well to deeply nested structures where indentation clearly shows hierarchy.

**Flow style uses JSON-like inline syntax**:

```yaml
ports: [80, 443]
labels: {app: my-service, tier: backend}
```

This produces the exact same parsed data structure as the block-style equivalent above — a parser doesn't distinguish "how was this expressed in the source" once parsing is complete, only the resulting data matters to anything consuming it.

**Flow style is genuinely useful for short, simple values embedded in an otherwise block-style document**: a short list of ports, a small inline mapping — using flow style for these specific, compact values can reduce vertical sprawl compared to forcing every single value into multi-line block style, without sacrificing readability for something that's genuinely simple.

**Block style is generally preferred for anything with real depth or that benefits from being easy to visually scan line by line**: deeply nested configuration (a full Kubernetes Deployment spec, a complex CI pipeline definition) is much easier to read and diff in block style, where each key and nesting level is clearly visible on its own line, than as a dense, flow-style inline structure that would be hard to parse visually even though it's syntactically valid.

**Mixing both styles within one document is completely valid and common**: most real-world YAML files use block style as the overall structure, with flow style used selectively for specific short values — this isn't an inconsistency to avoid, it's using each style where it's actually more readable.

**This distinction matters for diffing and version control too**: block style, since each element is on its own line, tends to produce cleaner, more granular diffs when a single item in a list or mapping changes — a genuinely practical reason (beyond aesthetics) that block style is the convention for most DevOps configuration files under version control, where a small change ideally produces a small, easy-to-review diff.

## Key Takeaways

- Block style and flow style are two complete, interchangeable YAML syntaxes that parse to identical underlying data structures — the choice is purely about source-file readability, not semantics.
- Block style (indentation-based) is generally preferred for deep, hierarchical configuration, and produces cleaner version-control diffs since each element is on its own line.
- Flow style (JSON-like inline) is useful for short, simple values where forcing multi-line block style would add unnecessary vertical sprawl.
- Mixing both styles within one document (block style overall, flow style for specific short values) is valid and common, not an inconsistency to avoid.

## Interview Follow-Up Questions

- Why might a team enforce a linting rule preferring block style over flow style for certain kinds of values in their configuration files?
- How does flow style relate to the fact that valid JSON is (almost entirely) also valid YAML?
- Would you expect any performance difference between parsing block-style versus flow-style YAML for the same data?

## References

- [YAML Specification: Block vs Flow Styles](https://yaml.org/spec/1.2.2/#chapter-7-flow-style-productions)
