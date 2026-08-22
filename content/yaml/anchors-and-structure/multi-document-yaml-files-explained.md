---
id: yaml-anchors-structure-multi-document-files-001
title: "A single Kubernetes manifest file defines a Deployment and a Service, separated by '---'. How does a parser actually handle this, and what mistakes commonly happen with multi-document YAML?"
category: yaml
subcategory: anchors-and-structure
technologies:
  - yaml
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - yaml
  - multi-document
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A single Kubernetes manifest file defines both a Deployment and a Service, separated by a `---` line. How does a YAML parser actually treat this file — is it one document with two parts, or genuinely two separate documents — and what mistakes commonly happen when working with multi-document YAML programmatically?

## Short Answer

`---` is YAML's document separator, meaning the file genuinely contains multiple independent YAML documents concatenated into one stream, not one document with two sections — each document parses to its own completely separate data structure. This matters practically because `yaml.safe_load()` (and its single-document equivalents in other languages) only returns the *first* document and silently ignores the rest, which is a common, easy-to-miss bug when someone assumes a multi-document file will be fully captured by a single-document parse call.

## Detailed Explanation

YAML's specification explicitly supports a "stream" containing multiple documents, each starting with `---` (and optionally ending with `...`) — this is exactly the mechanism `kubectl apply -f file.yaml` relies on to apply multiple resources from one file, and it's a genuinely different thing from one document containing multiple top-level keys.

**`---` separates independent documents, each with its own root**: a file like:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
```

contains two entirely separate documents — the Deployment's data structure and the Service's data structure are not nested within one another or part of a shared root object; they're two independent, complete YAML documents that happen to be concatenated in the same file.

**Tools built for Kubernetes (and similar multi-resource formats) explicitly handle this multi-document stream**: `kubectl apply -f file.yaml` processes each document in the stream as its own separate resource to apply — this is precisely why a single file can define multiple Kubernetes objects, and the tooling is specifically built to iterate over the stream rather than assume a single document.

**A common, easy-to-miss bug: using a single-document parse function on a multi-document file**: `yaml.safe_load(f)` in Python (and equivalent single-document load functions in other languages) parses and returns only the *first* document in the stream, silently discarding the rest — no error is raised, since parsing the first document succeeds completely; the script just never sees the second (or third, or further) documents at all, which can look like a script "not seeing" a resource that's clearly present in the file when someone's debugging.

**The fix is using the multi-document-aware parsing function**: `yaml.safe_load_all(f)` (Python) returns a generator yielding each document in the stream individually, letting a script correctly process every document rather than silently only the first:

```python
import yaml

with open("manifest.yaml") as f:
    for document in yaml.safe_load_all(f):
        process(document)
```

**`...` optionally marks the explicit end of a document**, distinct from `---` which marks the start of the next one — in practice, most real-world multi-document YAML files rely on `---` alone as the separator between documents, with `...` used less commonly, but it's part of the same specification and worth recognizing if encountered.

## Key Takeaways

- `---` separates genuinely independent YAML documents within one file/stream, not sections within a single document — each parses to its own separate data structure.
- Kubernetes tooling (`kubectl apply -f`) is specifically built to process a multi-document stream, applying each document as its own resource.
- A single-document parse function (`yaml.safe_load()`) silently returns only the first document in a multi-document file, discarding the rest without an error — a common, easy-to-miss bug.
- Use the multi-document-aware parsing function (`yaml.safe_load_all()` in Python, or the equivalent in other languages) to correctly process every document in the stream.

## Interview Follow-Up Questions

- How would you programmatically split a multi-document YAML file back into separate individual files, one per document?
- What would you check first if a script processing a multi-document Kubernetes manifest appeared to be "missing" one of the resources?
- How does this relate to how Helm renders multiple Kubernetes resource templates into one output stream?

## References

- [YAML Specification: Document Markers](https://yaml.org/spec/1.2.2/#912-document-markers)
- [PyYAML documentation: safe_load_all](https://pyyaml.org/wiki/PyYAMLDocumentation)
