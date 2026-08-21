---
id: yaml-type-coercion-why-json-avoids-this-001
title: "Why doesn't JSON have YAML's boolean-coercion footgun, and what does that imply about the trade-off YAML makes for human-friendliness?"
category: yaml
subcategory: type-coercion
technologies:
  - yaml
difficulty: beginner
question_type:
  - conceptual
  - comparison
tags:
  - yaml
  - json
  - fundamentals
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

JSON doesn't have YAML's "Norway problem" — an unquoted string colliding with a reserved boolean-like token. Why not, and what does that difference reveal about the trade-off YAML makes to be more human-friendly?

## Short Answer

JSON requires explicit quotes around every string, with no unquoted-string syntax at all — `"no"` is unambiguously a string and `false` is unambiguously a boolean, because the syntax itself distinguishes them, not type inference. YAML allows unquoted scalars specifically to be less visually noisy and more human-friendly to write and read, but that convenience is exactly what creates the ambiguity: an unquoted token has to be *inferred* as a string or boolean (or number, or null) based on its literal text, and that inference is where the footgun lives.

## Detailed Explanation

JSON's grammar draws a hard syntactic line: a string is always delimited by double quotes, a boolean is always the bare literal `true` or `false`, and there's no unquoted-bareword syntax that could be either. This means `"no"` and `false` are never ambiguous in JSON — the quotes (or their absence) tell the parser definitively what type is intended, with no inference step required at all. This is a deliberate design simplicity trade-off JSON makes: less forgiving to write by hand (every string needs its quotes, every object key needs its quotes too), but completely unambiguous to parse.

YAML deliberately relaxes this specifically to be friendlier for humans writing config by hand — unquoted scalars (`enabled: no`, `name: Norway`) are visually cleaner and faster to type than JSON's mandatory quoting, which is a genuine, real usability win for the common case of hand-written YAML config files. But that relaxation necessarily requires the parser to *infer* what type an unquoted token represents, since the syntax alone (unlike JSON's quotes) doesn't tell it — and that inference is exactly where the ambiguity between "the string no" and "the boolean false" comes from. YAML's inference rules (per the YAML 1.1 spec) chose to treat several natural-language-like tokens (`yes`/`no`/`on`/`off`, alongside `true`/`false`) as booleans, presumably reasoning that config authors would often want that convenience — but that same choice is precisely what causes the footgun when the intended meaning was actually a plain string that happens to match one of those tokens.

**The broader implication**: this is a specific, illustrative instance of a general trade-off between human-friendliness (less required syntax, more inference) and unambiguity (more required syntax, less inference) — a trade-off that shows up in many contexts beyond just YAML versus JSON. YAML's greater human-friendliness for hand-authored config comes at the real cost of a class of type-inference ambiguity that a stricter, more verbose format like JSON structurally avoids by requiring explicit syntax for every type distinction, with no inference involved at all.

## Key Takeaways

- JSON requires explicit quotes for strings and unambiguous bare literals for booleans — no unquoted-scalar syntax means no type-inference step, and no room for the ambiguity YAML has.
- YAML's unquoted scalars are a deliberate human-friendliness trade-off, making hand-written config less visually noisy at the cost of requiring type inference on unquoted tokens.
- The "Norway problem" is a direct, visible consequence of that trade-off — YAML's inference rules treating `no`/`yes`/`on`/`off` as booleans is exactly what creates the ambiguity for legitimate strings that happen to match those tokens.
- This illustrates a general trade-off between less-syntax/more-inference (human-friendly, more ambiguous) and more-syntax/less-inference (verbose, unambiguous) that recurs in many contexts beyond just YAML vs JSON.

## Interview Follow-Up Questions

- Since YAML is technically a superset of JSON, how does that relationship interact with this discussion of unquoted scalars?
- What other markup/config languages make a similar human-friendliness-versus-unambiguity trade-off, and how do they handle it differently?
- Would you recommend a team standardize on always-quoted strings in YAML as a blanket policy — what would that trade off?

## References

- [YAML 1.1 Specification: Booleans](https://yaml.org/type/bool.html)
- [JSON: Introducing JSON](https://www.json.org/json-en.html)
