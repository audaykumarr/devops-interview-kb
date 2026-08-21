---
id: yaml-type-coercion-other-common-footguns-001
title: "Beyond boolean coercion, what other YAML footguns — anchors/aliases, multi-document files, tab characters — are worth knowing for an interview?"
category: yaml
subcategory: type-coercion
technologies:
  - yaml
difficulty: intermediate
question_type:
  - conceptual
tags:
  - yaml
  - fundamentals
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

The boolean-coercion "Norway problem" is the most famous YAML footgun, but it's far from the only one. What other common YAML gotchas — anchors/aliases, multi-document files, tab characters — are worth knowing?

## Short Answer

Tabs are outright forbidden for indentation (a YAML parse error, not silent misbehavior — arguably the least dangerous of these since it fails loudly); anchors and aliases (`&anchor`/`*alias`) let one part of a document reference and reuse another, which is powerful but can silently propagate an unexpected shared reference if misunderstood, especially combined with merge keys (`<<`); and multi-document files (separated by `---`) can silently confuse a parser or tool expecting a single document if it only reads the first one, quietly ignoring the rest with no error at all.

## Detailed Explanation

**Tabs are forbidden for indentation**: unlike most languages where tabs-vs-spaces is a style preference, the YAML spec explicitly disallows tab characters for indentation — a file with tab-indented content raises a parse error rather than being silently misinterpreted. This is actually the safest of these footguns in one sense (it fails loudly, not silently), but it's still a common source of confusing "why won't this parse" moments, especially when an editor's auto-indent silently inserts a tab without the author noticing.

**Anchors and aliases can create unexpected shared references**: YAML's `&anchor-name` marks a node for reuse, and `*anchor-name` elsewhere in the document references that same node — genuinely useful for avoiding repetition in config files, but the aliased reference is the *same* underlying node, not a copy. If application code mutates a value obtained from an aliased reference (in a language/library where the parsed structure is mutable), that mutation can unexpectedly affect every other place referencing the same anchor, since they all point at the same underlying object — a subtle bug that has nothing to do with the YAML syntax itself being wrong, just an unexpected consequence of shared references not being obvious from reading the file.

**Merge keys (`<<`) compound the anchor/alias complexity**: `<<: *anchor` merges an anchored mapping's keys into the current mapping (commonly used for a "base config plus overrides" pattern) — powerful, but the merge semantics (which value wins on a key collision, how nested merges behave) aren't always intuitive at a glance, and debugging an unexpected final value can require mentally tracing through multiple layers of anchors and merges rather than just reading the final effective config directly.

**Multi-document files silently truncate under a single-document parser**: a YAML file can contain multiple documents separated by `---`, but a parser or tool that only reads a single document (calling the equivalent of `yaml.safe_load()` instead of `yaml.safe_load_all()` in Python, for instance) will silently return only the *first* document, with no error indicating the rest of the file was ignored — a genuinely dangerous footgun specifically because it fails silently rather than raising any kind of error, meaning a config file with multiple documents can have most of its content quietly ignored with no visible symptom until someone notices the "missing" configuration isn't taking effect.

**Numeric-looking strings and version numbers**: a value like `version: 1.10` can be parsed as a float (`1.1`, since trailing zeros in a float representation are dropped) rather than the intended string `"1.10"` — a real, recurring gotcha for version strings specifically, since `1.10` and `1.1` are very different versions but numerically identical as floats once the trailing zero is lost.

## Key Takeaways

- Tab characters for indentation are a hard parse error in YAML — annoying but at least fails loudly rather than silently misbehaving.
- Anchors/aliases create genuinely shared references, not copies — mutating an aliased value can unexpectedly affect every other reference to the same anchor.
- Merge keys (`<<`) compound anchor complexity with non-obvious collision-resolution semantics, making debugging an unexpected final value harder.
- Multi-document YAML files silently truncate to just the first document under a parser call expecting a single document — a dangerous, silent-failure footgun.
- Numeric-looking strings (like version numbers) can lose meaningful trailing zeros when parsed as floats instead of strings.

## Interview Follow-Up Questions

- How would you write a YAML linter check specifically to catch the multi-document-file truncation footgun before it causes a real incident?
- When would you actually want anchors/aliases' shared-reference behavior deliberately, rather than treating it purely as a risk to avoid?
- How would you quote a version string like `1.10` correctly to guarantee it's never parsed as a number?

## References

- [YAML Specification: Indentation Spaces](https://yaml.org/spec/1.2.2/#61-indentation-spaces)
- [YAML Specification: Anchors and Aliases](https://yaml.org/spec/1.2.2/#71-alias-nodes)
- [PyYAML documentation: yaml.safe_load_all](https://pyyaml.org/wiki/PyYAMLDocumentation)
