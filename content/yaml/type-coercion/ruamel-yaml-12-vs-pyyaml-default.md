---
id: yaml-type-coercion-ruamel-yaml-12-vs-pyyaml-001
title: "How would ruamel.yaml configured for YAML 1.2 handle the same enabled: no example differently from PyYAML's default loader?"
category: yaml
subcategory: type-coercion
technologies:
  - yaml
  - python
difficulty: intermediate
question_type:
  - comparison
  - practical
tags:
  - yaml
  - python
  - type-coercion
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

PyYAML's default loader parses `enabled: no` as the boolean `False`, per YAML 1.1 semantics. `ruamel.yaml` supports YAML 1.2, with its narrower boolean-coercion rules. How would the same input actually be handled differently between the two?

## Short Answer

Under YAML 1.2's Core Schema (which `ruamel.yaml` supports), only `true`/`false` (and their case variants) are recognized as booleans — `yes`/`no`/`on`/`off` are no longer special tokens at all, so `enabled: no` parses as the plain string `"no"`, exactly matching what most authors intuitively expect. PyYAML's default loader implements YAML 1.1's broader boolean set, where `no` is one of many tokens (`y`/`n`/`yes`/`no`/`true`/`false`/`on`/`off`, case-insensitive) that all coerce to a boolean — the same input, parsed by the two libraries under their respective default behaviors, produces genuinely different Python types (`str` versus `bool`) for the identical YAML source.

## Detailed Explanation

The difference traces directly to which YAML specification version each library's default parsing behavior follows. YAML 1.1's Core Schema (documented at yaml.org/type/bool.html) defines an intentionally broad set of boolean-like tokens — `y`, `Y`, `yes`, `Yes`, `YES`, `n`, `N`, `no`, `No`, `NO`, `true`, `True`, `TRUE`, `false`, `False`, `FALSE`, `on`, `On`, `ON`, `off`, `Off`, `OFF` — all resolving to a boolean. PyYAML's `yaml.safe_load()` (and `yaml.load()`) implements this 1.1 behavior by default, meaning `enabled: no` resolves `no` against that list, finds a match, and produces the Python boolean `False`.

YAML 1.2's Core Schema deliberately narrowed this list specifically in response to the real-world footgun this caused — under 1.2, only `true` and `false` (plus, depending on the exact schema variant, their case variants) are recognized boolean literals; `yes`/`no`/`on`/`off` are no longer special at all and are treated as plain, ordinary strings. `ruamel.yaml`, when configured for YAML 1.2 (its default in recent versions, via `yaml = ruamel.yaml.YAML(typ='safe')` or explicitly setting the version), parses that same `enabled: no` input and produces the Python string `"no"`, not a boolean — matching what most people intuitively expect when they write a bare `no` in a YAML file without realizing YAML 1.1's broader coercion rules exist at all.

**The practical consequence for a real codebase**: switching from PyYAML's default to `ruamel.yaml` configured for 1.2 is a genuine behavior change for any existing YAML files that happen to contain unquoted `yes`/`no`/`on`/`off` tokens intended as strings — files that were silently (and incorrectly, from the author's likely intent) parsed as booleans under PyYAML would newly parse as the intended strings under `ruamel.yaml`/1.2, which is usually the desired fix but is worth being deliberate about, since it's a behavior change for any code currently (perhaps unknowingly) depending on the old, broader coercion.

**This doesn't fully eliminate the footgun class**: YAML 1.2's Core Schema is narrower, but not every YAML consumer in a given toolchain necessarily uses a 1.2-compliant parser — a value quoted correctly for one tool's parser could still be misinterpreted by a different tool elsewhere in the same pipeline using a 1.1-based parser, which is why quoting ambiguous values explicitly remains the more portable fix regardless of which specific parser version is in play for any one component.

## Key Takeaways

- YAML 1.1's Core Schema treats a broad set of tokens (`yes`/`no`/`on`/`off`/`true`/`false` and case variants) as booleans; YAML 1.2's Core Schema narrows this to just `true`/`false`.
- PyYAML's default loader implements 1.1 semantics; `ruamel.yaml` configured for 1.2 implements the narrower, less surprising behavior.
- The same `enabled: no` input produces a Python `bool` (PyYAML default) versus a Python `str` (ruamel.yaml/1.2) — a genuine behavioral difference, not just a documentation nuance.
- Switching parsers is a real behavior change for existing files depending on the old coercion, and doesn't fully eliminate the footgun class across a whole toolchain with mixed parser versions — explicit quoting remains the most portable fix.

## Interview Follow-Up Questions

- How would you audit an existing large YAML-heavy codebase for values that would change behavior when switching from PyYAML's default to a YAML 1.2 parser?
- What would you do if part of your toolchain uses a 1.1-based parser and part uses a 1.2-based one, and you can't control both?
- How would you configure `ruamel.yaml` explicitly to confirm it's actually using YAML 1.2 semantics, rather than assuming the default?

## References

- [YAML 1.2 Specification (Core Schema)](https://yaml.org/spec/1.2.2/#1032-tag-resolution)
- [ruamel.yaml documentation](https://yaml.readthedocs.io/en/latest/)
- [YAML 1.1 Specification: Booleans](https://yaml.org/type/bool.html)
