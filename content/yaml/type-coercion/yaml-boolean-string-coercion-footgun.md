---
id: yaml-type-coercion-boolean-string-footgun-001
title: "A CI config field intended as the string \"no\" silently breaks everything downstream. Why does this happen with YAML specifically, and how do you avoid this whole class of bug?"
category: yaml
subcategory: type-coercion
technologies:
  - yaml
difficulty: intermediate
question_type:
  - troubleshooting
  - conceptual
tags:
  - yaml
  - type-coercion
  - ci-cd
  - troubleshooting
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A YAML config file has a field like `country: NO` (Norway's country code) or `enabled: no` (intended as a literal string), but somewhere downstream it's being treated as a boolean instead of the string that was written. Why does this happen with YAML specifically, and how would you avoid this entire class of bug going forward?

## Short Answer

YAML 1.1 (which most real-world parsers, including PyYAML's default loader, implement) treats a long list of bare, unquoted scalars — `yes`, `no`, `true`, `false`, `on`, `off`, `y`, `n`, and their case variants — as booleans automatically, even when the author meant a plain string; this is often nicknamed the "Norway problem" because the unquoted country code `NO` silently becomes the boolean `false`. The fix is always quoting any scalar value that could be ambiguous — `"no"`, `"NO"`, `"yes"` — so the parser treats it as a string, and being deliberate about which YAML parsing mode/spec version a given tool actually implements.

## Detailed Explanation

YAML's scalar type inference is the root cause: an unquoted value like `no` isn't syntactically distinguished from the string `no` at all — the parser has to guess the intended type from the literal text, and the YAML 1.1 spec's guess for that particular token is "boolean false." The same applies to `yes`/`true`/`on` (all → `true`) and `no`/`false`/`off`/`n`/`N` (all → `false`), plus numeric-looking values like `1.0` becoming a float instead of a string, and octal-looking values like `010` being parsed as octal 8 in some parsers.

This becomes a real, production-relevant bug specifically in configs where a string field happens to collide with one of these reserved-looking tokens — a country code field with value `NO` for Norway, a feature flag config where someone writes `enabled: no` meaning "the literal word no" in a context expecting a string enum rather than a boolean, or a version string that looks numeric. The parser doesn't know the *schema* intent (string vs boolean) — it only sees a bare token and applies YAML's own inference rules, which don't know or care what the surrounding application expects.

Notably, YAML 1.2 (a later spec revision) narrowed this considerably — only `true`/`false` (not `yes`/`no`/`on`/`off`) are treated as booleans — specifically because the 1.1 behavior was recognized as a common real-world footgun. But many widely-used parsers (including PyYAML's default `yaml.load`/`safe_load`, and by extension many CI tools built on it) still implement YAML 1.1 semantics by default, so the footgun remains very much alive in practice regardless of what the spec says is "better" now.

## Symptoms

- A config value that was clearly written as a string in the YAML source is read back as a Python `bool` (or the parser's equivalent) instead of a `str`.
- Values like `no`, `yes`, `on`, `off`, `NO`, `Norway`-adjacent country codes, or version-looking strings behave unexpectedly downstream.
- The bug is often silent — no parse error, just wrong runtime behavior, since the YAML is syntactically valid the whole time.

## Possible Causes

- The value was written unquoted, letting the parser's default type-inference rules apply.
- The parser or library in use implements YAML 1.1 semantics (broad boolean coercion) rather than YAML 1.2 (narrower).
- A schema or validation layer that would have caught the type mismatch (expected string, got bool) wasn't in place, letting the wrong type flow silently into application logic.

## Investigation Steps

1. Print the actual parsed Python/language-native type of the suspect field, not just its printed value, to confirm it's a `bool` rather than a `str`.
2. Check the exact YAML source for whether the value is quoted or bare.
3. Check which YAML library and loading function is in use, and which spec version it implements by default (e.g. PyYAML's `safe_load` is YAML 1.1-ish; `ruamel.yaml` can be configured for YAML 1.2 behavior).
4. Search the file for other unquoted values that match the same reserved-word list, since this bug rarely occurs in isolation once one instance is found.

## Commands

```python
import yaml
data = yaml.safe_load("enabled: no\ncountry: NO\n")
print(data, {k: type(v) for k, v in data.items()})
# {'enabled': False, 'country': False} {'enabled': <class 'bool'>, 'country': <class 'bool'>}
```

```bash
grep -inE ':\s*(yes|no|on|off|true|false|y|n)\s*$' config.yaml
```

## Resolution

Quote every scalar value where the literal text could collide with YAML's reserved boolean/null tokens — `"no"`, `"NO"`, `"yes"`, `"on"`, `"off"` — so the parser treats it unambiguously as a string. For config schemas under your control, add a validation layer (JSON Schema, Pydantic, or equivalent) that enforces the expected type for each field, so a wrongly-coerced boolean fails loudly at load time instead of propagating silently into application logic. For high-risk configs, consider switching to a parser explicitly configured for YAML 1.2 semantics if the ecosystem supports it, though quoting ambiguous values remains the more portable fix since not every tool in a pipeline shares the same parser.

## Prevention

- Quote any YAML scalar that could plausibly match a reserved word, as a standing convention, not just after being bitten once.
- Add schema validation on top of YAML parsing for any config that flows into critical logic, so type mismatches are caught at load time.
- Be explicit about which parser/spec version a tool uses when evaluating new YAML-based tooling, since this varies across the ecosystem.
- Lint YAML files for common footgun patterns (unquoted `yes`/`no`/`on`/`off`, ambiguous version-looking numbers) as part of CI.

## Interview Follow-Up Questions

- Why does JSON not have this problem, and what does that imply about the trade-off YAML makes for human-friendliness?
- How would `ruamel.yaml` configured for YAML 1.2 handle the same `enabled: no` example differently from PyYAML's default loader?
- What other YAML footguns exist beyond boolean coercion (e.g. anchors/aliases, multi-document files, tab characters) that are worth knowing for an interview?

## Key Takeaways

- YAML 1.1's broad boolean coercion turns unquoted `yes`/`no`/`on`/`off` (and case variants) into booleans, even when a string was intended — the "Norway problem."
- Many widely-used parsers (PyYAML's defaults included) still implement YAML 1.1 semantics, so this remains a live issue regardless of the newer YAML 1.2 spec.
- The reliable fix is quoting any ambiguous scalar value, backed by schema validation to catch mismatches at load time.
- The bug is silent by nature — no parse error, just a wrong runtime type — which is what makes it worth knowing about proactively rather than discovering it in production.

## References

- [YAML 1.1 Specification: Booleans](https://yaml.org/type/bool.html)
- [YAML 1.2 Specification (Core Schema)](https://yaml.org/spec/1.2.2/#1032-tag-resolution)
- [The Norway Problem (noyaml.com)](https://noyaml.com/)
